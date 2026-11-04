import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { initializeApp as initializeAdminApp, getApps as getAdminApps, applicationDefault } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import {
  getFirestore, FieldValue, type Firestore, type DocumentReference,
  type CollectionReference, type Query,
} from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json';
import {
  calculatePlatformFee,
  validateUsername,
  generateUsernameSuggestions,
  canChangeUsername,
  normalizeUsername,
  validateTipAmount,
} from './src/lib/rules';
import { reconcileTipStatus } from './src/lib/ledger';
import { TipTransaction } from './src/types';
import { cleanFirestorePayload } from './src/lib/firestoreUtils';

dotenv.config();

// Firebase Admin verifies signed Firebase ID tokens using server-side credentials.
// Cloud Run should supply Application Default Credentials to this service.
if (!getAdminApps().length) {
  initializeAdminApp({ credential: applicationDefault() });
}

async function requireFirebaseUid(req: Request, res: Response): Promise<string | null> {
  const authorization = req.headers.authorization || '';
  const match = /^Bearer (\S+)$/.exec(authorization);
  if (!match) {
    res.status(401).json({ error: 'Firebase sign-in required' });
    return null;
  }
  try {
    const decoded = await getAdminAuth().verifyIdToken(match[1], true);
    return decoded.uid;
  } catch {
    res.status(401).json({ error: 'Invalid or expired Firebase authentication token' });
    return null;
  }
}


const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Default platform fee constants (1% + $0.05)
const DEFAULT_FEE_PERCENT = 1;
const DEFAULT_FIXED_CENTS = 5;

// Initialize Firebase client for server-side persistence
const db: Firestore = getFirestore(getAdminApps()[0], (firebaseConfig as any).firestoreDatabaseId);

// Compatibility wrappers keep existing business transactions intact while
// moving all privileged persistence to Firebase Admin (IAM, not client rules).
const doc = (database: Firestore, ...segments: string[]) => database.doc(segments.join('/'));
const collection = (database: Firestore, ...segments: string[]) => database.collection(segments.join('/'));
const getDoc = (reference: DocumentReference): Promise<any> => reference.get();
const getDocs = (reference: Query): Promise<any> => reference.get();
const setDoc = (reference: DocumentReference, data: any, options?: { merge?: boolean }) =>
  options ? reference.set(data, options) : reference.set(data);
const updateDoc = (reference: DocumentReference, data: any) => reference.update(data);
const increment = (amount: number) => FieldValue.increment(amount);
const where = (field: string, operator: FirebaseFirestore.WhereFilterOp, value: any) =>
  (reference: Query) => reference.where(field, operator, value);
const limit = (count: number) => (reference: Query) => reference.limit(count);
const query = (reference: Query, ...constraints: Array<(q: Query) => Query>) =>
  constraints.reduce((current, apply) => apply(current), reference);
const runTransaction = <T>(database: Firestore, handler: (transaction: any) => Promise<T>) =>
  database.runTransaction(handler);

// Initialize Stripe if secret key is present
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-03-31.basil' as any,
      appInfo: {
        name: 'TipZeMe',
        version: '1.0.0',
      },
    })
  : null;

