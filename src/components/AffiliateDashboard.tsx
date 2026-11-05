import { authenticatedFetch } from '../lib/authenticatedFetch';
import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Share2,
  Users,
  ArrowUpRight,
  Award,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  HelpCircle,
  Clock,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { AFFILIATE_TIERS, AffiliateProfile, calculateAffiliateTier } from '../types/affiliate';
import { AffiliateOnboardingModal } from './AffiliateOnboardingModal';
import { getCanonicalReferralUrl } from '../lib/urlUtils';


interface AffiliateDashboardProps {
  currentUser: { uid: string; email?: string | null; displayName?: string | null } | null;
  onNavigate: (route: string) => void;
}

export const AffiliateDashboard: React.FC<AffiliateDashboardProps> = ({ currentUser, onNavigate }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [profile, setProfile] = useState<AffiliateProfile | null>(null);
  const [stats, setStats] = useState<{ pendingCents: number; availableCents: number; paidCents: number; lifetimeCents: number }>({
    pendingCents: 0,
    availableCents: 0,
    paidCents: 0,
    lifetimeCents: 0,
  });
  const [referrals, setReferrals] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals' | 'earnings' | 'rules'>('overview');

  useEffect(() => {
    async function loadAffiliateData() {
      if (!currentUser?.uid) {
        setLoading(false);
        return;
      }

      try {
        const res = await authenticatedFetch(`/api/affiliate/profile?userId=${currentUser.uid}`);
        const data = await res.json();
        if (data.enrolled) {
          setProfile(data.profile);
          setStats(data.stats || stats);
          setReferrals(data.referrals || []);
          setLedger(data.ledger || []);
        }
      } catch (err) {
        console.error('Failed to load partner profile:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAffiliateData();
  }, [currentUser]);

  const referralUrl = profile ? getCanonicalReferralUrl(profile.partnerCode) : '';

  const handleCopy = () => {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    if (!referralUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join TipZeMe Partner Program',
          text: 'Join TipZeMe and start receiving tips with zero platform friction!',
          url: referralUrl,
        });
      } catch (err) {
        console.warn('Share cancelled or failed:', err);
      }
    } else {
      handleCopy();
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#07050C] text-white">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If not enrolled
  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-16 text-white font-sans">
        <div className="relative luxe-glass-card rounded-2xl p-6 md:p-8 shadow-xl overflow-hidden text-center border border-white/[0.08]">
          <div className="w-12 h-12 bg-amber-400/15 border border-amber-400/30 text-amber-300 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Award className="w-6 h-6 text-amber-400" />
          </div>

          <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-white">Earn by Sharing TipZeMe</h2>
          <p className="text-slate-300 mt-2 text-xs md:text-sm max-w-md mx-auto leading-relaxed">
            Invite creators to TipZeMe and earn recurring commissions on platform fees for 12 months per verified referral.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 my-7 text-left">
            <div className="luxe-glass-card p-4 rounded-xl border border-white/[0.08]">
              <span className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider">Partner Tier</span>
              <h4 className="font-display text-lg font-bold mt-1 text-white">20% Rate</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">0–9 activated referrals</p>
            </div>
            <div className="luxe-glass-card p-4 rounded-xl border border-amber-400/25">
              <span className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider">Pro Partner</span>
              <h4 className="font-display text-lg font-bold mt-1 text-amber-300">35% Rate</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">10–49 activated referrals</p>
            </div>
            <div className="luxe-glass-card p-4 rounded-xl border border-emerald-500/25">
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Elite Partner</span>
              <h4 className="font-display text-lg font-bold mt-1 text-emerald-400">50% Rate</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">50+ activated referrals</p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full md:w-auto px-7 py-3.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition shadow-sm cursor-pointer"
          >
            Join Partner Program
          </button>
        </div>

        <AffiliateOnboardingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          currentUser={currentUser}
          onEnrolled={(newProfile) => setProfile(newProfile)}
        />
      </div>
    );
  }

  const currentTierConfig = AFFILIATE_TIERS[profile.tier] || AFFILIATE_TIERS.partner;
  const activatedCount = profile.activatedReferralsCount || 0;

  // Calculate progress toward next tier
  let nextTierName = 'Pro Partner';
  let nextTierNeeded = 10;
  let progressPercent = Math.min(100, Math.round((activatedCount / 10) * 100));

  if (profile.tier === 'pro') {
    nextTierName = 'Elite Partner';
    nextTierNeeded = 50;
    progressPercent = Math.min(100, Math.round(((activatedCount - 10) / 40) * 100));
  } else if (profile.tier === 'elite') {
    nextTierName = 'Elite Tier Reached';
    nextTierNeeded = 50;
    progressPercent = 100;
  }

  const remainingForNext = Math.max(0, nextTierNeeded - activatedCount);
  const availableCents = stats.availableCents;
  const payoutMinCents = 1000; // $10.00
  const payoutProgressPercent = Math.min(100, Math.round((availableCents / payoutMinCents) * 100));

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-12 text-white space-y-6 font-sans">
      {/* Top Banner */}
      <div className="relative luxe-glass-card rounded-[32px] p-6 md:p-8 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30 uppercase tracking-wider">
                {currentTierConfig.label} ({Math.round(profile.commissionRate * 100)}% Commission)
              </span>
              <span className="text-xs text-slate-400 font-mono">@{profile.partnerCode}</span>
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-white">Your Partner Dashboard</h1>
            <p className="text-slate-300 text-xs md:text-sm mt-1">
              Share your link, track verified activations, and earn recurring platform commissions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="luxe-pill rounded-2xl px-4 py-3 text-center">
              <span className="text-xs text-slate-400 block">Activated Referrals</span>
              <span className="font-display text-xl font-bold text-white tabular-nums">{activatedCount}</span>
            </div>
          </div>
        </div>

        {/* Tier Progress Bar */}
        <div className="mt-6 pt-6 border-t border-purple-900/30 space-y-2">
          <div className="flex justify-between text-xs text-slate-300">
            <span>{profile.tier === 'elite' ? 'Elite Tier Reached (Top 50%)' : `Progress to ${nextTierName}`}</span>
            <span>{profile.tier === 'elite' ? 'Maximum Tier' : `${remainingForNext} more activation${remainingForNext === 1 ? '' : 's'} needed`}</span>
          </div>
          <div className="w-full h-2.5 bg-[#07050C] rounded-full overflow-hidden border border-purple-800/40">
            <div
              className="h-full bg-gradient-to-r from-violet-600 via-fuchsia-400 to-amber-300 transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Referral Link Card */}
        <div className="mt-6 pt-6 border-t border-purple-900/30 flex flex-col md:flex-row items-center gap-3">
          <div className="w-full bg-[#07050C] border border-purple-800/40 rounded-2xl px-4 py-3 font-mono text-xs md:text-sm text-violet-300 truncate select-all">
            {referralUrl}
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={handleCopy}
              className="luxe-button-secondary rounded-xl flex-1 md:flex-initial px-5 py-3 text-xs font-semibold text-slate-200 hover:text-white cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 mr-1 text-emerald-400" /> : <Copy className="w-4 h-4 mr-1 text-violet-300" />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
            <button
              onClick={handleShare}
              className="luxe-button-primary rounded-xl flex-1 md:flex-initial px-5 py-3 text-xs font-bold text-white cursor-pointer shadow-lg"
            >
              <Share2 className="w-4 h-4 mr-1 text-violet-200" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#7928FF]/20 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'overview' ? 'border-[#E8C9A0] text-white font-bold' : 'border-transparent text-[#968AAE] hover:text-white'
          }`}
        >
          Overview &amp; Payouts
        </button>
        <button
          onClick={() => setActiveTab('referrals')}
          className={`pb-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'referrals' ? 'border-[#E8C9A0] text-white font-bold' : 'border-transparent text-[#968AAE] hover:text-white'
          }`}
        >
          Referred Creators ({referrals.length})
        </button>
        <button
          onClick={() => setActiveTab('earnings')}
          className={`pb-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'earnings' ? 'border-[#E8C9A0] text-white font-bold' : 'border-transparent text-[#968AAE] hover:text-white'
          }`}
        >
          Commission Ledger ({ledger.length})
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'rules' ? 'border-amber-300 text-white font-bold' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          How It Works
        </button>
      </div>

      {/* Tab 1: Overview & Payout Readiness */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Earnings Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="luxe-glass-card rounded-[28px] p-6 shadow-xl">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending (Hold)</span>
              <div className="font-display text-2xl font-bold mt-2 text-white tabular-nums">
                ${(stats.pendingCents / 100).toFixed(2)}
              </div>
              <p className="text-xs text-slate-400 mt-1">30-day security hold</p>
            </div>

            <div className="luxe-glass-card rounded-[28px] p-6 border border-emerald-500/30 shadow-xl">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Available Balance</span>
              <div className="font-display text-2xl font-bold mt-2 text-emerald-400 tabular-nums">
                ${(stats.availableCents / 100).toFixed(2)}
              </div>
              <p className="text-xs text-slate-400 mt-1">Ready for monthly payout</p>
            </div>

            <div className="luxe-glass-card rounded-[28px] p-6 shadow-xl">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lifetime Paid</span>
              <div className="font-display text-2xl font-bold mt-2 text-white tabular-nums">
                ${(stats.paidCents / 100).toFixed(2)}
              </div>
              <p className="text-xs text-slate-400 mt-1">Successfully disbursed</p>
            </div>

            <div className="luxe-glass-card rounded-[28px] p-6 border border-amber-400/30 shadow-xl">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Lifetime Earnings</span>
              <div className="font-display text-2xl font-bold mt-2 text-amber-300 tabular-nums">
                ${(stats.lifetimeCents / 100).toFixed(2)}
              </div>
              <p className="text-xs text-slate-400 mt-1">Total platform share</p>
            </div>
          </div>

          {/* Payout Readiness Interface */}
          <div className="luxe-glass-card rounded-[28px] p-6 md:p-8 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-white">Payout Readiness</h3>
                  <p className="text-xs text-slate-300">Threshold: $10.00 minimum available balance</p>
                </div>
              </div>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Payouts Disabled
              </span>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Progress to $10.00 Minimum</span>
                <span className="font-mono">${(availableCents / 100).toFixed(2)} / $10.00</span>
              </div>
              <div className="w-full h-2.5 bg-[#07050C] rounded-full overflow-hidden border border-purple-800/40">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
                  style={{ width: `${payoutProgressPercent}%` }}
                />
              </div>
            </div>

            <div className="bg-[#0B0616]/90 border border-purple-900/30 p-4 rounded-2xl flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 space-y-1">
                <p className="font-semibold text-white">Affiliate payouts are not yet available</p>
                <p className="text-slate-400 leading-relaxed">
                  Affiliate commission accounting and verification are fully active in preview mode. Live Stripe Connect partner disbursements will be enabled in a future release.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Referred Creators */}
      {activeTab === 'referrals' && (
        <div className="surface-royal rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#7928FF]/15 text-[#D49BFF]">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-headline font-bold text-lg text-white">Referred Creators</h3>
                <p className="text-xs text-[#C9BFDF]">Verified activations count toward your tier progression</p>
              </div>
            </div>
            <span className="text-xs font-mono bg-[#120A2B] border border-[#7928FF]/25 px-3 py-1.5 rounded-full text-[#D49BFF]">
              {referrals.length} Total
            </span>
          </div>

          {referrals.length === 0 ? (
            <div className="text-center py-12 bg-[#120A2B]/60 border border-[#7928FF]/20 rounded-2xl">
              <Users className="w-10 h-10 text-[#968AAE] mx-auto mb-3" />
              <h4 className="font-headline font-semibold text-white">No referrals yet</h4>
              <p className="text-xs text-[#968AAE] mt-1 max-w-sm mx-auto">
                Share your link to start inviting creators. Referrals become activated once they complete onboarding and receive their first verified tip.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map((ref, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-[#120A2B]/70 border border-[#7928FF]/20">
                  <div>
                    <span className="text-xs font-mono text-[#D49BFF]">Creator ID: {ref.referredUserId.substring(0, 10)}...</span>
                    <div className="text-xs text-[#968AAE] mt-0.5">
                      Attributed: {new Date(ref.attributedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    ref.status === 'activated'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  }`}>
                    {ref.status === 'activated' ? 'Activated' : 'Pending First Tip'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Commission Ledger History */}
      {activeTab === 'earnings' && (
        <div className="surface-royal rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-headline font-bold text-lg text-white">Commission Ledger</h3>
                <p className="text-xs text-[#C9BFDF]">Append-only immutable record of earned commissions</p>
              </div>
            </div>
            <span className="text-xs font-mono bg-[#120A2B] border border-[#7928FF]/25 px-3 py-1.5 rounded-full text-[#D49BFF]">
              {ledger.length} Entries
            </span>
          </div>

          {ledger.length === 0 ? (
            <div className="text-center py-12 bg-[#120A2B]/60 border border-[#7928FF]/20 rounded-2xl">
              <TrendingUp className="w-10 h-10 text-[#968AAE] mx-auto mb-3" />
              <h4 className="font-headline font-semibold text-white">No commission entries yet</h4>
              <p className="text-xs text-[#968AAE] mt-1 max-w-sm mx-auto">
                Commissions will appear here automatically when your referred creators receive verified tips.
              </p>
            </div>
          ) : (
            <div className="space-y-3 overflow-x-auto">
              {ledger.map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-[#120A2B]/70 border border-[#7928FF]/20 min-w-[500px]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-headline font-black text-white text-sm tabular-nums">+${(entry.commissionCents / 100).toFixed(2)}</span>
                      <span className="text-xs text-[#C9BFDF]">({Math.round(entry.tierRate * 100)}% tier rate)</span>
                    </div>
                    <div className="text-xs text-[#968AAE] font-mono">
                      Tip: {entry.sourceTipId} · {new Date(entry.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    entry.state === 'available'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : entry.state === 'pending'
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : entry.state === 'reversed'
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'bg-[#1B103B] text-[#C9BFDF]'
                  }`}>
                    {entry.state.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: How It Works / Rules */}
      {activeTab === 'rules' && (
        <div className="surface-royal rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#E8C9A0]/15 text-[#E8C9A0]">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-lg text-white">How the Partner Program Works</h3>
              <p className="text-xs text-[#C9BFDF]">Transparent rules and accounting guidelines</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#C9BFDF]">
            <div className="bg-[#120A2B]/80 border border-[#7928FF]/20 p-5 rounded-2xl space-y-2">
              <h4 className="font-headline font-bold text-white text-sm">1. 12-Month Attribution Window</h4>
              <p className="text-[#968AAE] leading-relaxed">
                When a creator signs up using your unique referral link, they are securely attributed to you for 12 months.
              </p>
            </div>

            <div className="bg-[#120A2B]/80 border border-[#7928FF]/20 p-5 rounded-2xl space-y-2">
              <h4 className="font-headline font-bold text-white text-sm">2. Verified Activation</h4>
              <p className="text-[#968AAE] leading-relaxed">
                Referrals become activated once they complete Stripe Connect onboarding and receive their first verified successful tip.
              </p>
            </div>

            <div className="bg-[#120A2B]/80 border border-[#7928FF]/20 p-5 rounded-2xl space-y-2">
              <h4 className="font-headline font-bold text-white text-sm">3. 30-Day Commission Hold</h4>
              <p className="text-[#968AAE] leading-relaxed">
                All earned commissions undergo a 30-day security hold period to account for potential refunds, disputes, or chargebacks.
              </p>
            </div>

            <div className="bg-[#120A2B]/80 border border-[#7928FF]/20 p-5 rounded-2xl space-y-2">
              <h4 className="font-headline font-bold text-white text-sm">4. Automatic Tier Upgrades</h4>
              <p className="text-[#968AAE] leading-relaxed">
                As your activated referrals grow, your tier automatically upgrades (Partner 20% → Pro 35% → Elite 50%).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
