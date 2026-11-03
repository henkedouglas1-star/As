import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TipTransaction } from '../types';
import { calculatePlatformFee } from '../lib/rules';
import { calculateLedgerAggregates } from '../lib/ledger';
import {
  Heart,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpRight,
  Share2,
  MessageSquare,
  AlertTriangle,
  RotateCcw,
  XCircle,
  ShieldCheck,
  RefreshCw,
  Info,
} from 'lucide-react';

interface ActivityPageProps {
  onNavigate: (route: string) => void;
}

export default function ActivityPage({ onNavigate }: ActivityPageProps) {
  const { user, profile, loading } = useAuth();
  const [tips, setTips] = useState<TipTransaction[]>([]);
  const [loadingTips, setLoadingTips] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'completed' | 'pending' | 'disputed-refunded' | 'with-messages'>('all');
  const [verifyingTipId, setVerifyingTipId] = useState<string | null>(null);
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      onNavigate('signin');
      return;
    }

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
          setLoadingTips(false);
        },
        (error) => {
          console.warn('Activity tips real-time listener:', error);
          const stored = localStorage.getItem(`tipjar_tips_${user.uid}`);
          if (stored) {
            try {
              setTips(JSON.parse(stored));
            } catch {
              setTips([]);
            }
          }
          setLoadingTips(false);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      setLoadingTips(false);
    }
  }, [user, loading, onNavigate]);

  // Authoritative aggregates computed via pure ledger logic
  const aggregates = calculateLedgerAggregates(tips);

  // Filtered tips for display
  const filteredTips = tips.filter((tip) => {
    const matchesSearch =
      (tip.supporterName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tip.message || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tip.id || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedFilter === 'completed') return tip.status === 'succeeded';
    if (selectedFilter === 'pending') return tip.status === 'pending';
    if (selectedFilter === 'disputed-refunded') return tip.status === 'disputed' || tip.status === 'refunded';
    if (selectedFilter === 'with-messages') return Boolean(tip.message?.trim());

    return true;
  });

  const handleVerifyTip = async (tipId: string) => {
    setVerifyingTipId(tipId);
    setVerifyNotice(null);
    try {
      const res = await fetch('/api/stripe/verify-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipId }),
      });
      const data = await res.json();
      if (data.success) {
        setVerifyNotice(`Transaction ${tipId} verified against Stripe: ${data.status} (${data.reason || 'Authoritatively confirmed'})`);
        // Optimistically update if real-time listener has latency
        if (data.tip) {
          setTips((prev) => prev.map((t) => (t.id === tipId ? { ...t, ...data.tip } : t)));
        }
      } else {
        setVerifyNotice(`Verification notice: ${data.error || 'Could not verify status with Stripe'}`);
      }
    } catch (err: any) {
      setVerifyNotice(`Verification error: ${err.message || 'Network request failed'}`);
    } finally {
      setVerifyingTipId(null);
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Recently';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const renderStatusBadge = (tip: TipTransaction) => {
    switch (tip.status) {
      case 'succeeded':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>Verified</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30">
            <Clock className="w-3 h-3" />
            <span>Pending</span>
          </span>
        );
      case 'disputed':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-md border border-purple-500/40">
            <AlertTriangle className="w-3 h-3" />
            <span>Disputed ({tip.disputeStatus || 'under review'})</span>
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded-md border border-rose-500/30">
            <RotateCcw className="w-3 h-3" />
            <span>Refunded</span>
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-500/15 px-2 py-0.5 rounded-md border border-slate-500/30">
            <XCircle className="w-3 h-3" />
            <span>Expired</span>
          </span>
        );
      case 'failed':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded-md border border-rose-500/30">
            <XCircle className="w-3 h-3" />
            <span>Unpaid / Failed</span>
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#08051B] text-white pb-24 font-sans selection:bg-[#7928FF] selection:text-white">
      <main className="max-w-4xl mx-auto px-4 pt-8 sm:pt-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#7928FF]/20">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline text-2xl sm:text-3xl font-black text-white tracking-tight">
                Activity
              </h1>
              <span className="text-xs font-bold text-[#D49BFF] bg-[#7928FF]/20 px-2.5 py-0.5 rounded-full border border-[#7928FF]/40">
                Verified Ledger
              </span>
            </div>
            <p className="text-sm text-[#C9BFDF] mt-1">
              Authoritatively confirmed tip revenue, pending funds, and fee breakdowns.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('payouts')}
              className="btn-luxury-secondary px-4 py-2 text-xs font-bold cursor-pointer"
            >
              <span>Bank Payouts</span>
              <ArrowUpRight className="w-3.5 h-3.5 ml-1 text-[#D49BFF]" />
            </button>
            {profile?.username && (
              <button
                onClick={() => onNavigate(`jar:${profile.username}`)}
                className="btn-luxury-primary px-4 py-2 text-xs font-extrabold cursor-pointer"
              >
                <span>View My Page</span>
                <Sparkles className="w-3.5 h-3.5 ml-1 text-[#D49BFF]" />
              </button>
            )}
          </div>
        </div>

        {/* Verification Notice Toast */}
        {verifyNotice && (
          <div className="mt-4 p-3.5 rounded-xl bg-[#120A2B] border border-[#7928FF]/40 text-xs text-white flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#D49BFF] shrink-0" />
              <span>{verifyNotice}</span>
            </div>
            <button
              onClick={() => setVerifyNotice(null)}
              className="text-[#968AAE] hover:text-white text-xs font-bold px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* Aggregate KPI Grid: Strictly segregates completed from pending and unverified */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6">
          {/* Completed Gross Tips */}
          <div className="surface-royal rounded-2xl p-5 shadow-xl border border-[#7928FF]/30">
            <div className="flex items-center justify-between text-[#968AAE]">
              <span className="text-[11px] font-bold uppercase tracking-wider">Completed Gross</span>
              <DollarSign className="w-4 h-4 text-[#D49BFF]" />
            </div>
            <div className="mt-2 font-headline text-2xl sm:text-3xl font-black text-white tabular-nums">
              ${aggregates.completedGrossDollars.toFixed(2)}
            </div>
            <div className="mt-1 text-xs text-[#968AAE]">
              <span>{aggregates.completedCount} verified tips</span>
            </div>
          </div>

          {/* Creator Net Earnings */}
          <div className="surface-royal rounded-2xl p-5 shadow-xl border border-emerald-500/30">
            <div className="flex items-center justify-between text-[#968AAE]">
              <span className="text-[11px] font-bold uppercase tracking-wider">Creator Net</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 font-headline text-2xl sm:text-3xl font-black text-emerald-400 tabular-nums">
              ${aggregates.completedNetDollars.toFixed(2)}
            </div>
            <div className="mt-1 text-xs text-[#968AAE]">
              <span>After 1% + 5¢ fee &amp; Stripe</span>
            </div>
          </div>

          {/* Pending Funds */}
          <div className="surface-royal rounded-2xl p-5 shadow-xl border border-amber-500/30">
            <div className="flex items-center justify-between text-[#968AAE]">
              <span className="text-[11px] font-bold uppercase tracking-wider">Pending Funds</span>
              <Clock className="w-4 h-4 text-amber-300" />
            </div>
            <div className="mt-2 font-headline text-2xl sm:text-3xl font-black text-amber-300 tabular-nums">
              ${aggregates.pendingFundsDollars.toFixed(2)}
            </div>
            <div className="mt-1 text-xs text-[#968AAE]">
              <span>{aggregates.pendingCount} checkouts clearing</span>
            </div>
          </div>

          {/* Supporters */}
          <div className="surface-royal rounded-2xl p-5 shadow-xl border border-[#7928FF]/20">
            <div className="flex items-center justify-between text-[#968AAE]">
              <span className="text-[11px] font-bold uppercase tracking-wider">Supporters</span>
              <Users className="w-4 h-4 text-[#D49BFF]" />
            </div>
            <div className="mt-2 font-headline text-2xl sm:text-3xl font-black text-white tabular-nums">
              {aggregates.uniqueSupportersCount}
            </div>
            <div className="mt-1 text-xs text-[#968AAE]">
              <span>Avg ${aggregates.averageTipDollars.toFixed(2)} per tip</span>
            </div>
          </div>
        </div>

        {/* Excluded Funds Alert (Refunds & Disputes) */}
        {(aggregates.disputedCount > 0 || aggregates.refundedCount > 0) && (
          <div className="mt-4 p-4 rounded-2xl bg-[#120A2B]/80 border border-purple-500/30 flex items-start gap-3">
            <Info className="w-4 h-4 text-[#D49BFF] shrink-0 mt-0.5" />
            <div className="text-xs text-[#C9BFDF] space-y-0.5">
              <p className="font-bold text-white">Segregated Ledger Adjustments</p>
              <p>
                {aggregates.refundedCount > 0 && `${aggregates.refundedCount} refunded (${aggregates.refundedFundsDollars.toFixed(2)}) `}
                {aggregates.disputedCount > 0 && `${aggregates.disputedCount} disputed (${aggregates.disputedFundsDollars.toFixed(2)}) `}
                are excluded from completed tip revenue in accordance with financial ledger compliance.
              </p>
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#968AAE]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by supporter name, note, or tip ID..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#08051B] border border-[#7928FF]/30 text-xs text-white placeholder-[#968AAE] focus:outline-none focus:border-[#D49BFF] transition"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-[#120A2B] rounded-xl border border-[#7928FF]/25 overflow-x-auto self-start sm:self-auto">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer shrink-0 ${
                selectedFilter === 'all'
                  ? 'bg-[#7928FF] text-white shadow-xs'
                  : 'text-[#968AAE] hover:text-white'
              }`}
            >
              All ({tips.length})
            </button>
            <button
              onClick={() => setSelectedFilter('completed')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer shrink-0 ${
                selectedFilter === 'completed'
                  ? 'bg-[#7928FF] text-white shadow-xs'
                  : 'text-[#968AAE] hover:text-white'
              }`}
            >
              Verified ({aggregates.completedCount})
            </button>
            <button
              onClick={() => setSelectedFilter('pending')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer shrink-0 ${
                selectedFilter === 'pending'
                  ? 'bg-[#7928FF] text-white shadow-xs'
                  : 'text-[#968AAE] hover:text-white'
              }`}
            >
              Pending ({aggregates.pendingCount})
            </button>
            {(aggregates.disputedCount > 0 || aggregates.refundedCount > 0) && (
              <button
                onClick={() => setSelectedFilter('disputed-refunded')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer shrink-0 ${
                  selectedFilter === 'disputed-refunded'
                    ? 'bg-[#7928FF] text-white shadow-xs'
                    : 'text-[#968AAE] hover:text-white'
                }`}
              >
                Reversals ({aggregates.disputedCount + aggregates.refundedCount})
              </button>
            )}
            <button
              onClick={() => setSelectedFilter('with-messages')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer shrink-0 ${
                selectedFilter === 'with-messages'
                  ? 'bg-[#7928FF] text-white shadow-xs'
                  : 'text-[#968AAE] hover:text-white'
              }`}
            >
              With Notes
            </button>
          </div>
        </div>

        {/* Transaction Ledger */}
        <div className="mt-4 surface-royal rounded-2xl shadow-xl overflow-hidden border border-[#7928FF]/20">
          {loadingTips ? (
            <div className="p-12 text-center text-[#968AAE] space-y-3">
              <div className="w-7 h-7 border-2 border-[#7928FF] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-medium">Loading verified tips...</p>
            </div>
          ) : filteredTips.length === 0 ? (
            <div className="p-12 text-center text-[#968AAE] space-y-3">
              <div className="w-12 h-12 bg-[#7928FF]/20 text-[#D49BFF] rounded-2xl flex items-center justify-center mx-auto border border-[#7928FF]/40">
                <Heart className="w-6 h-6" />
              </div>
              <h3 className="font-headline text-base font-bold text-white">
                {tips.length === 0 ? 'No tips yet' : 'No matching tips found'}
              </h3>
              <p className="text-xs text-[#968AAE] max-w-sm mx-auto">
                {tips.length === 0
                  ? 'Share your TipZeMe link or QR code to start receiving appreciation and good vibes from supporters.'
                  : 'Try adjusting your search terms or filters.'}
              </p>
              {tips.length === 0 && profile?.username && (
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="mt-2 btn-luxury-primary px-4 py-2 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Tip Page</span>
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#7928FF]/15">
              {filteredTips.map((tip, idx) => {
                const amountDollars = (tip.amountCents || 0) / 100;
                const platformFeeCents = typeof tip.platformFeeCents === 'number'
                  ? tip.platformFeeCents
                  : calculatePlatformFee(tip.amountCents || 0, 1, 5);
                const platformFeeDollars = platformFeeCents / 100;
                const stripeFeeDollars = (tip.stripeFeeCents || 0) / 100;
                const netDollars = typeof tip.netAmountCents === 'number'
                  ? tip.netAmountCents / 100
                  : Math.max(0, amountDollars - platformFeeDollars - stripeFeeDollars);

                const isVerifying = verifyingTipId === tip.id;

                return (
                  <div
                    key={tip.id || `tip-${idx}`}
                    className="p-4 sm:p-5 hover:bg-[#120A2B]/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white">
                          {tip.supporterName || 'Kind Supporter'}
                        </span>
                        <span className="text-[11px] text-[#968AAE]">
                          · {formatDate(tip.createdAt)}
                        </span>
                        {renderStatusBadge(tip)}
                      </div>

                      {tip.message && (
                        <div className="flex items-start gap-1.5 text-xs text-[#C9BFDF] bg-[#120A2B]/80 p-2.5 rounded-xl border border-[#7928FF]/20 max-w-lg">
                          <MessageSquare className="w-3.5 h-3.5 text-[#D49BFF] shrink-0 mt-0.5" />
                          <span className="italic leading-relaxed">“{tip.message}”</span>
                        </div>
                      )}

                      <div className="text-[11px] text-[#968AAE] flex items-center gap-2 flex-wrap">
                        <span>Gross: ${amountDollars.toFixed(2)}</span>
                        <span>·</span>
                        <span>Platform Fee: ${platformFeeDollars.toFixed(2)}</span>
                        {tip.stripeFeeCents ? (
                          <>
                            <span>·</span>
                            <span>Stripe Fee: ${stripeFeeDollars.toFixed(2)}</span>
                          </>
                        ) : null}
                        <span>·</span>
                        <span className="font-bold text-emerald-400">
                          Net: ${netDollars.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                      <div className="text-right">
                        <div className={`font-headline text-lg font-black tabular-nums ${
                          tip.status === 'succeeded'
                            ? 'text-[#D49BFF]'
                            : tip.status === 'pending'
                            ? 'text-amber-300'
                            : 'text-slate-400 line-through'
                        }`}>
                          +${amountDollars.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-[#968AAE]">
                          Stripe Direct Charge
                        </div>
                      </div>

                      {/* Authoritative verification trigger for non-succeeded tips */}
                      {tip.status !== 'succeeded' && (
                        <button
                          onClick={() => handleVerifyTip(tip.id)}
                          disabled={isVerifying}
                          title="Verify payment status with Stripe"
                          className="px-2.5 py-1 rounded-lg bg-[#120A2B] hover:bg-[#1B103B] text-[10px] font-bold text-[#D49BFF] border border-[#7928FF]/30 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-2.5 h-2.5 ${isVerifying ? 'animate-spin' : ''}`} />
                          <span>{isVerifying ? 'Verifying...' : 'Verify'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