// Raw body parser for Stripe webhook signature verification
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('[Stripe Webhook Error] Missing STRIPE_WEBHOOK_SECRET environment variable.');
      res.status(400).send('Webhook secret is not configured.');
      return;
    }

    if (!signature) {
      console.error('[Stripe Webhook Error] Missing stripe-signature header.');
      res.status(400).send('Missing stripe-signature header.');
      return;
    }

    if (!stripe) {
      console.error('[Stripe Webhook Error] Stripe is not initialized with STRIPE_SECRET_KEY.');
      res.status(500).send('Stripe client not initialized.');
      return;
    }

    let event: Stripe.Event;

    // Cryptographic signature verification
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } catch (err: any) {
      console.error('[Stripe Webhook Verification Failed]:', err.message);
      res.status(400).send(`Webhook Signature Verification Error: ${err.message}`);
      return;
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const tipId = session.metadata?.tipId || `tip_${session.id}`;

          console.log(`[Stripe Webhook] Processing checkout.session.completed for Tip ID: ${tipId}`);

          // Enforce payment_status === 'paid' check
          if (session.payment_status !== 'paid') {
            console.warn(`[Stripe Webhook] Session ${session.id} payment_status is "${session.payment_status}", not "paid". Skipping fulfillment.`);
            res.json({ received: true, status: session.payment_status });
            return;
          }

          const recipientId = session.metadata?.recipientId || '';
          const recipientUsername = session.metadata?.username || '';
          const amountCents = session.amount_total || 500;
          const supporterName = session.metadata?.supporterName || 'Anonymous';
          const message = session.metadata?.message || '';
          const goalId = session.metadata?.goalId || null;
          const platformFeeCents = session.metadata?.platformFeeCents
            ? Number(session.metadata.platformFeeCents)
            : calculatePlatformFee(
                amountCents,
                Number(process.env.PLATFORM_FEE_PERCENT ?? DEFAULT_FEE_PERCENT),
                Number(process.env.PLATFORM_FEE_FIXED_CENTS ?? DEFAULT_FIXED_CENTS)
              );

          // Retrieve actual Stripe balance transaction fee if available
          let stripeFeeCents = 0;
          const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;
          if (stripe && paymentIntentId) {
            try {
              const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
                expand: ['latest_charge.balance_transaction'],
              });
              const charge = pi.latest_charge as Stripe.Charge | undefined;
              const bt = charge?.balance_transaction as Stripe.BalanceTransaction | undefined;
              if (bt && typeof bt.fee === 'number') {
                stripeFeeCents = bt.fee;
              }
            } catch (piErr) {
              console.warn('[Stripe Webhook] Notice expanding balance_transaction:', piErr);
            }
          }
          const netAmountCents = Math.max(0, amountCents - platformFeeCents - stripeFeeCents);

          // Atomic Firestore Transaction for Idempotency and Race-Condition Safety
          await runTransaction(db, async (transaction) => {
            const tipRef = doc(db, 'tips', tipId);
            const tipSnap = await transaction.get(tipRef);

            if (tipSnap.exists && tipSnap.data().status === 'succeeded') {
              console.log(`[Stripe Webhook] Duplicate event detected for ${tipId} within transaction. Already settled.`);
              return;
            }

            const existingData = tipSnap.exists ? tipSnap.data() : {};
            const tipRecord = {
              id: tipId,
              recipientId,
              recipientUsername,
              amountCents,
              platformFeeCents,
              stripeFeeCents,
              netAmountCents,
              currency: session.currency || 'usd',
              supporterName,
              message,
              status: 'succeeded',
              stripeCheckoutSessionId: session.id,
              stripePaymentIntentId: paymentIntentId,
              goalId: goalId || null,
              createdAt: existingData.createdAt || Date.now(),
              completedAt: Date.now(),
            };

            transaction.set(tipRef, tipRecord, { merge: true });

            // Atomically update creator's active support goal if contributed towards one
            if (recipientId && goalId) {
              const userRef = doc(db, 'users', recipientId);
              const userSnap = await transaction.get(userRef);

              if (userSnap.exists) {
                const userData = userSnap.data();
                if (userData.activeGoal && userData.activeGoal.id === goalId) {
                  const currentAmount = Number(userData.activeGoal.currentAmountDollars) || 0;
                  const addedDollars = amountCents / 100;
                  transaction.update(userRef, {
                    'activeGoal.currentAmountDollars': currentAmount + addedDollars,
                  });
                  console.log(`[Stripe Webhook] Atomically updated goal ${goalId}: +$${addedDollars} (Total: $${currentAmount + addedDollars})`);
                }
              }
            }

            // -- Referral Activation & Commission Accrual Engine --
            if (recipientId) {
              const attrRef = doc(db, 'referralAttributions', recipientId);
              const attrSnap = await transaction.get(attrRef);

              if (attrSnap.exists) {
                const attrData = attrSnap.data();
                const now = Date.now();

                // Verify attribution is within 12-month window
                if (attrData.expiresAt > now) {
                  const affiliateUserId = attrData.affiliateUserId;
                  const affiliateProfileRef = doc(db, 'affiliateProfiles', affiliateUserId);
                  const affiliateSnap = await transaction.get(affiliateProfileRef);

                  if (affiliateSnap.exists) {
                    const affiliateData = affiliateSnap.data();
                    let currentTierRate = Number(affiliateData.commissionRate) || 0.20;

                    // If pending activation, activate now
                    if (attrData.status === 'pending') {
                      const activationRef = doc(db, 'referralActivations', recipientId);
                      const activationSnap = await transaction.get(activationRef);

                      if (!activationSnap.exists) {
                        const newCount = (Number(affiliateData.activatedReferralsCount) || 0) + 1;
                        let newTier = 'partner';
                        let newRate = 0.20;
                        if (newCount >= 50) {
                          newTier = 'elite';
                          newRate = 0.50;
                        } else if (newCount >= 10) {
                          newTier = 'pro';
                          newRate = 0.35;
                        }
                        currentTierRate = newRate;

                        transaction.set(activationRef, {
                          referredUserId: recipientId,
                          affiliateUserId,
                          referralAttributionId: recipientId,
                          firstTipId: tipId,
                          activatedAt: now,
                          eligibleContributionCents: platformFeeCents,
                        });

                        transaction.update(attrRef, {
                          status: 'activated',
                          activatedAt: now,
                        });

                        transaction.update(affiliateProfileRef, {
                          activatedReferralsCount: newCount,
                          tier: newTier,
                          commissionRate: newRate,
                          updatedAt: now,
                        });

                        console.log(`[Affiliate Activation] Creator ${recipientId} activated referral for partner ${affiliateUserId}. New count: ${newCount}, Tier: ${newTier}`);
                      }
                    }

                    // Accrue commission in immutable ledger (commissionLedger)
                    if (attrData.status === 'activated' || attrData.status === 'pending') {
                      const ledgerId = `comm_${tipId}`;
                      const ledgerRef = doc(db, 'commissionLedger', ledgerId);
                      const ledgerSnap = await transaction.get(ledgerRef);

                      if (!ledgerSnap.exists) {
                        const platformNetContributionCents = Math.max(0, platformFeeCents);
                        const commissionCents = Math.round(platformNetContributionCents * currentTierRate);
                        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

                        transaction.set(ledgerRef, {
                          ledgerId,
                          affiliateUserId,
                          referredUserId: recipientId,
                          sourceTipId: tipId,
                          platformFeeCents,
                          platformNetContributionCents,
                          tierRate: currentTierRate,
                          commissionCents,
                          state: 'pending',
                          availableAt: now + thirtyDaysMs,
                          createdAt: now,
                          updatedAt: now,
                        });

                        console.log(`[Affiliate Commission] Accrued ${commissionCents}¢ (Rate: ${currentTierRate * 100}%) for partner ${affiliateUserId} from tip ${tipId}`);
                      }
                    }
                  }
                }
              }
            }
          });

          console.log(`[Stripe Webhook] Successfully recorded tip ${tipId} as succeeded ($${(amountCents / 100).toFixed(2)})`);
          break;
        }

        case 'account.updated': {
          const account = event.data.object as Stripe.Account;
          console.log(`[Stripe Webhook] Connected account ${account.id} updated. Charges: ${account.charges_enabled}, Payouts: ${account.payouts_enabled}`);

          const userId = account.metadata?.userId;
          if (userId) {
            try {
              const userRef = doc(db, 'users', userId);
              await updateDoc(userRef, {
                stripeAccountId: account.id,
                chargesEnabled: Boolean(account.charges_enabled && account.payouts_enabled),
              });
              console.log(`[Stripe Webhook] Updated user ${userId} chargesEnabled = ${Boolean(account.charges_enabled && account.payouts_enabled)}`);
            } catch (userErr) {
              console.warn('[Stripe Webhook] Notice updating user account:', userErr);
            }
          }
          break;
        }

        case 'charge.refunded': {
          const charge = event.data.object as Stripe.Charge;
          const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
          console.log(`[Stripe Webhook] Charge refunded: ${charge.id}, Payment Intent: ${paymentIntentId}`);

          if (paymentIntentId) {
            try {
              // 1. Mark corresponding tips documents in Firestore as refunded
              const tipsQuery = query(collection(db, 'tips'), where('stripePaymentIntentId', '==', paymentIntentId));
              const tipsSnap = await getDocs(tipsQuery);

              for (const tipDoc of tipsSnap.docs) {
                await updateDoc(tipDoc.ref, {
                  status: 'refunded',
                  refundedAt: Date.now(),
                  updatedAt: Date.now(),
                });
                console.log(`[Stripe Webhook] Marked tip document ${tipDoc.id} as refunded.`);
              }

              // 2. Reverse commissions for the refunded tips, keyed by tip ID.
              for (const tipDoc of tipsSnap.docs) {
                const ledgerRef = doc(db, 'commissionLedger', `comm_${tipDoc.id}`);
                const ledgerSnap = await getDoc(ledgerRef);
                if (ledgerSnap.exists) {
                  await updateDoc(ledgerRef, {
                    state: 'reversed',
                    updatedAt: Date.now(),
                  });
                }
              }
            } catch (refErr) {
              console.error('[Stripe Webhook] Error reversing commission and updating tip on refund:', refErr);
            }
          }
          break;
        }

        case 'charge.dispute.created': {
          const dispute = event.data.object as Stripe.Dispute;
          const chargeId = typeof dispute.charge === 'string' ? dispute.charge : null;
          const piId = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : null;
          console.log(`[Stripe Webhook] Dispute created: ${dispute.id} for charge: ${chargeId}`);

          if (piId) {
            try {
              const tipsQuery = query(collection(db, 'tips'), where('stripePaymentIntentId', '==', piId));
              const tipsSnap = await getDocs(tipsQuery);

              for (const tipDoc of tipsSnap.docs) {
                const tipId = tipDoc.id;
                await updateDoc(tipDoc.ref, {
                  status: 'disputed',
                  disputeId: dispute.id,
                  disputeStatus: dispute.status,
                  disputedAt: Date.now(),
                  updatedAt: Date.now(),
                });
                console.log(`[Stripe Webhook] Marked tip document ${tipId} as disputed.`);

                const ledgerRef = doc(db, 'commissionLedger', `comm_${tipId}`);
                const ledgerSnap = await getDoc(ledgerRef);
                if (ledgerSnap.exists) {
                  await updateDoc(ledgerRef, {
                    state: 'reversed',
                    updatedAt: Date.now(),
                  });
                  console.log(`[Affiliate Commission Reversal] Reversed commission comm_${tipId} due to dispute created.`);
                }
              }
            } catch (dispErr) {
              console.error('[Stripe Webhook] Error reversing commission on dispute:', dispErr);
            }
          }
          break;
        }

        case 'charge.dispute.closed': {
          const dispute = event.data.object as Stripe.Dispute;
          const piId = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : null;
          console.log(`[Stripe Webhook] Dispute closed: ${dispute.id}, status: ${dispute.status}`);

          if (piId) {
            try {
              const tipsQuery = query(collection(db, 'tips'), where('stripePaymentIntentId', '==', piId));
              const tipsSnap = await getDocs(tipsQuery);
              const isWon = dispute.status === 'won';

              for (const tipDoc of tipsSnap.docs) {
                const tipId = tipDoc.id;
                await updateDoc(tipDoc.ref, {
                  status: isWon ? 'succeeded' : 'refunded',
                  disputeStatus: dispute.status,
                  updatedAt: Date.now(),
                });
                console.log(`[Stripe Webhook] Updated closed dispute for tip ${tipId}: status -> ${isWon ? 'succeeded' : 'refunded'}`);

                const ledgerRef = doc(db, 'commissionLedger', `comm_${tipId}`);
                const ledgerSnap = await getDoc(ledgerRef);
                if (ledgerSnap.exists) {
                  await updateDoc(ledgerRef, {
                    state: isWon ? 'pending' : 'reversed',
                    updatedAt: Date.now(),
                  });
                }
              }
            } catch (dispCloseErr) {
              console.error('[Stripe Webhook] Error processing closed dispute:', dispCloseErr);
            }
          }
          break;
        }

        case 'checkout.session.expired': {
          const session = event.data.object as Stripe.Checkout.Session;
          const tipId = session.metadata?.tipId || `tip_${session.id}`;
          console.log(`[Stripe Webhook] Checkout session expired for tip ${tipId}`);
          try {
            const tipRef = doc(db, 'tips', tipId);
            const tipSnap = await getDoc(tipRef);
            if (tipSnap.exists && tipSnap.data().status === 'pending') {
              await updateDoc(tipRef, {
                status: 'expired',
                completedAt: Date.now(),
                updatedAt: Date.now(),
              });
              console.log(`[Stripe Webhook] Marked abandoned/expired tip ${tipId} as expired.`);
            }
          } catch (expErr) {
            console.warn('[Stripe Webhook] Error updating expired checkout tip:', expErr);
          }
          break;
        }

        case 'payment_intent.payment_failed': {
          const pi = event.data.object as Stripe.PaymentIntent;
          console.log(`[Stripe Webhook] Payment failed for PaymentIntent ${pi.id}`);
          try {
            const tipsQuery = query(collection(db, 'tips'), where('stripePaymentIntentId', '==', pi.id));
            const tipsSnap = await getDocs(tipsQuery);
            for (const tipDoc of tipsSnap.docs) {
              if (tipDoc.data().status === 'pending') {
                await updateDoc(tipDoc.ref, {
                  status: 'failed',
                  completedAt: Date.now(),
                  updatedAt: Date.now(),
                });
                console.log(`[Stripe Webhook] Marked failed payment tip ${tipDoc.id} as failed.`);
              }
            }
          } catch (failErr) {
            console.warn('[Stripe Webhook] Error updating failed payment tip:', failErr);
          }
          break;
        }

        default:
          console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
          break;
      }

      res.json({ received: true });
    } catch (err: any) {
      console.error('[Stripe Webhook Processing Error]:', err);
      res.status(500).json({ error: 'Webhook processing failed', details: err.message });
    }
  }
);

// Ensure local uploads directory exists for persistent avatars and original photos
const uploadsDir = path.resolve(process.cwd(), 'uploads');
const avatarsDir = path.join(uploadsDir, 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir, { maxAge: '7d' }));

// Standard JSON middleware with generous limit for photo payloads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Require signed Firebase identity and ownership for private creator endpoints.
const privateRoutes = new Set([
  '/api/profile/save-avatar', '/api/profile/avatar', '/api/stripe/connect',
  '/api/stripe/account-status', '/api/stripe/dashboard-link', '/api/stripe/balance',
  '/api/stripe/payouts', '/api/affiliate/enroll', '/api/affiliate/profile',
  '/api/affiliate/attribution', '/api/stripe/verify-transaction',
]);
app.use(async (req: Request, res: Response, next) => {
  if (!privateRoutes.has(req.path)) return next();
  const uid = await requireFirebaseUid(req, res);
  if (!uid) return;
  const suppliedId = req.path === '/api/affiliate/attribution'
    ? req.body?.referredUserId
    : (req.method === 'GET' ? req.query.userId : req.body?.userId);
  if (suppliedId && suppliedId !== uid) {
    res.status(403).json({ error: 'Cannot access another creator account' });
    return;
  }
  res.locals.authUid = uid;
  if (req.method !== 'GET') {
    if (req.path === '/api/affiliate/attribution') req.body.referredUserId = uid;
    else req.body.userId = uid;
  }
  next();
});

