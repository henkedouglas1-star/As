import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TipTransaction, SupportGoal } from '../types';
import ShareModal from '../components/ShareModal';
import ShareCardModal from '../components/ShareCardModal';
import PrintableSignModal from '../components/PrintableSignModal';
import QRCodeModal from '../components/QRCodeModal';
import GoalProgressBar from '../components/GoalProgressBar';
import Avatar from '../components/Avatar';
import { calculatePlatformFee } from '../lib/rules';
import { calculateLedgerAggregates } from '../lib/ledger';
import { getCanonicalProfileUrl } from '../lib/urlUtils';
import PWAInstallButton from '../components/PWAInstallButton';
import {
  Share2,
  Copy,
  Check,
  Image as ImageIcon,
  Printer,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Target,
  ArrowUpRight,
  DollarSign,
  Users,
  CreditCard,
  Plus,
  Trash2,
  Percent,
  Calculator,
  ChevronDown,
  ChevronUp,
  UserCheck,
  QrCode,
  TrendingUp,
  BarChart3,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (route: string) => void;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { user, profile, loading } = useAuth();

  const [tips, setTips] = useState<TipTransaction[]>([]);
  const [tipsLoading, setTipsLoading] = useState(true);

  // Platform Fee Config & Preview
  const [feeConfig, setFeeConfig] = useState({ percent: 1, fixedCents: 5 });
  const [calcAmount, setCalcAmount] = useState('10');
  const [showFeeDetails, setShowFeeDetails] = useState(false);

  // Modals
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Goal Form
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  // Stripe Connecting
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [stripeNotice, setStripeNotice] = useState('');

  // Fetch live fee schedule from backend
  useEffect(() => {
    fetch('/api/config/stripe')
      .then((res) => res.json())
      .then((data) => {
        if (
          typeof data.platformFeePercent === 'number' &&
          typeof data.platformFeeFixedCents === 'number'
        ) {
          setFeeConfig({
            percent: data.platformFeePercent,
            fixedCents: data.platformFeeFixedCents,
          });
        }
      })
      .catch((err) => console.warn('Notice loading fee configuration:', err));
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      onNavigate('signin');
    }
  }, [user, loading, onNavigate]);

  // Fetch verified tips from Firestore
  useEffect(() => {
    if (!user) return;

    try {
      const tipsQuery = query(
        collection(db, 'tips'),
        where('recipientId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        tipsQuery,
        (snapshot) => {
          const loadedTips = snapshot.docs.map((d) => d.data() as TipTransaction);
          setTips(loadedTips);
          setTipsLoading(false);
        },
        (error) => {
          console.warn('Real-time tips listener notice:', error);
          const stored = localStorage.getItem(`tipjar_tips_${user.uid}`);
          if (stored) {
            try {
              setTips(JSON.parse(stored));
            } catch {
              setTips([]);
            }
          }
          setTipsLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      setTipsLoading(false);
    }
  }, [user]);

  const shareableUrl = getCanonicalProfileUrl(profile?.username || '');

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

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    setStripeNotice('');
    try {
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.uid,
          email: user?.email,
          username: profile?.username,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setStripeNotice(data.message || data.error || 'Failed to initialize Stripe onboarding.');
      }
    } catch (err) {
      setStripeNotice('Could not connect to Stripe onboarding right now.');
    } finally {
      setConnectingStripe(false);
    }
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !goalTitle.trim() || !goalTarget) return;

    setSavingGoal(true);
    try {
      const newGoal: SupportGoal = {
        id: 'goal_' + Date.now(),
        title: goalTitle.trim(),
        targetAmountDollars: Number(goalTarget),
        currentAmountDollars: 0,
        description: goalDesc.trim() || undefined,
        isActive: true,
        createdAt: Date.now(),
      };

      await updateDoc(doc(db, 'users', user.uid), {
        activeGoal: newGoal,
      });

      setGoalTitle('');
      setGoalTarget('');
      setGoalDesc('');
      setShowGoalForm(false);
    } catch (err) {
      console.warn('Failed to save goal:', err);
    } finally {
      setSavingGoal(false);
    }
  };

  const handleRemoveGoal = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { activeGoal: null });
    } catch (err) {
      console.warn('Failed to remove goal:', err);
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Authoritative verified ledger totals strictly separating completed from pending/unverified
  const ledgerAggregates = calculateLedgerAggregates(tips, feeConfig.percent, feeConfig.fixedCents);
  const confirmedTips = ledgerAggregates.completedTips;
  const totalGrossDollars = ledgerAggregates.completedGrossDollars.toFixed(2);
  const totalNetDollars = ledgerAggregates.completedNetDollars.toFixed(2);
  const avgTipDollars = ledgerAggregates.averageTipDollars.toFixed(2);
  const pendingFundsDollars = ledgerAggregates.pendingFundsDollars.toFixed(2);

  const accent = profile.accentColor || '#7C3AED';

  return (
    <div className="min-h-screen bg-[#0A0912] text-white pb-24 font-sans selection:bg-violet-600 selection:text-white">
      <main className="max-w-5xl mx-auto px-4 pt-6 sm:pt-8">
        <div className="mb-6">
          <PWAInstallButton variant="banner" />
        </div>

        {/* Creator Header Card with Refined Glassmorphism */}
        <div className="p-6 sm:p-8 rounded-2xl luxe-glass-card shadow-lg mb-6 relative overflow-hidden border border-white/[0.08]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-1">
            <div className="flex items-center gap-4 min-w-0">
              <Avatar
                url={profile.photoURL || profile.avatarUrl}
                name={profile.displayName || profile.username}
                size="2xl"
                accentColor={accent}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-white truncate">{profile.displayName}</h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-violet-950/80 text-violet-300 px-2.5 py-0.5 rounded-full border border-violet-800/50">
                    Active
                  </span>
                </div>
                <p className="text-xs font-mono font-bold text-violet-400 mt-0.5 truncate max-w-[240px] sm:max-w-md">
                  {shareableUrl}
                </p>
                {profile.bio && (
                  <p className="text-xs text-slate-300 mt-1.5 max-w-md line-clamp-1">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => onNavigate('edit-profile')}
                className="luxe-button-secondary px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white cursor-pointer"
              >
                <UserCheck className="w-4 h-4 mr-1.5 text-violet-300" />
                <span>Edit Profile</span>
              </button>

              <button
                onClick={() => setQrModalOpen(true)}
                className="luxe-button-secondary px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white cursor-pointer"
                title="Download QR code"
              >
                <QrCode className="w-4 h-4 mr-1.5 text-violet-300" />
                <span>QR Code</span>
              </button>

              <button
                onClick={() => onNavigate(`jar:${profile.username}`)}
                className="luxe-button-secondary p-2 rounded-xl text-slate-200 hover:text-white cursor-pointer"
                title="Open Public Tipping Page"
              >
                <ArrowUpRight className="w-4 h-4 text-violet-300" />
              </button>
            </div>
          </div>

          {/* Quick Sharing Suite */}
          <div className="mt-6 pt-6 border-t border-purple-900/30 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setShareModalOpen(true)}
                className="luxe-button-primary px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center cursor-pointer shadow-lg"
              >
                <Share2 className="w-3.5 h-3.5 mr-1.5 text-violet-200" />
                <span>Share Tip Link</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="luxe-button-secondary px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white cursor-pointer flex items-center"
              >
                {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1.5 text-violet-300" />}
                <span>{copied ? 'Copied Link' : 'Copy Link'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setCardModalOpen(true)}
                className="luxe-button-secondary px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white cursor-pointer flex items-center"
              >
                <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-violet-300" />
                <span>Social Card</span>
              </button>

              <button
                onClick={() => setPrintModalOpen(true)}
                className="luxe-button-secondary px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white cursor-pointer flex items-center"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5 text-violet-300" />
                <span>Table Tent Sign</span>
              </button>

              <button
                onClick={() => onNavigate('growth')}
                className="luxe-button-secondary px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white cursor-pointer flex items-center"
              >
                <TrendingUp className="w-3.5 h-3.5 mr-1.5 text-violet-300" />
                <span className="hidden sm:inline">Growth</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stripe Payout Status Alert & Fee Breakdown */}
        {!profile.chargesEnabled ? (
          <div className="mb-6 rounded-[28px] luxe-glass-card border border-amber-500/30 p-5 sm:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-purple-900/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-display font-bold text-white text-sm">Payout Setup Pending</h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-950/70 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-700/60">
                      Stripe Test Mode
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Connect your bank account via Stripe Connect Express so supporters can tip real money directly to your account.
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('payouts')}
                className="luxe-button-primary px-5 py-2.5 rounded-xl text-xs font-bold text-white cursor-pointer shrink-0"
              >
                <CreditCard className="w-4 h-4 mr-1.5" />
                <span>Connect Payouts</span>
              </button>
            </div>

            {/* Fee Breakdown Before Enabling Live Payments */}
            <div className="mt-4 pt-1">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-violet-300" />
                  <span className="text-xs font-bold text-white">
                    Platform Fee Schedule: {feeConfig.percent}% + ${(feeConfig.fixedCents / 100).toFixed(2)} per tip
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFeeDetails(!showFeeDetails)}
                  className="text-xs text-violet-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer"
                >
                  {showFeeDetails ? 'Hide Breakdown' : 'View Fee Breakdown'}
                  {showFeeDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {showFeeDetails && (
                <div className="bg-[#0B0616]/90 rounded-2xl p-4 border border-purple-900/30 space-y-3">
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Platform fee: {feeConfig.percent}% + ${(feeConfig.fixedCents / 100).toFixed(2)} per tip. Stripe processing fees also apply. Remaining net funds transfer directly to your connected bank account.
                  </p>

                  {/* Fee comparison table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-purple-900/30 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          <th className="pb-1.5 font-bold">Tip Amount</th>
                          <th className="pb-1.5 font-bold">
                            Platform Fee ({feeConfig.percent}% + ${(feeConfig.fixedCents / 100).toFixed(2)})
                          </th>
                          <th className="pb-1.5 font-bold">You Receive (Net)</th>
                          <th className="pb-1.5 font-bold text-right">Take-Home %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-900/20 text-[11px]">
                        {[5, 10, 25, 50].map((sample) => {
                          const sampleCents = sample * 100;
                          const fee = calculatePlatformFee(sampleCents, feeConfig.percent, feeConfig.fixedCents);
                          const net = sampleCents - fee;
                          const pct = ((net / sampleCents) * 100).toFixed(1);
                          return (
                            <tr key={sample} className="hover:bg-purple-950/30">
                              <td className="py-1.5 font-bold text-white">${sample.toFixed(2)}</td>
                              <td className="py-1.5 text-slate-400 font-mono">-${(fee / 100).toFixed(2)}</td>
                              <td className="py-1.5 font-bold text-violet-300">${(net / 100).toFixed(2)}</td>
                              <td className="py-1.5 text-right font-mono text-slate-400">{pct}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Interactive Fee Estimator */}
                  <div className="pt-2 border-t border-purple-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-3.5 h-3.5 text-violet-300 shrink-0" />
                      <span className="text-[11px] font-bold text-slate-300">Custom tip estimate:</span>
                      <div className="relative w-24">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                        <input
                          type="number"
                          min="1"
                          max="500"
                          step="1"
                          value={calcAmount}
                          onChange={(e) => setCalcAmount(e.target.value)}
                          className="w-full pl-6 pr-2 py-1 text-xs font-bold rounded-lg border border-purple-800/40 bg-[#07050C] text-white focus:outline-none focus:border-violet-400"
                        />
                      </div>
                    </div>
                    {(() => {
                      const num = Math.max(1, Number(calcAmount) || 0);
                      const cents = Math.round(num * 100);
                      const fee = calculatePlatformFee(cents, feeConfig.percent, feeConfig.fixedCents);
                      const net = Math.max(0, cents - fee);
                      return (
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="text-slate-400">
                            Fee: <strong className="text-white font-mono">${(fee / 100).toFixed(2)}</strong>
                          </span>
                          <span className="text-violet-300 font-bold">
                            Net Payout: <strong className="text-white font-mono">${(net / 100).toFixed(2)}</strong>
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {stripeNotice && (
                <div className="mt-3 p-3 rounded-xl bg-amber-950/70 border border-amber-700/60 text-xs text-amber-200 font-medium">
                  {stripeNotice}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 rounded-2xl luxe-glass-card border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-2.5 text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Stripe Payouts Active · Apple Pay, Google Pay &amp; Cards enabled</span>
            </div>
            <div className="text-[11px] font-bold text-violet-300 bg-violet-950/60 px-3 py-1 rounded-xl border border-violet-800/40 font-mono">
              Platform Fee: {feeConfig.percent}% + ${(feeConfig.fixedCents / 100).toFixed(2)}
            </div>
          </div>
        )}

        {/* Metrics Grid — Hero Total Tips + Detail Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Hero Metric: Total Tips */}
          <div className="luxe-glass-card-glow p-5 rounded-2xl shadow-md relative overflow-hidden sm:col-span-2 lg:col-span-1 border border-violet-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">Total Tips</span>
              <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300">
                <BarChart3 className="w-4 h-4 text-violet-300" />
              </div>
            </div>
            <div className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight tabular-nums">
              ${totalGrossDollars}
            </div>
            <div className="text-[11px] text-violet-300/80 mt-1">Total Gross Contributions</div>
          </div>

          <div className="luxe-glass-card p-5 rounded-2xl shadow-sm border border-white/[0.08]">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Net Payouts</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="font-display text-2xl sm:text-3xl font-extrabold text-emerald-400 tabular-nums">${totalNetDollars}</div>
            <div className="text-[11px] text-slate-400 mt-1">
              After platform fee ({feeConfig.percent}% + ${(feeConfig.fixedCents / 100).toFixed(2)})
            </div>
          </div>

          <div className="luxe-glass-card p-5 rounded-2xl shadow-sm border border-white/[0.08]">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Supporters</span>
              <Users className="w-4 h-4 text-violet-300" />
            </div>
            <div className="font-display text-2xl sm:text-3xl font-extrabold text-white tabular-nums">{confirmedTips.length}</div>
            <div className="text-[11px] text-slate-400 mt-1">Verified completed tips</div>
          </div>

          <div className="luxe-glass-card p-5 rounded-2xl shadow-sm border border-white/[0.08]">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Average Tip</span>
              <CreditCard className="w-4 h-4 text-violet-300" />
            </div>
            <div className="font-display text-2xl sm:text-3xl font-extrabold text-white tabular-nums">${avgTipDollars}</div>
            <div className="text-[11px] text-slate-400 mt-1">Per completed transaction</div>
          </div>
        </div>

        {/* Partner Program Discovery Banner with Subtle Champagne Metallic Accents */}
        <div className="luxe-glass-card border border-amber-400/20 rounded-2xl p-5 sm:p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm relative overflow-hidden bg-gradient-to-r from-[#0E0C18] to-[#141022]">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center shrink-0 shadow-sm font-bold">
              <Sparkles className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h4 className="font-display font-bold text-white text-sm sm:text-base">TipZeMe Partner Program</h4>
              <p className="text-xs text-slate-300">Earn recurring commissions on platform fees for 12 months by inviting creators.</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('affiliate')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-400 hover:from-amber-200 hover:to-yellow-300 transition shadow-md shadow-amber-400/20 shrink-0 cursor-pointer relative z-10 flex items-center"
          >
            <span>Open Partner Dashboard</span>
            <ChevronDown className="w-3.5 h-3.5 ml-1.5 rotate-[-90deg]" />
          </button>
        </div>

        {/* Support Goal Section */}
        <div className="luxe-glass-card rounded-[28px] p-6 sm:p-7 shadow-xl mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-violet-300" />
              <h3 className="font-display font-bold text-sm text-white">Support Goal</h3>
            </div>
            {profile.activeGoal ? (
              <button
                onClick={handleRemoveGoal}
                className="text-xs text-rose-400 font-semibold hover:text-rose-300 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove Goal
              </button>
            ) : (
              !showGoalForm && (
                <button
                  onClick={() => setShowGoalForm(true)}
                  className="luxe-button-primary px-3.5 py-1.5 rounded-xl text-xs font-bold text-white cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Goal
                </button>
              )
            )}
          </div>

          {profile.activeGoal ? (
            <GoalProgressBar goal={profile.activeGoal} />
          ) : showGoalForm ? (
            <form onSubmit={handleSaveGoal} className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    required
                    placeholder="Goal title (e.g. New podcast microphone)"
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    className="w-full rounded-xl border border-purple-800/40 bg-[#07050C] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-violet-400"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    min="5"
                    max="10000"
                    required
                    placeholder="Target ($USD)"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    className="w-full rounded-xl border border-purple-800/40 bg-[#07050C] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-violet-400"
                  />
                </div>
              </div>
              <input
                type="text"
                placeholder="Optional short description..."
                value={goalDesc}
                onChange={(e) => setGoalDesc(e.target.value)}
                className="w-full rounded-xl border border-purple-800/40 bg-[#07050C] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-violet-400"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowGoalForm(false)}
                  className="luxe-button-secondary px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingGoal}
                  className="luxe-button-primary px-5 py-2 rounded-xl text-xs font-bold text-white cursor-pointer disabled:opacity-50"
                >
                  {savingGoal ? 'Saving...' : 'Set Active Goal'}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-xs text-slate-400">
              No active funding goal. Setting a target (like new camera equipment or studio rent) gives supporters a specific reason to contribute.
            </p>
          )}
        </div>

        {/* Supporter Activity Table */}
        <div className="luxe-glass-card rounded-[28px] shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-purple-900/30 flex items-center justify-between">
            <h3 className="font-display font-bold text-sm text-white">Recent Supporter Activity</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-mono">{confirmedTips.length} tips</span>
              <button
                onClick={() => onNavigate('activity')}
                className="text-xs font-bold text-violet-300 hover:text-white inline-flex items-center gap-1 cursor-pointer transition"
              >
                <span>View Full Ledger</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {tipsLoading ? (
            <div className="p-10 text-center text-xs text-slate-400">Loading activity...</div>
          ) : tips.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 bg-violet-950/80 text-violet-300 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-violet-800/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                <DollarSign className="w-6 h-6" />
              </div>
              <h4 className="font-display font-bold text-white text-base">No tips received yet</h4>
              <p className="text-slate-400 text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
                Share your personal link on social bios, videos, or printable signs to start receiving support!
              </p>
              <button
                onClick={() => setShareModalOpen(true)}
                className="mt-5 luxe-button-primary px-5 py-2.5 rounded-xl text-xs font-bold text-white cursor-pointer inline-flex items-center gap-1.5 shadow-lg"
              >
                <Share2 className="w-3.5 h-3.5" /> Share Your Link
              </button>
            </div>
          ) : (
            <div className="divide-y divide-purple-900/20">
              {tips.map((tip) => (
                <div
                  key={tip.id}
                  className="p-5 flex items-start justify-between gap-4 hover:bg-violet-950/20 transition"
                >
                  <div className="flex items-start gap-3">
                    <Avatar
                      url={tip.supporterAvatarUrl}
                      name={tip.supporterName}
                      size="sm"
                      accentColor={accent}
                      ring={false}
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">{tip.supporterName}</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(tip.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        {tip.status === 'succeeded' ? (
                          <span className="text-[10px] bg-emerald-950/70 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-700/50">
                            Paid
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-900 text-slate-400 font-medium px-2 py-0.5 rounded-full border border-white/10">
                            {tip.status}
                          </span>
                        )}
                      </div>
                      {tip.message && (
                        <p className="text-xs text-slate-300 mt-1 italic leading-relaxed">
                          “{tip.message}”
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-display font-bold text-violet-300 text-base tabular-nums">
                      +${(tip.amountCents / 100).toFixed(2)}
                    </span>
                    {tip.status === 'succeeded' && (
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 tabular-nums">
                        net $
                        {(
                          Math.max(
                            0,
                            tip.amountCents -
                              (typeof tip.platformFeeCents === 'number'
                                ? tip.platformFeeCents
                                : calculatePlatformFee(
                                    tip.amountCents,
                                    feeConfig.percent,
                                    feeConfig.fixedCents
                                  ))
                          ) / 100
                        ).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <QRCodeModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        url={shareableUrl}
        username={profile.username}
        displayName={profile.displayName}
        photoUrl={profile.photoURL || profile.avatarUrl}
        accentColor={accent}
      />

      <ShareModal
        url={shareableUrl}
        username={profile.username}
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />

      <ShareCardModal
        isOpen={cardModalOpen}
        onClose={() => setCardModalOpen(false)}
        creatorName={profile.displayName}
        username={profile.username}
        supportMessage={profile.supportMessage || ''}
        tipJarUrl={shareableUrl}
        photoUrl={profile.photoURL || profile.avatarUrl}
        accentColor={accent}
      />

      <PrintableSignModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        creatorName={profile.displayName}
        username={profile.username}
        supportMessage={profile.supportMessage || ''}
        tipJarUrl={shareableUrl}
        photoUrl={profile.photoURL || profile.avatarUrl}
        accentColor={accent}
      />
    </div>
  );
}
