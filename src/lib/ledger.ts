import { TipTransaction } from '../types';
import { calculatePlatformFee } from './rules';

export interface LedgerAggregates {
  // Authoritative completed metrics (succeeded tips ONLY)
  completedGrossCents: number;
  completedPlatformFeeCents: number;
  completedStripeFeeCents: number;
  completedNetCents: number;
  completedGrossDollars: number;
  completedNetDollars: number;
  completedFeesDollars: number;

  // Segregated non-completed funds
  pendingFundsCents: number;
  pendingFundsDollars: number;
  disputedFundsCents: number;
  disputedFundsDollars: number;
  refundedFundsCents: number;
  refundedFundsDollars: number;

  // Counts & breakdowns
  completedCount: number;
  pendingCount: number;
  disputedCount: number;
  refundedCount: number;
  failedCount: number;
  totalTipsCount: number;
  uniqueSupportersCount: number;
  averageTipDollars: number;

  // Slices
  completedTips: TipTransaction[];
  pendingTips: TipTransaction[];
  disputedTips: TipTransaction[];
  refundedTips: TipTransaction[];
  failedTips: TipTransaction[];
}

/**
 * Calculates verified ledger totals strictly separating completed revenue from
 * pending funds, refunded amounts, disputes, and expired/failed transactions.
 * Only tips with status === 'succeeded' contribute to completed gross and net earnings.
 */
export function calculateLedgerAggregates(
  tips: TipTransaction[],
  feePercent: number = 1,
  feeFixedCents: number = 5
): LedgerAggregates {
  const safeTips = Array.isArray(tips) ? tips : [];

  const completedTips: TipTransaction[] = [];
  const pendingTips: TipTransaction[] = [];
  const disputedTips: TipTransaction[] = [];
  const refundedTips: TipTransaction[] = [];
  const failedTips: TipTransaction[] = [];

  for (const tip of safeTips) {
    switch (tip.status) {
      case 'succeeded':
        completedTips.push(tip);
        break;
      case 'pending':
        pendingTips.push(tip);
        break;
      case 'disputed':
        disputedTips.push(tip);
        break;
      case 'refunded':
        refundedTips.push(tip);
        break;
      case 'failed':
      case 'expired':
      default:
        failedTips.push(tip);
        break;
    }
  }

  // Authoritative completed amounts
  let completedGrossCents = 0;
  let completedPlatformFeeCents = 0;
  let completedStripeFeeCents = 0;
  let completedNetCents = 0;

  for (const tip of completedTips) {
    const gross = tip.amountCents || 0;
    const platformFee = typeof tip.platformFeeCents === 'number'
      ? tip.platformFeeCents
      : calculatePlatformFee(gross, feePercent, feeFixedCents);
    const stripeFee = tip.stripeFeeCents || 0;
    const net = typeof tip.netAmountCents === 'number'
      ? tip.netAmountCents
      : Math.max(0, gross - platformFee - stripeFee);

    completedGrossCents += gross;
    completedPlatformFeeCents += platformFee;
    completedStripeFeeCents += stripeFee;
    completedNetCents += net;
  }

  // Segregated pending, disputed, and refunded funds
  const pendingFundsCents = pendingTips.reduce((acc, t) => acc + (t.amountCents || 0), 0);
  const disputedFundsCents = disputedTips.reduce((acc, t) => acc + (t.amountCents || 0), 0);
  const refundedFundsCents = refundedTips.reduce((acc, t) => acc + (t.amountCents || 0), 0);

  // Unique supporter count on verified completed tips
  const uniqueSupporters = new Set(
    completedTips
      .map((t) => t.supporterName?.trim().toLowerCase())
      .filter((name): name is string => Boolean(name && name !== 'anonymous'))
  );

  const completedGrossDollars = completedGrossCents / 100;
  const completedNetDollars = completedNetCents / 100;
  const completedFeesDollars = (completedPlatformFeeCents + completedStripeFeeCents) / 100;
  const averageTipDollars = completedTips.length > 0
    ? completedGrossDollars / completedTips.length
    : 0;

  return {
    completedGrossCents,
    completedPlatformFeeCents,
    completedStripeFeeCents,
    completedNetCents,
    completedGrossDollars,
    completedNetDollars,
    completedFeesDollars,

    pendingFundsCents,
    pendingFundsDollars: pendingFundsCents / 100,
    disputedFundsCents,
    disputedFundsDollars: disputedFundsCents / 100,
    refundedFundsCents,
    refundedFundsDollars: refundedFundsCents / 100,

    completedCount: completedTips.length,
    pendingCount: pendingTips.length,
    disputedCount: disputedTips.length,
    refundedCount: refundedTips.length,
    failedCount: failedTips.length,
    totalTipsCount: safeTips.length,
    uniqueSupportersCount: uniqueSupporters.size,
    averageTipDollars,

    completedTips,
    pendingTips,
    disputedTips,
    refundedTips,
    failedTips,
  };
}