// Save cropped avatar & preserve original high-resolution photo
app.post('/api/profile/save-avatar', async (req: Request, res: Response) => {
  try {
    const { userId, croppedDataUrl, originalDataUrl, cropState } = req.body;

    if (!userId || !croppedDataUrl) {
      res.status(400).json({ error: 'Missing userId or cropped photo data' });
      return;
    }

    // Helper to decode base64 data URL to buffer
    const saveBase64Image = (dataUrl: string, filepath: string) => {
      const matches = dataUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      if (matches && matches[2]) {
        fs.writeFileSync(filepath, Buffer.from(matches[2], 'base64'));
      }
    };

    const croppedFilename = `${userId}_cropped_${Date.now()}.jpg`;
    const croppedFilepath = path.join(avatarsDir, croppedFilename);
    saveBase64Image(croppedDataUrl, croppedFilepath);
    const photoURL = `/uploads/avatars/${croppedFilename}`;

    let originalPhotoURL = photoURL;
    if (originalDataUrl && typeof originalDataUrl === 'string' && originalDataUrl.startsWith('data:')) {
      const originalFilename = `${userId}_original_${Date.now()}.jpg`;
      const originalFilepath = path.join(avatarsDir, originalFilename);
      saveBase64Image(originalDataUrl, originalFilepath);
      originalPhotoURL = `/uploads/avatars/${originalFilename}`;
    }

    // Update user record in Firestore
    const userRef = doc(db, 'users', userId);
    const updatePayload = cleanFirestorePayload({
      photoURL,
      avatarUrl: photoURL,
      originalPhotoURL,
      avatarCropState: cropState || null,
      updatedAt: Date.now(),
    });

    await updateDoc(userRef, updatePayload);

    res.json({
      success: true,
      photoURL,
      originalPhotoURL,
      avatarCropState: cropState || null,
    });
  } catch (err: any) {
    console.error('Failed to save avatar photo:', err);
    res.status(500).json({ error: 'Couldn’t save your photo. Please try again.' });
  }
});

// Remove profile photo endpoint
app.delete('/api/profile/avatar', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'Missing userId' });
      return;
    }

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      photoURL: null,
      avatarUrl: null,
      originalPhotoURL: null,
      avatarCropState: null,
      updatedAt: Date.now(),
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to remove avatar photo:', err);
    res.status(500).json({ error: 'Couldn’t remove photo. Please try again.' });
  }
});

// Check Stripe configuration status
app.get('/api/config/stripe', (_req: Request, res: Response) => {
  const secretKey = process.env.STRIPE_SECRET_KEY || '';
  const isLive = secretKey.startsWith('sk_live_') || secretKey.startsWith('rk_live_');
  const configured = Boolean(
    stripe &&
      (secretKey.startsWith('sk_live_') ||
        secretKey.startsWith('rk_live_') ||
        secretKey.startsWith('sk_test_') ||
        secretKey.startsWith('rk_test_'))
  );
  const feePercent = Number(process.env.PLATFORM_FEE_PERCENT ?? DEFAULT_FEE_PERCENT);
  const fixedCents = Number(process.env.PLATFORM_FEE_FIXED_CENTS ?? DEFAULT_FIXED_CENTS);

  res.json({
    configured,
    publishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || '',
    platformFeePercent: feePercent,
    platformFeeFixedCents: fixedCents,
    isTestMode: !isLive,
    isLiveMode: isLive,
  });
});

// Check App / Public URL configuration status
app.get('/api/config/app', (req: Request, res: Response) => {
  const publicAppUrl = process.env.PUBLIC_APP_URL || process.env.APP_URL || '';
  const requestOrigin = req.headers.origin || `http://localhost:${PORT}`;
  
  res.json({
    publicAppUrl: publicAppUrl || null,
    isPublicAppUrlConfigured: Boolean(publicAppUrl),
    requestOrigin,
    effectiveCanonicalUrl: publicAppUrl || requestOrigin,
    configurationNotice: publicAppUrl
      ? 'PUBLIC_APP_URL is configured.'
      : 'PUBLIC_APP_URL is not explicitly set. To configure a dedicated custom domain or production URL, set the PUBLIC_APP_URL or APP_URL environment variable in your deployment configuration.',
  });
});


// Real-time debounced username availability check
app.get('/api/username/check', async (req: Request, res: Response) => {
  try {
    const rawUsername = String(req.query.username || '');
    const currentUserId = String(req.query.userId || '');
    const normalized = normalizeUsername(rawUsername);

    const validation = validateUsername(normalized);
    if (!validation.valid) {
      res.json({
        available: false,
        error: validation.error,
        normalized,
        suggestions: generateUsernameSuggestions(normalized),
      });
      return;
    }

    const usernameDoc = await getDoc(doc(db, 'usernames', normalized));
    if (usernameDoc.exists) {
      const data = usernameDoc.data();
      // If current user already owns this handle
      if (currentUserId && data.uid === currentUserId) {
        res.json({ available: true, isCurrent: true, normalized });
        return;
      }

      res.json({
        available: false,
        error: `"${normalized}" is already claimed by another user`,
        normalized,
        suggestions: generateUsernameSuggestions(normalized),
      });
      return;
    }

    res.json({ available: true, normalized });
  } catch (err: any) {
    console.error('Username check error:', err);
    res.status(500).json({ error: 'Failed to check username availability' });
  }
});

// Change username endpoint (with server-side token/session authentication, atomic runTransaction, and loop prevention)
app.post('/api/username/change', async (req: Request, res: Response) => {
  try {
    const { userId, newUsername } = req.body;

    if (!newUsername) {
      res.status(400).json({ error: 'New username is required' });
      return;
    }

    // Verify the signed Firebase ID token; never trust a client-supplied UID.
    const authenticatedUid = await requireFirebaseUid(req, res);
    if (!authenticatedUid) return;
    if (userId && userId !== authenticatedUid) {
      res.status(403).json({ error: 'Cannot change another user’s username' });
      return;
    }

    const userRef = doc(db, 'users', authenticatedUid);
    const normalizedNew = normalizeUsername(newUsername);

    // 2. Format and reserved validation
    const validation = validateUsername(normalizedNew);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const newDocRef = doc(db, 'usernames', normalizedNew);

    // 3. Execute atomic transaction (all reads before writes)
    let oldUsername = '';
    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) {
        throw new Error('User profile not found');
      }

      const userData = userSnap.data();
      oldUsername = normalizeUsername(userData.username || '');

      if (oldUsername === normalizedNew) {
        throw new Error('Username is already set to this handle');
      }

      // 30-day cooldown check
      const cooldownCheck = canChangeUsername(userData.lastUsernameChangeAt);
      if (!cooldownCheck.allowed) {
        throw new Error(`Username can only be changed once every 30 days. You can change it again in ${cooldownCheck.daysRemaining} days (on ${cooldownCheck.nextAllowedDate}).`);
      }

      // Check if new handle is taken by someone else
      const newDocSnap = await transaction.get(newDocRef);
      if (newDocSnap.exists) {
        const existingData = newDocSnap.data();
        if (existingData.uid !== authenticatedUid) {
          throw new Error(`"${normalizedNew}" is already taken`);
        }
      }

      // Prevent self-redirect or redirect loops
      if (normalizedNew === oldUsername) {
        throw new Error('Cannot redirect to current handle');
      }

      // -- ALL READS COMPLETED. NOW EXECUTE ATOMIC WRITES --

      // Reserve new handle
      transaction.set(newDocRef, {
        uid: authenticatedUid,
        username: normalizedNew,
        createdAt: Date.now(),
      });

      // Convert old handle to redirect alias
      if (oldUsername) {
        const oldDocRef = doc(db, 'usernames', oldUsername);
        transaction.set(
          oldDocRef,
          {
            uid: authenticatedUid,
            isRedirect: true,
            redirectTo: normalizedNew,
            updatedAt: Date.now(),
          },
          { merge: true }
        );
      }

      // Update user profile
      const previous = Array.isArray(userData.previousUsernames) ? userData.previousUsernames : [];
      if (oldUsername && !previous.includes(oldUsername)) {
        previous.push(oldUsername);
      }

      transaction.update(userRef, {
        username: normalizedNew,
        lastUsernameChangeAt: Date.now(),
        previousUsernames: previous,
        updatedAt: Date.now(),
      });
    });

    console.log(`[Username Change] User ${authenticatedUid} atomically changed @${oldUsername} -> @${normalizedNew}`);

    res.json({
      success: true,
      username: normalizedNew,
      oldUsername,
      message: `Your personal tipping URL is now tipzeme.com/${normalizedNew}. Your previous link will automatically redirect!`,
    });
  } catch (err: any) {
    console.error('Username change error:', err);
    const status = err.message.includes('Unauthorized') ? 401 : err.message.includes('already taken') ? 409 : err.message.includes('30 days') ? 429 : 400;
    res.status(status).json({ error: err.message || 'Failed to change username' });
  }
});

