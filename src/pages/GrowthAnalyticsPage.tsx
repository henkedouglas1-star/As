import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Users,
  QrCode,
  Sparkles,
  Award,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Share2,
  DollarSign,
  Heart,
  ArrowLeft,
} from 'lucide-react';
import { BRAND_NAME } from '../lib/theme';

interface GrowthMetrics {
  totalProfiles: number;
  totalVisits: number;
  qrScans: number;
  referredSignups: number;
  activatedUsers: number;
  firstTips: number;
  firstTipConversionRate: number;
  kFactor: number;
  attributionSummary?: {
    qrScanShare: number;
    referredSignupShare: number;
  };
}

interface GrowthAnalyticsPageProps {
  onNavigate: (route: string) => void;
}

export default function GrowthAnalyticsPage({ onNavigate }: GrowthAnalyticsPageProps) {
  const [metrics, setMetrics] = useState<GrowthMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = () => {
    setLoading(true);
    fetch('/api/growth/metrics')
      .then((res) => res.json())
      .then((data) => {
        setMetrics(data);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Error fetching growth metrics:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#18181B] pb-20 font-sans selection:bg-[#7C3AED] selection:text-white">
      <div className="max-w-5xl mx-auto px-4 pt-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E4E4E7] mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('dashboard')}
              className="p-2 rounded-xl bg-white border border-[#E4E4E7] text-[#71717A] hover:text-[#18181B] hover:bg-[#F5F3FF]/50 transition cursor-pointer"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-[#18181B]">Growth & Virality Engine</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-[#F5F3FF] text-[#7C3AED] text-[10px] font-black uppercase tracking-wider border border-[#EDE9FE]">
                  Product-Led
                </span>
              </div>
              <p className="text-xs text-[#71717A] mt-1">
                Real-time organic loop attribution and K-factor metrics.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchMetrics}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F5F3FF]/50 text-xs font-bold text-[#18181B] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 border border-[#E4E4E7]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#7C3AED]' : 'text-[#7C3AED]'}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#5B21B6] text-white text-xs font-black transition cursor-pointer shadow-sm"
            >
              My Dashboard
            </button>
          </div>
        </div>

        {/* Highlight Card: K-Factor & Virality */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#F5F3FF]/60 border border-[#E4E4E7] shadow-md mb-8 relative overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10">
            <div>
              <span className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
                Virality Coefficient (K-Factor)
              </span>
              <div className="text-4xl sm:text-5xl font-black text-[#7C3AED] mt-1 font-mono">
                {metrics ? `${metrics.kFactor}` : '—'}
              </div>
              <p className="text-xs text-[#71717A] mt-1.5 leading-relaxed">
                Activated referrals per active tipping user. Every creator's public page and post-tip screen invites new creators to claim their link.
              </p>
            </div>

            <div>
              <span className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
                First-Tip Conversion Rate
              </span>
              <div className="text-4xl sm:text-5xl font-black text-[#18181B] mt-1 font-mono">
                {metrics ? `${metrics.firstTipConversionRate}%` : '—'}
              </div>
              <p className="text-xs text-[#71717A] mt-1.5 leading-relaxed">
                Percentage of creators with claimed profiles who have received at least one verified tip from supporters.
              </p>
            </div>

            <div>
              <span className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
                QR Traffic Share
              </span>
              <div className="text-4xl sm:text-5xl font-black text-[#18181B] mt-1 font-mono">
                {metrics?.attributionSummary ? `${metrics.attributionSummary.qrScanShare}%` : '—'}
              </div>
              <p className="text-xs text-[#71717A] mt-1.5 leading-relaxed">
                Portion of traffic originating directly from physical table tent signs, badges, and downloaded QR cards.
              </p>
            </div>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-5 rounded-3xl bg-white border border-[#E4E4E7] shadow-sm">
            <div className="flex items-center justify-between text-[#71717A] mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Active Profiles</span>
              <Users className="w-4 h-4 text-[#7C3AED]" />
            </div>
            <div className="text-3xl font-black text-[#18181B] font-mono">
              {metrics ? metrics.totalProfiles : '—'}
            </div>
            <p className="text-[11px] text-[#71717A] mt-1">Claimed unique personal tipping URLs</p>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-[#E4E4E7] shadow-sm">
            <div className="flex items-center justify-between text-[#71717A] mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Profile Visits</span>
              <TrendingUp className="w-4 h-4 text-[#7C3AED]" />
            </div>
            <div className="text-3xl font-black text-[#18181B] font-mono">
              {metrics ? metrics.totalVisits : '—'}
            </div>
            <p className="text-[11px] text-[#71717A] mt-1">Deduplicated visitor sessions</p>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-[#E4E4E7] shadow-sm">
            <div className="flex items-center justify-between text-[#71717A] mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">QR Code Traffic</span>
              <QrCode className="w-4 h-4 text-[#7C3AED]" />
            </div>
            <div className="text-3xl font-black text-[#18181B] font-mono">
              {metrics ? metrics.qrScans : '—'}
            </div>
            <p className="text-[11px] text-[#71717A] mt-1">Direct camera scans from cards/signs</p>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-[#E4E4E7] shadow-sm">
            <div className="flex items-center justify-between text-[#71717A] mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Referred Signups</span>
              <Share2 className="w-4 h-4 text-[#7C3AED]" />
            </div>
            <div className="text-3xl font-black text-[#7C3AED] font-mono">
              {metrics ? metrics.referredSignups : '—'}
            </div>
            <p className="text-[11px] text-[#71717A] mt-1">Joined via "Powered by TipZeMe" loops</p>
          </div>
        </div>

        {/* Growth Loop Mechanics Card */}
        <div className="p-6 rounded-3xl bg-white border border-[#E4E4E7] shadow-sm space-y-4">
          <h3 className="text-sm font-black text-[#18181B] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#7C3AED]" />
            <span>Active Product-Led Loops</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-[#F5F3FF]/50 border border-[#E4E4E7]">
              <span className="text-xs font-black text-[#7C3AED]">1. Branded Profile Kicker</span>
              <p className="text-xs text-[#71717A] mt-1.5 leading-relaxed">
                Every creator's public profile displays an elegant “Powered by TipZeMe • Claim your own tipping link” badge carrying their referral attribution.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F5F3FF]/50 border border-[#E4E4E7]">
              <span className="text-xs font-black text-[#7C3AED]">2. Viral QR Cards & Signs</span>
              <p className="text-xs text-[#71717A] mt-1.5 leading-relaxed">
                Creators print physical table tents and share story cards featuring their avatar, name, and QR code, exposing TipZeMe to real patrons every day.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F5F3FF]/50 border border-[#E4E4E7]">
              <span className="text-xs font-black text-[#7C3AED]">3. Post-Tip Discovery</span>
              <p className="text-xs text-[#71717A] mt-1.5 leading-relaxed">
                After a verified tip succeeds, the supporter receives a celebratory thank-you receipt with an invite to create their own tipping link in 60s.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