export interface StripeReconciliationInput {
  paymentIntentStatus?: string | null;
  checkoutPaymentStatus?: string | null;
  amountRefunded?: number;
  dispute?: {
    id: string;
    status: string; // 'needs_response' | 'under_review' | 'won' | 'lost'
  } | null;
}

/**
 * Reconciles a local tip transaction's status against authoritative Stripe record data
 * without arbitrarily overwriting legitimate states or inventing statuses.
 */
export function reconcileTipStatus(
  currentStatus: TipTransaction['status'],
  amountCents: number,
  stripeRecord: StripeReconciliationInput
): {
  status: TipTransaction['status'];
  disputeStatus?: string;
  disputeId?: string;
  isModified: boolean;
  reason: string;
} {
  // 1. Check for active or resolved Stripe Disputes
  if (stripeRecord.dispute) {
    const disp = stripeRecord.dispute;
    if (disp.status === 'won') {
      return {
        status: 'succeeded',
        disputeStatus: 'won',
        disputeId: disp.id,
        isModified: currentStatus !== 'succeeded',
        reason: 'Stripe dispute resolved in creator favor (won)',
      };
    }
    if (disp.status === 'lost') {
      return {
        status: 'refunded',
        disputeStatus: 'lost',
        disputeId: disp.id,
        isModified: currentStatus !== 'refunded',
        reason: 'Stripe dispute concluded in cardholder favor (lost / reversed)',
      };
    }
    // Under review / needs_response
    return {
      status: 'disputed',
      disputeStatus: disp.status,
      disputeId: disp.id,
      isModified: currentStatus !== 'disputed',
      reason: `Active dispute on Stripe (${disp.status})`,
    };
  }

  // 2. Check for Refunds on Stripe
  if (stripeRecord.amountRefunded && stripeRecord.amountRefunded >= amountCents) {
    return {
      status: 'refunded',
      isModified: currentStatus !== 'refunded',
      reason: `Full refund detected on Stripe (${stripeRecord.amountRefunded}¢ refunded)`,
    };
  }

  // 3. Check for Successful Payment Intent or Paid Checkout Session
  if (
    stripeRecord.paymentIntentStatus === 'succeeded' ||
    stripeRecord.checkoutPaymentStatus === 'paid'
  ) {
    return {
      status: 'succeeded',
      isModified: currentStatus !== 'succeeded',
      reason: 'Authoritatively confirmed as paid by Stripe',
    };
  }

  // 4. Check for Cancelled / Failed Payments
  if (
    stripeRecord.paymentIntentStatus === 'canceled' ||
    stripeRecord.paymentIntentStatus === 'requires_payment_method'
  ) {
    return {
      status: 'failed',
      isModified: currentStatus !== 'failed',
      reason: `Payment intent status on Stripe is ${stripeRecord.paymentIntentStatus}`,
    };
  }

  // 5. Check for Expired Session
  if (stripeRecord.checkoutPaymentStatus === 'unpaid' && stripeRecord.paymentIntentStatus === 'canceled') {
    return {
      status: 'expired',
      isModified: currentStatus !== 'expired',
      reason: 'Stripe checkout session expired before completion',
    };
  }

  // Keep existing status if no conclusive override from Stripe
  return {
    status: currentStatus,
    isModified: false,
    reason: 'Status matches or retained existing state',
  };
}

/**
 * Validates whether a tip qualifies for affiliate partner commission accrual.
 * Affiliate commission is strictly restricted to authoritatively confirmed tips.
 */
export function isTipEligibleForAffiliateCommission(tip: TipTransaction): boolean {
  return tip.status === 'succeeded' && typeof tip.amountCents === 'number' && tip.amountCents > 0;
}