// Resolve creator by username (including redirect alias support)
app.get('/api/user/by-username/:username', async (req: Request, res: Response) => {
  try {
    const rawUsername = String(req.params.username || '');
    const normalized = normalizeUsername(rawUsername);

    let usernameSnap = await getDoc(doc(db, 'usernames', normalized));
    let uid: string | null = null;
    let redirectedFrom: string | null = null;

    if (usernameSnap.exists) {
      const usernameData = usernameSnap.data();
      uid = usernameData.uid;

      // Follow redirect alias if old username
      if (usernameData.isRedirect && usernameData.redirectTo) {
        redirectedFrom = normalized;
        const targetSnap = await getDoc(doc(db, 'usernames', usernameData.redirectTo));
        if (targetSnap.exists) {
          uid = targetSnap.data().uid;
        }
      }
    } else {
      // AUTO-HEAL: If username record is missing from index, search users collection
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', normalized), limit(1));
        const qSnap = await getDocs(q);

        if (!qSnap.empty) {
          const userDoc = qSnap.docs[0];
          uid = userDoc.id;
          const uData = userDoc.data();

          // Safely repair the missing username index atomically
          await setDoc(doc(db, 'usernames', normalized), {
            uid: userDoc.id,
            username: normalized,
            createdAt: uData.createdAt || Date.now(),
            autoHealed: true,
          });
          console.log(`[Auto-Heal] Successfully repaired missing username index: @${normalized} -> ${uid}`);
        }
      } catch (searchErr) {
        console.warn('[Auto-Heal] Index lookup query notice:', searchErr);
      }
    }

    if (!uid) {
      res.status(404).json({ error: 'Creator not found' });
      return;
    }

    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists) {
      res.status(404).json({ error: 'Creator profile not found' });
      return;
    }

    const userData = userSnap.data();
    // Return sanitized public creator profile
    res.json({
      uid: userData.uid,
      username: userData.username,
      displayName: userData.displayName,
      bio: userData.bio || '',
      supportMessage: userData.supportMessage || '',
      photoURL: userData.photoURL || userData.avatarUrl || null,
      accentColor: userData.accentColor || '#B8FF4F',
      socialLinks: userData.socialLinks || {},
      activeGoal: userData.activeGoal || null,
      showTotalTips: userData.showTotalTips ?? true,
      showSupporters: userData.showSupporters ?? true,
      chargesEnabled: Boolean(userData.chargesEnabled),
      redirectedFrom,
    });
  } catch (err: any) {
    console.error('Creator resolution error:', err);
    res.status(500).json({ error: 'Failed to resolve creator profile' });
  }
});

// Helper: Resolve canonical connected Stripe account for creator (reuse existing, prevent duplicates)
async function resolveCreatorConnectedAccount(
  userId: string,
  email?: string,
  username?: string,
  userData?: any
): Promise<{
  selectedAccountId: string;
  isNew: boolean;
  duplicateAccountIds: string[];
}> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const userRef = doc(db, 'users', userId);
  let canonicalAccountId = userData?.stripeAccountId || null;

  // 1. Check if existing stripeAccountId in Firestore is still valid on Stripe
  if (canonicalAccountId) {
    try {
      const existingAccount = await stripe.accounts.retrieve(canonicalAccountId);
      if (existingAccount && !(existingAccount as any).deleted) {
        console.log(`[Stripe Connect] Verified existing mapped account ${canonicalAccountId} for user ${userId}`);
        return {
          selectedAccountId: canonicalAccountId,
          isNew: false,
          duplicateAccountIds: userData?.duplicateStripeAccountIds || [],
        };
      }
    } catch (err: any) {
      console.warn(`[Stripe Connect] Saved account ${canonicalAccountId} could not be retrieved:`, err.message);
      canonicalAccountId = null;
    }
  }

  // 2. Scan Stripe for existing connected accounts associated with this user
  try {
    const accountList = await stripe.accounts.list({ limit: 100 });
    const targetEmail = (email || userData?.email || '').trim().toLowerCase();

    // Match accounts by metadata.userId or exact email
    const matchingAccounts = accountList.data.filter((acc) => {
      const matchesUserId = acc.metadata?.userId === userId;
      const matchesEmail = targetEmail && acc.email && acc.email.toLowerCase() === targetEmail;
      return matchesUserId || matchesEmail;
    });

    if (matchingAccounts.length > 0) {
      // Sort matching accounts: accounts with details submitted first, then newest first
      matchingAccounts.sort((a, b) => {
        if (a.details_submitted !== b.details_submitted) {
          return a.details_submitted ? -1 : 1;
        }
        return (b.created || 0) - (a.created || 0);
      });

      const selected = matchingAccounts[0];
      const allIds = matchingAccounts.map((a) => a.id);
      const duplicates = allIds.filter((id) => id !== selected.id);

      console.warn(
        `[Stripe Connect] Found ${matchingAccounts.length} existing Stripe accounts for user ${userId}. Reusing canonical account ${selected.id}. Preserved duplicates for review:`,
        duplicates
      );

      // Persist the canonical mapping and duplicate list in Firestore
      await updateDoc(userRef, {
        stripeAccountId: selected.id,
        duplicateStripeAccountIds: duplicates,
        updatedAt: Date.now(),
      });

      return {
        selectedAccountId: selected.id,
        isNew: false,
        duplicateAccountIds: duplicates,
      };
    }
  } catch (listErr: any) {
    console.warn('[Stripe Connect] Notice scanning existing accounts:', listErr.message);
  }

  // 3. If no existing account was found anywhere, create one using an idempotency key
  console.log(`[Stripe Connect] No existing accounts found for user ${userId}. Creating single Express account.`);
  const idempotencyKey = `create_express_account_${userId}`;
  const account = await stripe.accounts.create(
    {
      type: 'express',
      email: email || userData?.email || undefined,
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
      business_type: 'individual',
      metadata: { userId, username: username || userData?.username || '' },
    },
    { idempotencyKey }
  );

  // Persist stripeAccountId to creator profile
  await updateDoc(userRef, {
    stripeAccountId: account.id,
    duplicateStripeAccountIds: [],
    updatedAt: Date.now(),
  });

  return {
    selectedAccountId: account.id,
    isNew: true,
    duplicateAccountIds: [],
  };
}

// Stripe Connect Onboarding endpoint
app.post('/api/stripe/connect', async (req: Request, res: Response) => {
  try {
    const { userId, email, username } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required. Please sign in to connect payouts.', code: 'unauthenticated' });
      return;
    }

    if (!stripe) {
      res.status(500).json({
        error: 'Stripe credentials (STRIPE_SECRET_KEY) are not configured on the server.',
        code: 'missing_credentials',
      });
      return;
    }

    // Verify creator profile exists in database
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists) {
      res.status(404).json({ error: 'Creator profile not found. Please complete profile setup first.', code: 'user_not_found' });
      return;
    }

    const userData = userSnap.data();

    // Enforce 1 active connected-account mapping per creator; reuse existing account
    const { selectedAccountId, isNew, duplicateAccountIds } = await resolveCreatorConnectedAccount(
      userId,
      email,
      username,
      userData
    );

    // Never trust a caller-controlled Origin for Stripe return URLs.
    const origin = process.env.PUBLIC_APP_URL || process.env.APP_URL || `http://localhost:${PORT}`;

    // Create fresh account onboarding link using server-side Stripe SDK
    const accountLink = await stripe.accountLinks.create({
      account: selectedAccountId,
      refresh_url: `${origin}/#payouts?stripe=refresh`,
      return_url: `${origin}/#payouts?stripe=success`,
      type: 'account_onboarding',
      collect: 'currently_due',
    });

    // Validate account link URL
    if (!accountLink.url || typeof accountLink.url !== 'string' || !accountLink.url.startsWith('https://')) {
      console.error('[Stripe Connect] Generated Account Link did not contain a valid HTTPS URL:', accountLink);
      res.status(502).json({
        error: 'Stripe did not return a valid HTTPS onboarding URL.',
        code: 'invalid_onboarding_url',
      });
      return;
    }

    console.log(`[Stripe Connect] Successfully generated Account Link for account ${selectedAccountId} (isNew: ${isNew})`);

    res.json({
      url: accountLink.url,
      accountId: selectedAccountId,
      isNew,
      duplicateAccounts: duplicateAccountIds,
    });
  } catch (err: any) {
    console.error('Stripe connect error:', err);
    let errorCode = 'stripe_error';
    let statusCode = 500;
    let userMsg = err.message || 'Failed to initiate Stripe onboarding';

    if (userMsg.includes('platform profile') || userMsg.includes('dashboard.stripe.com/connect/accounts/overview')) {
      errorCode = 'platform_profile_incomplete';
      userMsg = 'Stripe Connect Platform Setup Required: Please complete your platform profile questionnaire at https://dashboard.stripe.com/connect/accounts/overview.';
    } else if (userMsg.includes('connected_account_write') || userMsg.includes('permissions') || userMsg.includes('permission')) {
      errorCode = 'restricted_key_permission_missing';
      statusCode = 403;
      userMsg = 'Stripe API Key Permission Missing: The active restricted API key lacks "Connected accounts: Write" permission. Update your API key permissions in the Stripe Dashboard.';
    } else if (err.type === 'StripeConnectionError') {
      errorCode = 'network_error';
      userMsg = 'Network error connecting to Stripe. Please check your connection and try again.';
    }

    res.status(statusCode).json({ error: userMsg, code: errorCode });
  }
});

