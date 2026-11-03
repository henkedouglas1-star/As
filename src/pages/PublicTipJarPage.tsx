import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, TipTransaction } from '../types';
import { TIP_TIERS, BRAND_NAME, TAGLINE } from '../lib/theme';
import { validateTipAmount } from '../lib/rules';
import { getCanonicalProfileUrl } from '../lib/urlUtils';
import GoalProgressBar from '../components/GoalProgressBar';
import ReportModal from '../components/ReportModal';
import ShareModal from '../components/ShareModal';
import Avatar from '../components/Avatar';
import QRCodeModal from '../components/QRCodeModal';
import BrandLogo from '../components/BrandLogo';
import {
  Heart,
  Share2,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Instagram,
  Video,
  Twitter,
  Youtube,
  Music,
  Globe,
  Flag,
  QrCode,
  AlertCircle,
} from 'lucide-react';
import { ThreadsIcon, normalizeThreadsUrl } from '../components/ThreadsIcon';

interface PublicTipJarPageProps {
  username: string;
  onNavigate: (route: string) => void;
}

export default function PublicTipJarPage({ username, onNavigate }: PublicTipJarPageProps) {
  const normalizedUsername = (username || '').toLowerCase().trim();

  const [creator, setCreator] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [redirectNotice, setRedirectNotice] = useState<string | null>(null);

  // Form State
  const [amount, setAmount] = useState<number | string>(5);
  const [supporterName, setSupporterName] = useState('');
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Modals
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load creator profile from database (via API or Firestore directly)
  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setNotFound(false);
      setRedirectNotice(null);

      try {
        // Try resolving via server resolution endpoint (handles redirect aliases!)
        const res = await fetch(`/api/user/by-username/${encodeURIComponent(normalizedUsername)}`);
        if (res.ok) {
          const data = await res.json();
          setCreator(data);
          if (data.redirectedFrom) {
            setRedirectNotice(`Redirected from @${data.redirectedFrom}`);
          }
          setLoading(false);
          return;
        }

        // Direct Firestore fallback
        const usernameRef = doc(db, 'usernames', normalizedUsername);
        const usernameDoc = await getDoc(usernameRef);

        if (!usernameDoc.exists()) {
          // Sample demo 'alex'
          if (normalizedUsername === 'alex') {
            setCreator({
              uid: 'sample_alex',
              username: 'alex',
              displayName: 'Alex Morgan',
              email: 'alex@example.com',
              bio: 'Creating art, sharing ideas, and making the internet a little more interesting.',
              supportMessage: 'Enjoy my work? Leave a little tip!',
              photoURL: undefined,
              accentColor: '#7427DF',
              chargesEnabled: true,
              showTotalTips: true,
              showSupporters: true,
              activeGoal: {
                id: 'goal_sample',
                title: 'High-Res Audio Interface & Mic',
                targetAmountDollars: 250,
                currentAmountDollars: 165,
                description: 'Upgrading the sound setup for upcoming weekly tutorial live streams.',
                isActive: true,
                createdAt: Date.now() - 86400000 * 3,
              },
              createdAt: Date.now() - 86400000 * 10,
            });
            setLoading(false);
            return;
          }

          setNotFound(true);
          setLoading(false);
          return;
        }

        const usernameData = usernameDoc.data();
        let uid = usernameData.uid;

        if (usernameData.isRedirect && usernameData.redirectTo) {
          setRedirectNotice(`Redirected from @${normalizedUsername}`);
          const targetDoc = await getDoc(doc(db, 'usernames', usernameData.redirectTo));
          if (targetDoc.exists()) {
            uid = targetDoc.data().uid;
          }
        }

        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          setCreator(userDoc.data() as UserProfile);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.warn('Error fetching public jar:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    if (normalizedUsername) {
      loadProfile();

      // Growth Engine Attribution: Anonymous visit tracking
      const params = new URLSearchParams(window.location.search);
      const source = params.get('source') || undefined;
      const ref = params.get('ref') || undefined;

      fetch('/api/growth/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'profile_visit',
          username: normalizedUsername,
          source,
          ref,
        }),
      }).catch(() => {});
    }
  }, [normalizedUsername]);

  const shareableUrl = getCanonicalProfileUrl(creator?.username || normalizedUsername);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendTip = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const numericAmount = Number(amount);
    const validation = validateTipAmount(numericAmount);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Please enter a valid amount.');
      return;
    }

    if (!creator) return;

    setProcessing(true);

    try {
      // Initiate checkout session with server
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: creator.username,
          recipientId: creator.uid,
          amountInDollars: numericAmount,
          supporterName: supporterName.trim() || 'Anonymous',
          message: message.trim(),
          goalId: creator.activeGoal?.id || null,
        }),
      });

      const data = await res.json();

      if (data.url) {
        // Redirect directly to Stripe Checkout
        window.location.href = data.url;
        return;
      }

      // If simulated fallback
      if (data.success || data.simulated) {
        const tipRecord: TipTransaction = {
          id: data.tipId || 'tip_' + Date.now(),
          recipientId: creator.uid,
          recipientUsername: creator.username,
          amountCents: Math.round(numericAmount * 100),
          currency: 'usd',
          supporterName: supporterName.trim() || 'Anonymous',
          message: message.trim(),
          status: 'succeeded',
          createdAt: Date.now(),
        };

        try {
          await setDoc(doc(db, 'tips', tipRecord.id), tipRecord);
        } catch (e) {
          console.warn('Tip store warning:', e);
        }

        onNavigate(
          `success?creator=${encodeURIComponent(creator.displayName || creator.username)}&handle=${creator.username}&amount=${numericAmount.toFixed(2)}`
        );
        return;
      }

      setErrorMessage(data.error || 'Could not initialize payment. Please try again.');
    } catch (err: any) {
      setErrorMessage('Network error connecting to payment gateway.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-[#E4E4E7] rounded-3xl p-8 animate-pulse text-center space-y-4 shadow-sm">
          <div className="w-24 h-24 rounded-full bg-[#F5F3FF] mx-auto" />
          <div className="h-6 w-40 bg-[#F5F3FF] rounded-xl mx-auto" />
          <div className="h-4 w-28 bg-[#F5F3FF]/60 rounded mx-auto" />
          <div className="h-20 bg-[#F5F3FF]/40 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (notFound || !creator) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] text-[#18181B] flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white border border-[#E4E4E7] rounded-3xl p-8 text-center shadow-md">
          <div className="w-16 h-16 rounded-full bg-[#F5F3FF] flex items-center justify-center mx-auto mb-4 text-[#7C3AED] font-black text-2xl border border-[#7C3AED]/20">
            ?
          </div>
          <h2 className="text-2xl font-black text-[#18181B]">Tipping Page Not Found</h2>
          <p className="text-xs text-[#71717A] mt-2 leading-relaxed">
            The handle <span className="font-mono text-[#7C3AED] font-bold">@{normalizedUsername}</span> hasn’t been claimed yet.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={() => onNavigate('onboarding')}
              className="w-full py-3.5 rounded-2xl bg-[#7C3AED] hover:bg-[#5B21B6] text-white font-black text-xs transition shadow-md cursor-pointer"
            >
              Claim @{normalizedUsername} on TipZeMe
            </button>
            <button
              onClick={() => onNavigate('landing')}
              className="w-full py-3 rounded-2xl bg-[#F5F3FF] hover:bg-[#EDE9FE] text-[#7C3AED] font-bold text-xs transition border border-[#7C3AED]/20 cursor-pointer"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const accent = '#7928FF';

  return (
    <div className="min-h-screen bg-[#0A0912] text-white flex flex-col items-center justify-between p-4 py-8 font-sans selection:bg-violet-600 selection:text-white relative overflow-hidden">
      {/* Subtle Top Radial Lighting */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[320px] bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.12),transparent_70%)] pointer-events-none -z-10"
        aria-hidden="true"
      />

      <div className="w-full max-w-md space-y-4 relative z-10">
        {/* Redirect Notice if arrived via alias */}
        {redirectNotice && (
          <div className="p-3 rounded-xl bg-violet-950/40 border border-violet-800/40 text-xs text-violet-300 text-center font-mono">
            {redirectNotice} → <strong className="text-white">@{creator.username}</strong>
          </div>
        )}

        {/* Creator Card */}
        <div className="luxe-glass-card rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden text-center border border-white/[0.08]">
          {/* Subtle Top Specular Highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />

          {/* Top Quick Actions (Share & QR) */}
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <button
              onClick={() => setQrModalOpen(true)}
              className="p-2 rounded-xl luxe-button-secondary text-slate-300 hover:text-white transition cursor-pointer"
              title="Show QR Code"
              aria-label="Show QR code"
            >
              <QrCode className="w-5 h-5" />
            </button>

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl luxe-button-secondary text-xs font-semibold text-slate-200 transition cursor-pointer"
              aria-label="Copy TipZeMe link"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-violet-300" />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>

          {/* Avatar & Identity */}
          <div className="flex flex-col items-center mt-2">
            <Avatar
              url={creator.photoURL || creator.avatarUrl}
              name={creator.displayName || creator.username}
              size="3xl"
              accentColor="#8B5CF6"
              className="mb-4"
            />
            <h1 className="font-display font-bold text-2xl text-white tracking-tight">
              {creator.displayName || creator.username}
            </h1>
            <p className="text-xs font-mono font-bold text-violet-400 mt-0.5">
              @{creator.username}
            </p>
          </div>

          {/* Biography */}
          {creator.bio && (
            <p className="text-xs text-slate-300 mt-3 leading-relaxed max-w-xs mx-auto">
              “{creator.bio}”
            </p>
          )}

          {/* Social Links Badges */}
          {creator.socialLinks && Object.values(creator.socialLinks).some(Boolean) && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              {creator.socialLinks.instagram && (
                <a
                  href={`https://instagram.com/${creator.socialLinks.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl luxe-button-secondary text-pink-400 transition"
                  title="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {creator.socialLinks.threads && (
                <a
                  href={normalizeThreadsUrl(creator.socialLinks.threads)}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl luxe-button-secondary text-purple-300 transition"
                  title="Threads"
                >
                  <ThreadsIcon className="w-4 h-4" />
                </a>
              )}
              {creator.socialLinks.tiktok && (
                <a
                  href={`https://tiktok.com/@${creator.socialLinks.tiktok.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl luxe-button-secondary text-white transition"
                  title="TikTok"
                >
                  <Video className="w-4 h-4" />
                </a>
              )}
              {creator.socialLinks.twitter && (
                <a
                  href={`https://x.com/${creator.socialLinks.twitter.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl luxe-button-secondary text-sky-400 transition"
                  title="X (Twitter)"
                >
                  <Twitter className="w-4 h-4" />
                </a>
              )}
              {creator.socialLinks.youtube && (
                <a
                  href={creator.socialLinks.youtube}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl luxe-button-secondary text-rose-400 transition"
                  title="YouTube"
                >
                  <Youtube className="w-4 h-4" />
                </a>
              )}
              {creator.socialLinks.spotify && (
                <a
                  href={creator.socialLinks.spotify}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl luxe-button-secondary text-violet-300 transition"
                  title="Music"
                >
                  <Music className="w-4 h-4" />
                </a>
              )}
              {creator.socialLinks.website && (
                <a
                  href={creator.socialLinks.website.startsWith('http') ? creator.socialLinks.website : `https://${creator.socialLinks.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl luxe-button-secondary text-violet-300 transition"
                  title="Website"
                >
                  <Globe className="w-4 h-4" />
                </a>
              )}
            </div>
          )}

          {/* Goal Progress Bar */}
          {creator.activeGoal && creator.activeGoal.isActive && (
            <div className="mt-5 text-left">
              <GoalProgressBar goal={creator.activeGoal} />
            </div>
          )}

          {/* Support Prompt Banner */}
          <div className="mt-5 p-3.5 rounded-2xl luxe-pill text-center">
            <h2 className="font-display font-bold text-sm text-white">
              Send a little appreciation 💜
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {creator.supportMessage || 'Choose an amount and make someone’s day.'}
            </p>
          </div>

          {/* Tip Form */}
          <form onSubmit={handleSendTip} className="mt-6 space-y-4 text-left">
            {/* Amount Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Select Tip Amount
              </label>
              <div className="grid grid-cols-4 gap-2">
                {TIP_TIERS.map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setAmount(tier)}
                    className={`py-2.5 rounded-xl font-bold text-sm transition cursor-pointer ${
                      Number(amount) === tier
                        ? 'bg-violet-600 text-white font-extrabold shadow-sm border border-violet-400'
                        : 'bg-white/[0.04] text-slate-300 border border-white/[0.08] hover:border-white/[0.2]'
                    }`}
                  >
                    ${tier}
                  </button>
                ))}
              </div>

              {/* Fee Disclosure Note directly below preset buttons */}
              <div className="mt-2 text-center">
                <span className="text-[11px] text-slate-400">
                  TipZeMe platform fee: 1% + 5¢ · Standard payment processing applies
                </span>
              </div>

              {/* Custom amount input */}
              <div className="mt-2.5 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                <input
                  type="number"
                  min="1"
                  max="500"
                  step="0.01"
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAmount(val === '' ? '' : Number(val));
                  }}
                  placeholder="Enter custom amount ($1 - $500)"
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-semibold text-white focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            {/* Supporter Name (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Your Name (Optional)
              </label>
              <input
                type="text"
                maxLength={40}
                value={supporterName}
                onChange={(e) => setSupporterName(e.target.value)}
                placeholder="Leave blank for Anonymous"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-violet-500"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Message of Encouragement
              </label>
              <input
                type="text"
                maxLength={140}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Keep creating amazing things!"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-violet-500"
              />
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-xs text-rose-200 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Tip Button */}
            <button
              type="submit"
              disabled={processing}
              className="luxe-button-primary w-full py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
            >
              <span>
                {processing
                  ? 'Connecting to Stripe...'
                  : `Send $${Number(amount || 0).toFixed(2)} Tip`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Secured by Stripe · Apple Pay, Google Pay &amp; Cards</span>
            </div>
          </form>

          {/* Report & Share */}
          <div className="mt-6 pt-4 border-t border-purple-900/30 flex items-center justify-between text-[11px] text-slate-400">
            <button
              onClick={() => setShareModalOpen(true)}
              className="hover:text-white font-bold flex items-center gap-1 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-violet-300" /> Share Page
            </button>
            <button
              onClick={() => setReportModalOpen(true)}
              className="hover:text-rose-400 flex items-center gap-1 cursor-pointer"
            >
              <Flag className="w-3 h-3" /> Report
            </button>
          </div>
        </div>

        {/* ORGANIC GROWTH LOOP: Branded Public Profile Banner with BrandLogo */}
        <div className="text-center pt-2">
          <a
            href={`/#onboarding?ref=${creator.username}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full luxe-glass-card hover:border-violet-400 text-xs text-slate-300 hover:text-white transition group shadow-md"
          >
            <BrandLogo size="sm" showText={false} />
            <span>Powered by <strong className="text-white">TipZeMe</strong></span>
            <span className="text-slate-500">·</span>
            <span className="text-violet-300 font-bold group-hover:underline">Claim your own tipping link &rarr;</span>
          </a>
        </div>
      </div>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        url={shareableUrl}
        username={creator.username}
        displayName={creator.displayName}
        photoUrl={creator.photoURL || creator.avatarUrl}
        accentColor="#7C3AED"
      />

      {/* Share Modal */}
      <ShareModal
        url={shareableUrl}
        username={creator.username}
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />

      {/* Report Modal */}
      <ReportModal
        username={creator.username}
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />
    </div>
  );
}