// Check Creator's Connected Account Status
app.get('/api/stripe/account-status', async (req: Request, res: Response) => {
  try {
    const userId = String(res.locals.authUid || '');
    if (!userId) {
      res.status(400).json({ error: 'Missing userId query parameter' });
      return;
    }

    if (!stripe) {
      res.json({
        configured: false,
        hasAccount: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        message: 'Stripe secret key is not configured on the server.',
      });
      return;
    }

    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists) {
      res.status(404).json({ error: 'User profile not found' });
      return;
    }

    const userData = userDoc.data();
    let stripeAccountId = userData.stripeAccountId;

    // Auto-associate if account already exists on Stripe but was not mapped in user doc
    if (!stripeAccountId) {
      try {
        const resolved = await resolveCreatorConnectedAccount(
          userId,
          userData.email,
          userData.username,
          userData
        );
        stripeAccountId = resolved.selectedAccountId;
      } catch (err) {
        console.warn('Could not auto-resolve account in account-status:', err);
      }
    }

    if (!stripeAccountId) {
      res.json({
        configured: true,
        hasAccount: false,
        chargesEnabled: false,
        payoutsEnabled: false,
      });
      return;
    }

    // Retrieve live connected account details from Stripe
    const account = await stripe.accounts.retrieve(stripeAccountId);
    const isLiveActive = Boolean(account.charges_enabled && account.payouts_enabled);

    // Sync to Firestore if status changed
    if (userData.chargesEnabled !== isLiveActive) {
      try {
        await updateDoc(doc(db, 'users', userId), {
          chargesEnabled: isLiveActive,
        });
      } catch (err) {
        console.warn('Notice syncing chargesEnabled to Firestore:', err);
      }
    }

    res.json({
      configured: true,
      hasAccount: true,
      accountId: account.id,
      detailsSubmitted: Boolean(account.details_submitted),
      chargesEnabled: Boolean(account.charges_enabled),
      payoutsEnabled: Boolean(account.payouts_enabled),
      defaultCurrency: account.default_currency || 'usd',
      country: account.country || 'US',
      payoutSchedule: (account.settings as any)?.payouts?.schedule?.interval || 'daily',
      requirements: {
        currentlyDue: account.requirements?.currently_due || [],
        eventuallyDue: account.requirements?.eventually_due || [],
        pastDue: account.requirements?.past_due || [],
        disabledReason: account.requirements?.disabled_reason || null,
      },
      duplicateAccounts: userData.duplicateStripeAccountIds || [],
    });
  } catch (err: any) {
    console.error('Error fetching account status:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch account status' });
  }
});

// Create single-use Stripe Express Dashboard Login Link or resume onboarding
app.post('/api/stripe/dashboard-link', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'Missing userId' });
      return;
    }

    if (!stripe) {
      res.status(400).json({ error: 'Stripe is not configured' });
      return;
    }

    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userData = userDoc.data();
    let stripeAccountId = userData.stripeAccountId;

    if (!stripeAccountId) {
      res.status(400).json({ error: 'No connected Stripe account found for this user.' });
      return;
    }

    const account = await stripe.accounts.retrieve(stripeAccountId);

    // If onboarding is incomplete, stripe.accounts.createLoginLink fails.
    // Return a fresh account_onboarding link instead so user can finish smoothly.
    const origin = req.headers.origin || process.env.APP_URL || `http://localhost:${PORT}`;
    if (!account.details_submitted || !account.payouts_enabled) {
      console.log(`[Stripe Connect] Account ${stripeAccountId} onboarding not yet completed. Returning fresh onboarding link instead of login link.`);
      const onboardingLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${origin}/#payouts?stripe=refresh`,
        return_url: `${origin}/#payouts?stripe=success`,
        type: 'account_onboarding',
        collect: 'currently_due',
      });
      res.json({ url: onboardingLink.url, type: 'onboarding' });
      return;
    }

    // Generate Express dashboard login link for completed account
    const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);
    res.json({ url: loginLink.url, type: 'dashboard' });
  } catch (err: any) {
    console.error('Error creating Stripe dashboard link:', err);
    res.status(500).json({ error: err.message || 'Failed to create dashboard login link' });
  }
});

// Retrieve connected account balance from Stripe
app.get('/api/stripe/balance', async (req: Request, res: Response) => {
  try {
    const userId = String(res.locals.authUid || '');
    if (!userId) {
      res.status(400).json({ error: 'Missing userId parameter' });
      return;
    }

    if (!stripe) {
      res.json({
        available: [{ amount: 0, currency: 'usd' }],
        pending: [{ amount: 0, currency: 'usd' }],
        simulated: true,
      });
      return;
    }

    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const stripeAccountId = userDoc.data().stripeAccountId;
    if (!stripeAccountId) {
      res.json({
        available: [{ amount: 0, currency: 'usd' }],
        pending: [{ amount: 0, currency: 'usd' }],
        noAccount: true,
      });
      return;
    }

    const balance = await stripe.balance.retrieve({}, {
      stripeAccount: stripeAccountId,
    });

    res.json({
      available: balance.available,
      pending: balance.pending,
      instant_available: balance.instant_available || [],
    });
  } catch (err: any) {
    console.warn('Notice retrieving Stripe balance:', err.message);
    res.json({
      available: [{ amount: 0, currency: 'usd' }],
      pending: [{ amount: 0, currency: 'usd' }],
      error: err.message,
    });
  }
});

// Retrieve connected account payouts history from Stripe
app.get('/api/stripe/payouts', async (req: Request, res: Response) => {
  try {
    const userId = String(res.locals.authUid || '');
    if (!userId) {
      res.status(400).json({ error: 'Missing userId parameter' });
      return;
    }

    if (!stripe) {
      res.json({ payouts: [] });
      return;
    }

    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const stripeAccountId = userDoc.data().stripeAccountId;
    if (!stripeAccountId) {
      res.json({ payouts: [] });
      return;
    }

    const payoutsList = await stripe.payouts.list(
      { limit: 10 },
      { stripeAccount: stripeAccountId }
    );

    res.json({
      payouts: payoutsList.data.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        arrival_date: p.arrival_date,
        created: p.created,
        status: p.status,
        method: p.method,
        type: p.type,
      })),
    });
  } catch (err: any) {
    console.warn('Notice retrieving Stripe payouts list:', err.message);
    res.json({ payouts: [], error: err.message });
  }
});

// Authoritative transaction verification & reconciliation against Stripe API
app.post('/api/stripe/verify-transaction', async (req: Request, res: Response) => {
  try {
    const { tipId } = req.body;
    if (!tipId) {
      res.status(400).json({ error: 'Missing tipId parameter' });
      return;
    }

    const tipRef = doc(db, 'tips', tipId);
    const tipSnap = await getDoc(tipRef);
    if (!tipSnap.exists) {
      res.status(404).json({ error: 'Tip transaction not found in ledger' });
      return;
    }

    const tip = tipSnap.data() as TipTransaction;
    const requester = await requireFirebaseUid(req, res);
    if (!requester) return;
    if (tip.recipientId !== requester) {
      res.status(403).json({ error: 'Cannot verify another creator’s transactions' });
      return;
    }


    // Sandbox / Mock Mode
    if (!stripe) {
      res.json({
        success: true,
        verified: true,
        status: tip.status,
        tip,
        message: 'Sandbox mode: transaction confirmed from local verified ledger.',
      });
      return;
    }

    let paymentIntentStatus: string | null = null;
    let checkoutPaymentStatus: string | null = null;
    let amountRefunded = 0;
    let disputeData: { id: string; status: string } | null = null;
    let stripeFeeCents = tip.stripeFeeCents || 0;

    // 1. Inspect Stripe Payment Intent if present
    if (tip.stripePaymentIntentId) {
      try {
        const pi = await stripe.paymentIntents.retrieve(tip.stripePaymentIntentId, {
          expand: ['latest_charge.dispute', 'latest_charge.balance_transaction'],
        });
        paymentIntentStatus = pi.status;
        const charge = pi.latest_charge as Stripe.Charge | undefined;
        if (charge) {
          const chargeAny = charge as any;
          amountRefunded = charge.amount_refunded || 0;
          if (chargeAny.dispute) {
            const d = chargeAny.dispute as Stripe.Dispute;
            disputeData = { id: d.id, status: d.status };
          }
          const bt = charge.balance_transaction as Stripe.BalanceTransaction | undefined;
          if (bt && typeof bt.fee === 'number') {
            stripeFeeCents = bt.fee;
          }
        }
      } catch (piErr: any) {
        console.warn(`[Reconcile Notice] Could not retrieve PI ${tip.stripePaymentIntentId}:`, piErr.message);
      }
    }

    // 2. Inspect Stripe Checkout Session if present
    if (tip.stripeCheckoutSessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(tip.stripeCheckoutSessionId);
        checkoutPaymentStatus = session.payment_status;

        if (!paymentIntentStatus && typeof session.payment_intent === 'string') {
          const pi = await stripe.paymentIntents.retrieve(session.payment_intent, {
            expand: ['latest_charge.dispute', 'latest_charge.balance_transaction'],
          });
          paymentIntentStatus = pi.status;
          const charge = pi.latest_charge as Stripe.Charge | undefined;
          if (charge) {
            const chargeAny = charge as any;
            amountRefunded = charge.amount_refunded || 0;
            if (chargeAny.dispute) {
              const d = chargeAny.dispute as Stripe.Dispute;
              disputeData = { id: d.id, status: d.status };
            }
            const bt = charge.balance_transaction as Stripe.BalanceTransaction | undefined;
            if (bt && typeof bt.fee === 'number') {
              stripeFeeCents = bt.fee;
            }
          }
        }
      } catch (sessErr: any) {
        console.warn(`[Reconcile Notice] Could not retrieve Checkout Session ${tip.stripeCheckoutSessionId}:`, sessErr.message);
      }
    }

    // Reconcile status strictly based on authoritative Stripe state
    const reconciliation = reconcileTipStatus(tip.status, tip.amountCents, {
      paymentIntentStatus,
      checkoutPaymentStatus,
      amountRefunded,
      dispute: disputeData,
    });

    const netAmountCents = Math.max(0, tip.amountCents - (tip.platformFeeCents || 0) - stripeFeeCents);
    const updates: Partial<TipTransaction> & { updatedAt: number } = {
      status: reconciliation.status,
      stripeFeeCents,
      netAmountCents,
      updatedAt: Date.now(),
    };

    if (reconciliation.disputeStatus) {
      updates.disputeStatus = reconciliation.disputeStatus;
    }
    if (reconciliation.disputeId) {
      updates.disputeId = reconciliation.disputeId;
    }
    if (reconciliation.status === 'refunded' && !tip.refundedAt) {
      updates.refundedAt = Date.now();
    }
    if (reconciliation.status === 'succeeded' && !tip.completedAt) {
      updates.completedAt = Date.now();
    }

    if (reconciliation.isModified || stripeFeeCents !== (tip.stripeFeeCents || 0)) {
      await updateDoc(tipRef, updates as any);
      console.log(`[Reconcile] Reconciled Tip ${tipId}: ${tip.status} -> ${reconciliation.status} (${reconciliation.reason})`);
    }

    res.json({
      success: true,
      verified: true,
      status: reconciliation.status,
      reason: reconciliation.reason,
      tip: {
        ...tip,
        ...updates,
      },
    });
  } catch (err: any) {
    console.error('[Reconcile Error]:', err);
    res.status(500).json({ error: 'Failed to verify transaction with Stripe', details: err.message });
  }
});

// Checkout session creation endpoint
app.post('/api/checkout', async (req: Request, res: Response) => {
  try {
    const { username, recipientId, amountInDollars, supporterName, message, goalId } = req.body;

    // Never allow the caller to redirect a tip by supplying another creator's UID.
    const normalizedRecipient = normalizeUsername(String(username || ''));
    if (!recipientId || !normalizedRecipient) {
      res.status(400).json({ error: 'A valid recipient is required' });
      return;
    }
    const recipientSnap = await getDoc(doc(db, 'users', recipientId));
    if (!recipientSnap.exists || normalizeUsername(recipientSnap.data().username || '') !== normalizedRecipient) {
      res.status(400).json({ error: 'Recipient profile does not match the requested tip link' });
      return;
    }

    const amount = Number(amountInDollars);
    const validation = validateTipAmount(amount);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error || 'Tip amount must be between $1.00 and $500.00 USD.' });
      return;
    }

    const amountInCents = Math.round(amount * 100);
    const tipId = 'tip_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    // Read fee variables securely on backend
    const feePercent = Number(process.env.PLATFORM_FEE_PERCENT ?? DEFAULT_FEE_PERCENT);
    const fixedCents = Number(process.env.PLATFORM_FEE_FIXED_CENTS ?? DEFAULT_FIXED_CENTS);
    const platformFeeAmount = calculatePlatformFee(amountInCents, feePercent, fixedCents);

    // Look up creator's Stripe connected account ID
    let creatorStripeAccountId: string | null = null;
    if (recipientId) {
      try {
        const userDoc = await getDoc(doc(db, 'users', recipientId));
        if (userDoc.exists) {
          creatorStripeAccountId = userDoc.data().stripeAccountId || null;
        }
      } catch (err) {
        console.warn('Could not fetch creator Stripe account ID:', err);
      }
    }

    // Persist pending tip record in Firestore with platformFeeCents
    try {
      const tipRef = doc(db, 'tips', tipId);
      await setDoc(tipRef, {
        id: tipId,
        recipientId: recipientId || '',
        recipientUsername: username || '',
        amountCents: amountInCents,
        platformFeeCents: platformFeeAmount,
        currency: 'usd',
        supporterName: supporterName || 'Anonymous',
        message: message || '',
        status: 'pending',
        goalId: goalId || null,
        createdAt: Date.now(),
      });
    } catch (dbErr) {
      console.warn('Pending tip record notice:', dbErr);
    }

    if (!stripe) {
      res.status(503).json({
        error: 'Payments are temporarily unavailable. No tip has been charged.',
        code: 'stripe_unavailable',
      });
      return;
    }

    const origin = req.headers.origin || process.env.APP_URL || `http://localhost:${PORT}`;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product: 'prod_VXxrKHRLxMZtMI',
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: {
        tipId,
        recipientId,
        username,
        supporterName: supporterName || 'Anonymous',
        message: message || '',
        goalId: goalId || '',
        platformFeeCents: String(platformFeeAmount),
      },
      success_url: `${origin}/#success?creator=${encodeURIComponent(username)}&amount=${amount.toFixed(2)}&handle=${username}`,
      cancel_url: `${origin}/#jar:${username}?cancelled=true`,
    };

    // Apply platform fee via Stripe Connect Direct Charges exclusively
    let session: Stripe.Checkout.Session;
    if (creatorStripeAccountId) {
      try {
        const directParams: Stripe.Checkout.SessionCreateParams = {
          ...sessionParams,
          payment_intent_data: {
            application_fee_amount: platformFeeAmount,
            managed_payments: { enabled: false },
            metadata: sessionParams.metadata,
          } as any,
        };
        session = await stripe.checkout.sessions.create(directParams, {
          stripeAccount: creatorStripeAccountId,
        });
        console.log(`[Stripe Checkout] Created session as Direct Charge on connected account ${creatorStripeAccountId}`);
      } catch (directErr: any) {
        console.error('[Stripe Checkout] Direct charge creation failed:', directErr.message);
        res.status(400).json({
          error: `Stripe Direct Charge failed: ${directErr.message}. Please ensure your connected Stripe account has completed onboarding and charges enabled.`,
          code: 'direct_charge_failed',
        });
        return;
      }
    } else {
      res.status(400).json({ error: 'Creator payouts are not connected. Direct charges require an active connected Stripe account.', code: 'connected_account_required' });
      return;
    }

    res.json({ url: session.url, tipId, platformFeeCents: platformFeeAmount });
  } catch (err: any) {
    console.error('Checkout creation error:', err);
    const friendlyMsg = err.message && err.message.includes('payment_intent_data')
      ? 'Payment setup is updating to match your account mode. Please try again.'
      : (err.message || 'Failed to create checkout session. Please try again.');
    res.status(500).json({ error: friendlyMsg });
  }
});

// --- Growth Engine: Attribution & Analytics ---
const recentVisitsCache = new Map<string, number>();

// Clean up cache periodically (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of recentVisitsCache.entries()) {
    if (now - timestamp > 15 * 60 * 1000) {
      recentVisitsCache.delete(key);
    }
  }
}, 10 * 60 * 1000);

app.post('/api/growth/event', async (req: Request, res: Response) => {
  try {
    const { event, username, ref, source } = req.body;
    // Public traffic may only record visits. Signup, activation and first-tip
    // counts must be derived from trusted auth/payment events, not browser input.
    if (event !== 'profile_visit') {
      res.status(403).json({ error: 'This growth event requires a trusted server event' });
      return;
    }
    if (typeof username !== 'string' || username.length > 64) {
      res.status(400).json({ error: 'Invalid creator username' });
      return;
    }
    // Use the socket address rather than a spoofable X-Forwarded-For header.
    const ip = req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    // Deduplicate rapid repeat visits within 15 minutes
    const dedupeKey = `${ip}_${username || ''}_${event}_${source || ''}`;
    const lastVisit = recentVisitsCache.get(dedupeKey);
    if (lastVisit && now - lastVisit < 15 * 60 * 1000) {
      res.json({ recorded: false, deduplicated: true });
      return;
    }
    // Bound the in-memory dedupe map under high-volume anonymous traffic.
    if (recentVisitsCache.size > 10000) recentVisitsCache.clear();
    recentVisitsCache.set(dedupeKey, now);

    const summaryRef = doc(db, 'growth_analytics', 'summary');

    const updates: Record<string, any> = {
      updatedAt: now,
    };

    if (event === 'profile_visit') {
      updates.totalVisits = increment(1);
      if (source === 'qr') {
        updates.qrScans = increment(1);
      }
      if (ref) {
        updates.referredVisits = increment(1);
      }
    } else if (event === 'signup_referral') {
      updates.referredSignups = increment(1);
      updates.claimedLinks = increment(1);
    } else if (event === 'claimed_link') {
      updates.claimedLinks = increment(1);
    } else if (event === 'activated_user') {
      updates.activatedUsers = increment(1);
    } else if (event === 'first_tip') {
      updates.firstTips = increment(1);
    }

    await setDoc(summaryRef, updates, { merge: true });

    res.json({ recorded: true, event });
  } catch (err: any) {
    console.warn('[Growth Attribution Notice]:', err.message);
    res.json({ recorded: false, error: err.message });
  }
});

app.get('/api/growth/metrics', async (_req: Request, res: Response) => {
  try {
    const summarySnap = await getDoc(doc(db, 'growth_analytics', 'summary'));
    const summary = summarySnap.exists ? summarySnap.data() : {};

    const totalVisits = Number(summary.totalVisits || 0);
    const qrScans = Number(summary.qrScans || 0);
    const referredSignups = Number(summary.referredSignups || 0);
    const claimedLinks = Math.max(1, Number(summary.claimedLinks || 1));
    const activatedUsers = Number(summary.activatedUsers || 0);
    const firstTips = Number(summary.firstTips || 0);

    // K-factor: average viral referrals per creator
    const kFactor = (referredSignups / claimedLinks).toFixed(2);
    // First-tip conversion rate: percentage of creators who reached a first verified tip
    const firstTipRate = Math.min(100, Math.round((firstTips / claimedLinks) * 100));

    res.json({
      totalProfiles: claimedLinks,
      totalVisits,
      qrScans,
      referredSignups,
      activatedUsers,
      firstTips,
      firstTipConversionRate: firstTipRate,
      kFactor: Number(kFactor),
      attributionSummary: {
        qrScanShare: totalVisits > 0 ? Math.round((qrScans / totalVisits) * 100) : 0,
        referredSignupShare: claimedLinks > 0 ? Math.round((referredSignups / claimedLinks) * 100) : 0,
      },
    });
  } catch (err: any) {
    console.error('Failed to load growth metrics:', err);
    res.status(500).json({ error: 'Failed to load growth metrics' });
  }
});

// --- Master Affiliate Operating System Endpoints ---

// 1. Enroll as Partner
app.post('/api/affiliate/enroll', async (req: Request, res: Response) => {
  try {
    const { userId, customCode, termsVersion } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'Missing userId' });
      return;
    }

    const userSnap = await getDoc(doc(db, 'users', userId));
    if (!userSnap.exists) {
      res.status(404).json({ error: 'User profile not found' });
      return;
    }

    const userData = userSnap.data();
    const baseCode = (customCode || userData.username || userId).toLowerCase().replace(/[^a-z0-9_]/g, '');
    const partnerCode = baseCode || `partner_${userId.substring(0, 6)}`;

    const profileRef = doc(db, 'affiliateProfiles', userId);
    const existingProfile = await getDoc(profileRef);
    if (existingProfile.exists) {
      res.json({ success: true, profile: existingProfile.data() });
      return;
    }

    // Check code uniqueness
    const codeRef = doc(db, 'affiliateCodes', partnerCode);
    const codeSnap = await getDoc(codeRef);
    if (codeSnap.exists && codeSnap.data().userId !== userId) {
      res.status(400).json({ error: 'Partner code is already taken. Please choose another.' });
      return;
    }

    const now = Date.now();
    const profile = {
      userId,
      partnerCode,
      tier: 'partner',
      activatedReferralsCount: 0,
      commissionRate: 0.20,
      status: 'active',
      termsVersion: termsVersion || 'v1.0',
      termsAcceptedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await runTransaction(db, async (transaction) => {
      transaction.set(profileRef, profile);
      transaction.set(codeRef, { userId, createdAt: now });
    });

    console.log(`[Affiliate] User ${userId} successfully enrolled as partner with code @${partnerCode}`);
    res.json({ success: true, profile });
  } catch (err: any) {
    console.error('Affiliate enrollment error:', err);
    res.status(500).json({ error: err.message || 'Failed to enroll in Affiliate Program' });
  }
});

// 2. Get Partner Profile & Stats
app.get('/api/affiliate/profile', async (req: Request, res: Response) => {
  try {
    const userId = String(res.locals.authUid || '');
    if (!userId) {
      res.status(400).json({ error: 'Missing userId parameter' });
      return;
    }

    const profileSnap = await getDoc(doc(db, 'affiliateProfiles', userId));
    if (!profileSnap.exists) {
      res.json({ enrolled: false });
      return;
    }

    const profile = profileSnap.data();

    // Fetch ledger entries for earnings stats
    const ledgerQuery = query(collection(db, 'commissionLedger'), where('affiliateUserId', '==', userId));
    const ledgerSnap = await getDocs(ledgerQuery);
    
    let pendingCents = 0;
    let availableCents = 0;
    let paidCents = 0;
    const now = Date.now();

    const ledgerEntries: any[] = [];
    ledgerSnap.forEach((docSnap: FirebaseFirestore.QueryDocumentSnapshot) => {
      const entry = docSnap.data();
      ledgerEntries.push(entry);
      if (entry.state === 'pending') {
        // Automatically promote pending to available if hold period (30 days) passed
        if (entry.availableAt <= now) {
          entry.state = 'available';
        }
      }
      if (entry.state === 'pending') pendingCents += entry.commissionCents;
      if (entry.state === 'available') availableCents += entry.commissionCents;
      if (entry.state === 'paid') paidCents += entry.commissionCents;
    });

    // Fetch referred users
    const attributionsQuery = query(collection(db, 'referralAttributions'), where('affiliateUserId', '==', userId));
    const attributionsSnap = await getDocs(attributionsQuery);
    const referrals: any[] = [];
    attributionsSnap.forEach((d: FirebaseFirestore.QueryDocumentSnapshot) => referrals.push(d.data()));

    res.json({
      enrolled: true,
      profile,
      stats: {
        pendingCents,
        availableCents,
        paidCents,
        lifetimeCents: pendingCents + availableCents + paidCents,
      },
      referrals,
      ledger: ledgerEntries.sort((a, b) => b.createdAt - a.createdAt),
    });
  } catch (err: any) {
    console.error('Failed to load affiliate profile:', err);
    res.status(500).json({ error: 'Failed to load affiliate profile' });
  }
});

// 3. Register Referral Attribution
app.post('/api/affiliate/attribution', async (req: Request, res: Response) => {
  try {
    const { referredUserId, partnerCode } = req.body;
    if (!referredUserId || !partnerCode) {
      res.status(400).json({ error: 'Missing referredUserId or partnerCode' });
      return;
    }

    const cleanCode = partnerCode.toLowerCase().trim();
    const codeSnap = await getDoc(doc(db, 'affiliateCodes', cleanCode));
    if (!codeSnap.exists) {
      res.status(404).json({ error: 'Invalid partner code' });
      return;
    }

    const affiliateUserId = codeSnap.data().userId;
    if (affiliateUserId === referredUserId) {
      res.status(400).json({ error: 'Self-referrals are not permitted' });
      return;
    }

    // Check if attribution already exists for this user (First-win rule)
    const attrRef = doc(db, 'referralAttributions', referredUserId);
    const existingAttr = await getDoc(attrRef);
    if (existingAttr.exists) {
      res.json({ success: true, message: 'Attribution already recorded' });
      return;
    }

    const now = Date.now();
    const twelveMonthsMs = 365 * 24 * 60 * 60 * 1000;

    const attribution = {
      referredUserId,
      affiliateUserId,
      partnerCode: cleanCode,
      attributedAt: now,
      expiresAt: now + twelveMonthsMs,
      status: 'pending',
    };

    await setDoc(attrRef, attribution);
    console.log(`[Affiliate] Successfully attributed user ${referredUserId} to partner ${affiliateUserId} via @${cleanCode}`);

    res.json({ success: true, attribution });
  } catch (err: any) {
    console.error('Attribution error:', err);
    res.status(500).json({ error: 'Failed to record referral attribution' });
  }
});

// 4. Admin Dashboard Endpoint (View all partners & commission batches)
app.get('/api/admin/affiliates', async (req: Request, res: Response) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    const expectedKey = process.env.ADMIN_KEY;
    if (!expectedKey || typeof adminKey !== 'string' || adminKey !== expectedKey) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const profilesSnap = await getDocs(collection(db, 'affiliateProfiles'));
    const profiles: any[] = [];
    profilesSnap.forEach((d: FirebaseFirestore.QueryDocumentSnapshot) => profiles.push(d.data()));

    const ledgerSnap = await getDocs(collection(db, 'commissionLedger'));
    const ledger: any[] = [];
    ledgerSnap.forEach((d: FirebaseFirestore.QueryDocumentSnapshot) => ledger.push(d.data()));

    const batchesSnap = await getDocs(collection(db, 'payoutBatches'));
    const batches: any[] = [];
    batchesSnap.forEach((d: FirebaseFirestore.QueryDocumentSnapshot) => batches.push(d.data()));

    let totalLiabilityCents = 0;
    let availableObligationsCents = 0;
    let lifetimePaidCents = 0;

    ledger.forEach((entry) => {
      if (entry.state === 'pending') totalLiabilityCents += entry.commissionCents;
      if (entry.state === 'available') {
        totalLiabilityCents += entry.commissionCents;
        availableObligationsCents += entry.commissionCents;
      }
      if (entry.state === 'paid') lifetimePaidCents += entry.commissionCents;
    });

    res.json({
      profiles,
      ledger,
      batches,
      stats: {
        totalPartners: profiles.length,
        totalLiabilityCents,
        availableObligationsCents,
        lifetimePaidCents,
      },
      payoutsEnabled: process.env.AFFILIATE_PAYOUTS_ENABLED === 'true',
    });
  } catch (err: any) {
    console.error('Admin affiliate error:', err);
    res.status(500).json({ error: 'Failed to load admin affiliate data' });
  }
});

// 5. Admin Payout Batch Generation
app.post('/api/admin/affiliates/batch/generate', async (req: Request, res: Response) => {
  try {
    const { adminKey } = req.body;
    const expectedKey = process.env.ADMIN_KEY;
    if (!adminKey || adminKey !== expectedKey) {
      res.status(401).json({ error: 'Unauthorized: Invalid admin key' });
      return;
    }

    const ledgerSnap = await getDocs(collection(db, 'commissionLedger'));
    const byPartner: Record<string, { totalCents: number; ledgerIds: string[] }> = {};
    const now = Date.now();

    ledgerSnap.forEach((docSnap: FirebaseFirestore.QueryDocumentSnapshot) => {
      const entry = docSnap.data();
      if (entry.state === 'available' && entry.availableAt <= now) {
        if (!byPartner[entry.affiliateUserId]) {
          byPartner[entry.affiliateUserId] = { totalCents: 0, ledgerIds: [] };
        }
        byPartner[entry.affiliateUserId].totalCents += entry.commissionCents;
        byPartner[entry.affiliateUserId].ledgerIds.push(entry.ledgerId);
      }
    });

    const minThresholdCents = 1000; // $10.00
    const allocations: any[] = [];
    let batchTotalCents = 0;

    for (const [affiliateUserId, data] of Object.entries(byPartner)) {
      if (data.totalCents >= minThresholdCents) {
        allocations.push({
          affiliateUserId,
          amountCents: data.totalCents,
          currency: 'usd',
          ledgerIds: data.ledgerIds,
          status: 'pending_review',
        });
        batchTotalCents += data.totalCents;
      }
    }

    const batchId = `batch_${now}`;
    const batchRecord = {
      batchId,
      accountingPeriod: new Date().toISOString().substring(0, 7),
      currency: 'usd',
      createdAt: now,
      totalAmountCents: batchTotalCents,
      affiliateCount: allocations.length,
      status: 'pending_review',
      allocations,
      approvedByAdminId: null,
      approvedAt: null,
    };

    await setDoc(doc(db, 'payoutBatches', batchId), batchRecord);
    console.log(`[Admin Payout] Generated payout batch ${batchId}: $${(batchTotalCents / 100).toFixed(2)} across ${allocations.length} partners`);

    res.json({ success: true, batch: batchRecord });
  } catch (err: any) {
    console.error('Batch generation error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate payout batch' });
  }
});

// 6. Admin Payout Batch Approval (with conflict-of-interest prevention)
app.post('/api/admin/affiliates/batch/approve', async (req: Request, res: Response) => {
  try {
    const { batchId, adminKey } = req.body;
    const expectedKey = process.env.ADMIN_KEY;
    if (!adminKey || adminKey !== expectedKey) {
      res.status(401).json({ error: 'Unauthorized: Invalid admin key' });
      return;
    }

    const adminId = await requireFirebaseUid(req, res);
    if (!adminId) return;
    if (typeof batchId !== 'string' || !/^batch_[a-zA-Z0-9_-]+$/.test(batchId)) {
      res.status(400).json({ error: 'Invalid batch ID' });
      return;
    }

    const batchRef = doc(db, 'payoutBatches', batchId);
    const batchSnap = await getDoc(batchRef);
    if (!batchSnap.exists) {
      res.status(404).json({ error: 'Payout batch not found' });
      return;
    }

    const batchData = batchSnap.data();
    const isIncluded = batchData.allocations?.some((a: any) => a.affiliateUserId === adminId);
    if (isIncluded) {
      res.status(403).json({ error: 'Conflict of interest: Administrators cannot approve payout batches containing their own affiliate earnings.' });
      return;
    }

    const now = Date.now();
    await updateDoc(batchRef, {
      status: 'approved',
      approvedByAdminId: adminId || 'admin',
      approvedAt: now,
      updatedAt: now,
    });

    console.log(`[Admin Payout] Payout batch ${batchId} approved by ${adminId || 'admin'}`);
    res.json({ success: true, message: `Batch ${batchId} successfully approved.` });
  } catch (err: any) {
    console.error('Batch approval error:', err);
    res.status(500).json({ error: err.message || 'Failed to approve payout batch' });
  }
});

// Explicit route to serve social preview images with HTTP 200 and image/jpeg content type
app.get('/images/tipzeme-social-preview.jpg', (_req: Request, res: Response) => {
  const filePath = path.resolve(process.cwd(), 'public/images/tipzeme-social-preview.jpg');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.sendFile(filePath);
  } else {
    res.status(404).send('Image asset not found');
  }
});

app.get('/images/tipzeme-social-preview.webp', (_req: Request, res: Response) => {
  const filePath = path.resolve(process.cwd(), 'public/images/tipzeme-social-preview.webp');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.sendFile(filePath);
  } else {
    res.status(404).send('Image asset not found');
  }
});

// Serve static public folder images
app.use('/images', express.static(path.resolve(process.cwd(), 'public/images'), {
  maxAge: '1d',
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=86400');
  },
}));

// Serve robots.txt explicitly
app.get('/robots.txt', (_req: Request, res: Response) => {
  const robotsPath = path.resolve(process.cwd(), 'public/robots.txt');
  if (fs.existsSync(robotsPath)) {
    res.setHeader('Content-Type', 'text/plain');
    res.sendFile(robotsPath);
  } else {
    res.type('text/plain').send('User-agent: *\nAllow: /\nSitemap: https://tipzeme.ai.studio/sitemap.xml');
  }
});

// Serve sitemap.xml explicitly
app.get('/sitemap.xml', (_req: Request, res: Response) => {
  const sitemapPath = path.resolve(process.cwd(), 'public/sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    res.setHeader('Content-Type', 'application/xml');
    res.sendFile(sitemapPath);
  } else {
    res.status(404).send('Sitemap not found');
  }
});

// Dynamic social crawler detection for creator profile sharing
const KNOWN_SYSTEM_ROUTES = [
  'api', 'images', 'assets', 'signin', 'onboarding', 'dashboard', 'activity',
  'settings', 'legal', 'edit-profile', 'payouts', 'earnings', 'growth',
  'analytics', 'affiliate', 'partners', 'success', 'how-it-works', 'solutions', 'favicon.ico', 'robots.txt', 'sitemap.xml',
];

const SOCIAL_CRAWLER_REGEX = /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Pinterest|Slackbot|TelegramBot|WhatsApp|Discordbot/i;

// Affiliate Social Preview & Direct HTML route for /ref and /ref/:username
app.get(['/ref', '/ref/:username'], async (req: Request, res: Response, next) => {
  const username = req.params.username ? req.params.username.toLowerCase().trim() : '';
  const userAgent = req.headers['user-agent'] || '';

  if (SOCIAL_CRAWLER_REGEX.test(userAgent) || req.accepts('html')) {
    try {
      const indexHtmlPath = process.env.NODE_ENV === 'production'
        ? path.resolve(process.cwd(), 'dist/index.html')
        : path.resolve(process.cwd(), 'index.html');

      if (fs.existsSync(indexHtmlPath)) {
        let html = fs.readFileSync(indexHtmlPath, 'utf-8');
        const pageUrl = username
          ? `https://tipzeme.ai.studio/ref/${username}`
          : 'https://tipzeme.ai.studio/ref';
        const ogTitle = 'TipZeMe | Share Good Vibes. Earn Rewards.';
        const ogDescription = 'Share TipZeMe, help people receive tips, and earn commissions from eligible referrals.';
        const ogImage = 'https://tipzeme.ai.studio/images/tipzeme-affiliate-og.png';

        html = html
          .replace(/<title>.*?<\/title>/i, `<title>${ogTitle}</title>`)
          .replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${ogDescription.replace(/"/g, '&quot;')}" />`)
          .replace(/<link rel="canonical" href=".*?" \/>/i, `<link rel="canonical" href="${pageUrl}" />`)
          .replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${ogTitle}" />`)
          .replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${ogDescription.replace(/"/g, '&quot;')}" />`)
          .replace(/<meta property="og:url" content=".*?" \/>/i, `<meta property="og:url" content="${pageUrl}" />`)
          .replace(/<meta property="og:image" content=".*?" \/>/i, `<meta property="og:image" content="${ogImage}" />`)
          .replace(/<meta property="og:image:secure_url" content=".*?" \/>/i, `<meta property="og:image:secure_url" content="${ogImage}" />`)
          .replace(/<meta property="og:image:type" content=".*?" \/>/i, `<meta property="og:image:type" content="image/png" />`)
          .replace(/<meta property="og:image:width" content=".*?" \/>/i, `<meta property="og:image:width" content="1200" />`)
          .replace(/<meta property="og:image:height" content=".*?" \/>/i, `<meta property="og:image:height" content="630" />`)
          .replace(/<meta name="twitter:card" content=".*?" \/>/i, `<meta name="twitter:card" content="summary_large_image" />`)
          .replace(/<meta name="twitter:title" content=".*?" \/>/i, `<meta name="twitter:title" content="${ogTitle}" />`)
          .replace(/<meta name="twitter:description" content=".*?" \/>/i, `<meta name="twitter:description" content="${ogDescription.replace(/"/g, '&quot;')}" />`)
          .replace(/<meta name="twitter:image" content=".*?" \/>/i, `<meta name="twitter:image" content="${ogImage}" />`);

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
        return;
      }
    } catch (err) {
      console.warn(`[Affiliate OG Metadata Error] for /ref/${username}:`, err);
    }
  }

  next();
});


app.get('/:username', async (req: Request, res: Response, next) => {
  const username = req.params.username?.toLowerCase();
  const userAgent = req.headers['user-agent'] || '';

  // Only intercept for social crawlers requesting a non-system route
  if (!username || KNOWN_SYSTEM_ROUTES.includes(username) || !SOCIAL_CRAWLER_REGEX.test(userAgent)) {
    return next();
  }

  try {
    const creatorSnap = await getDoc(doc(db, 'creators', username));
    if (creatorSnap.exists) {
      const creator = creatorSnap.data();
      const displayName = creator.displayName || username;
      const bio = creator.bio || 'Create your personal tip link. Share it anywhere. Make every thank-you count.';
      const photoURL = creator.photoURL || creator.avatarUrl || 'https://tipzeme.ai.studio/images/tipzeme-social-preview.jpg';
      const pageUrl = `https://tipzeme.ai.studio/${username}`;

      const indexHtmlPath = process.env.NODE_ENV === 'production'
        ? path.resolve(process.cwd(), 'dist/index.html')
        : path.resolve(process.cwd(), 'index.html');

      let html = fs.readFileSync(indexHtmlPath, 'utf-8');

      // Replace metadata with creator specific details
      html = html
        .replace(/<title>.*?<\/title>/i, `<title>${displayName} (@${username}) | TipZeMe</title>`)
        .replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${displayName} (@${username}) | TipZeMe" />`)
        .replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${bio.replace(/"/g, '&quot;')}" />`)
        .replace(/<meta property="og:url" content=".*?" \/>/i, `<meta property="og:url" content="${pageUrl}" />`)
        .replace(/<meta property="og:image" content=".*?" \/>/i, `<meta property="og:image" content="${photoURL}" />`)
        .replace(/<meta name="twitter:title" content=".*?" \/>/i, `<meta name="twitter:title" content="${displayName} (@${username}) | TipZeMe" />`)
        .replace(/<meta name="twitter:description" content=".*?" \/>/i, `<meta name="twitter:description" content="${bio.replace(/"/g, '&quot;')}" />`)
        .replace(/<meta name="twitter:image" content=".*?" \/>/i, `<meta name="twitter:image" content="${photoURL}" />`);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
      return;
    }
  } catch (err) {
    console.warn(`[Crawler Metadata Fallback] Failed fetching profile for @${username}:`, err);
  }

  next();
});

// Mount Vite middleware for SPA serving in development
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';
  const httpServer = http.createServer(app);

  if (isDev) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static('dist'));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile('index.html', { root: 'dist' });
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`TipZeMe application running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

