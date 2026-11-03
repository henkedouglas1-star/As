import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  QrCode,
  Share2,
  ShieldCheck,
  CreditCard,
  Smartphone,
  TrendingUp,
  ExternalLink,
  Lock,
  Zap,
  CheckCircle2,
  DollarSign,
  Heart,
  BarChart3,
  Award,
} from 'lucide-react';
import { BRAND_NAME, TIP_TIERS } from '../lib/theme';
import { BRAND_DOMAIN } from '../lib/constants';
import { getCanonicalProfileUrl } from '../lib/urlUtils';
import Avatar from '../components/Avatar';
import BrandLogo from '../components/BrandLogo';
import QRCodeModal from '../components/QRCodeModal';


interface LandingPageProps {
  onNavigate: (route: string) => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const [demoAmount, setDemoAmount] = useState<number>(5);
  const [demoCopied, setDemoCopied] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [customNote, setCustomNote] = useState('Loved the acoustic set today!');
  const [selectedPersona, setSelectedPersona] = useState<'musician' | 'creator' | 'service'>('musician');

  const handleCopyDemo = () => {
    navigator.clipboard?.writeText?.(getCanonicalProfileUrl('alex'));
    setDemoCopied(true);
    setTimeout(() => setDemoCopied(false), 2200);
  };


  const personas = {
    musician: {
      name: 'Alex Morgan',
      handle: 'alex',
      tag: 'Acoustic Musician & Songwriter',
      bio: 'Creating original acoustic melodies, guitar tutorials, and intimate live sessions.',
      goal: 'Studio High-Res Mic',
      goalCurrent: 185,
      goalTarget: 250,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      note: 'Loved the acoustic cover tonight! Keep playing.',
      accent: '#8B5CF6',
    },
    creator: {
      name: 'Maya Chen',
      handle: 'maya',
      tag: 'Digital Artist & Streamer',
      bio: 'Drawing fantasy character art and sharing process breakdowns every Tuesday.',
      goal: 'Drawing Tablet Stylus',
      goalCurrent: 210,
      goalTarget: 300,
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
      note: 'Your color palette tips helped me so much!',
      accent: '#A855F7',
    },
    service: {
      name: 'Marcus Bell',
      handle: 'marcus',
      tag: 'Specialty Coffee Roaster',
      bio: 'Crafting small-batch single-origin brews and espresso brew guides for coffee nerds.',
      goal: 'Commercial Precision Grinder',
      goalCurrent: 420,
      goalTarget: 600,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      note: 'Best pour-over in the city. Thanks Marcus!',
      accent: '#7C3AED',
    },
  };

  const activePersona = personas[selectedPersona];

  return (
    <div className="min-h-screen bg-[#0A0912] text-white flex flex-col font-sans selection:bg-violet-600 selection:text-white relative overflow-hidden">
      {/* Subtle Top Radial Lighting - Restrained, Apple-style */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.14),transparent_70%)] pointer-events-none -z-10"
        aria-hidden="true"
      />

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 pt-10 sm:pt-16 pb-16 text-center relative z-10">
        {/* Unboxed Editorial Kicker */}
        <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 mb-4 tracking-wide uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
          <span>Direct Supporter Tipping</span>
          <span className="text-slate-600">·</span>
          <span className="text-violet-300 font-semibold">1% + 5¢ Transparent Fee</span>
          <span className="text-slate-600">·</span>
          <span>Zero Subscriptions</span>
        </div>

        {/* Master Headline in Clash Display */}
        <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white max-w-3xl mx-auto leading-[1.08]">
          Good Vibes.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-purple-200 to-indigo-200">
            Great Tips.
          </span>
        </h1>

        {/* Concise Supporting Description in Manrope */}
        <p className="mt-4 sm:mt-5 text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-sans">
          The simple, elegant way to get direct support for your craft, music, and ideas.
          Supporters tip in seconds with Apple Pay, Google Pay, or card — zero app download required.
        </p>

        {/* Clear, High-Conversion CTA Row */}
        <div className="mt-7 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto w-full">
          <button
            onClick={() => onNavigate('onboarding')}
            className="luxe-button-primary w-full sm:w-auto px-7 py-3.5 rounded-xl text-white font-semibold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <span>Create Your Tip Link</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button

            type="button"
            onClick={() => {
              const el = document.getElementById('how-it-works');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            className="luxe-button-secondary w-full sm:w-auto px-6 py-3.5 rounded-xl text-slate-200 hover:text-white font-medium text-xs sm:text-sm text-center cursor-pointer"
          >
            See How It Works
          </button>
        </div>

        {/* Reassurance Micro-Copy */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-slate-400 font-medium">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Free to set up in 60s
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Direct bank deposit via Stripe
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> No monthly subscription
          </span>
        </div>

        {/* ========================================================================= */}
        {/* REALISTIC FINTECH PRODUCT DEMONSTRATION SHOWCASE (APPLE WALLET / STRIPE)  */}
        {/* ========================================================================= */}
        <div id="interactive-demo" className="mt-12 sm:mt-16 max-w-5xl mx-auto text-left">
          {/* Persona Selector Tabs (Realistic Creator Examples) */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4 px-1">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              {(['musician', 'creator', 'service'] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedPersona(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer capitalize ${
                    selectedPersona === key
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {key === 'musician' ? 'Musician' : key === 'creator' ? 'Digital Artist' : 'Service & Barista'}
                </button>
              ))}
            </div>

            <div className="inline-flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Interactive Live Preview</span>
            </div>
          </div>

          {/* Dual-Device Split Layout: Supporter Tipping & Creator Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* DEVICE 1: THE SUPPORTER EXPERIENCE (Left 6 Cols) */}
            <div className="lg:col-span-6 luxe-glass-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden border border-white/[0.08]">
              <div>
                {/* Header Kicker */}
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Supporter Experience
                  </div>
                  <div className="text-[11px] text-violet-400 font-mono">
                    {BRAND_DOMAIN}/{activePersona.handle}
                  </div>
                </div>


                {/* Creator Header Profile */}
                <div className="mt-4 flex items-center gap-3">
                  <Avatar
                    url={activePersona.avatar}
                    name={activePersona.name}
                    size="md"
                    accentColor={activePersona.accent}
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-display text-base font-bold text-white">{activePersona.name}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">@{activePersona.handle}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{activePersona.tag}</p>
                  </div>
                </div>

                {/* Creator Bio Quote */}
                <p className="mt-3 text-xs text-slate-300 italic leading-relaxed">
                  "{activePersona.bio}"
                </p>

                {/* Support Goal Miniature Card */}
                <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-300">Goal: {activePersona.goal}</span>
                    <span className="text-violet-400 font-bold font-mono">
                      ${activePersona.goalCurrent} of ${activePersona.goalTarget}
                    </span>
                  </div>
                  <div className="w-full bg-white/[0.08] h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-violet-500 to-fuchsia-500 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (activePersona.goalCurrent / activePersona.goalTarget) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Interactive Tip Amount Selector */}
                <div className="mt-5">
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Select Tip Amount (Interactive)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {TIP_TIERS.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setDemoAmount(amount)}
                        className={`py-2 text-center text-xs font-bold rounded-xl transition cursor-pointer ${
                          demoAmount === amount
                            ? 'bg-violet-600 text-white font-extrabold shadow-sm border border-violet-400'
                            : 'bg-white/[0.04] text-slate-300 border border-white/[0.08] hover:border-white/[0.2]'
                        }`}
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                    <span>TipZeMe platform fee: 1% + 5¢</span>
                    <span className="text-slate-500">Standard processing applies</span>
                  </div>
                </div>

                {/* Supporter Note Field */}
                <div className="mt-3">
                  <input
                    type="text"
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="Leave a message of encouragement..."
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Checkout Action Button */}
              <div className="mt-5 pt-3 border-t border-white/[0.08]">
                <button
                  onClick={() => onNavigate(`jar:${activePersona.handle}`)}
                  className="w-full py-3 rounded-xl bg-white text-slate-950 hover:bg-slate-100 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-sm active:scale-[0.99]"
                >
                  <span>Tip ${demoAmount}.00 with Apple Pay or Card</span>
                  <ArrowRight className="w-4 h-4 text-slate-900" />
                </button>
                <div className="mt-2 flex items-center justify-center gap-3 text-[11px] text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Powered by Stripe Connect
                  </span>
                  <span>·</span>
                  <span>Direct to creator</span>
                </div>
              </div>
            </div>

            {/* DEVICE 2: THE CREATOR EXPERIENCE (Right 6 Cols) */}
            <div className="lg:col-span-6 luxe-glass-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden border border-white/[0.08]">
              <div>
                {/* Header Kicker */}
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Creator Dashboard
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Direct Payouts Active</span>
                  </div>
                </div>

                {/* Primary Balance Widget (Apple Wallet style) */}
                <div className="mt-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-slate-400">Total Tips Received</span>
                      <div className="font-display text-3xl font-bold text-white mt-1">
                        $247.00
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">
                        +18% this month
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-white/[0.06]">
                    <div>
                      <span className="text-[11px] text-slate-400">This Month</span>
                      <div className="font-display text-base font-semibold text-white mt-0.5">$124.00</div>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400">All Time</span>
                      <div className="font-display text-base font-semibold text-white mt-0.5">$1,382.00</div>
                    </div>
                  </div>
                </div>

                {/* Real-World Supporter Activity Stream */}
                <div className="mt-4">
                  <div className="text-xs font-semibold text-slate-300 mb-2">Recent Tips Feed</div>
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-white">Sarah M. tipped $10.00</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">"{activePersona.note}"</div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">4m ago</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-white">Anonymous tipped $5.00</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">"Thanks for always sharing good energy!"</div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">42m ago</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Creator Sharing & Management Bar */}
              <div className="mt-5 pt-3 border-t border-white/[0.08]">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handleCopyDemo}
                    className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    {demoCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{demoCopied ? 'Copied' : 'Copy Link'}</span>
                  </button>

                  <button
                    onClick={() => setShowQRModal(true)}
                    className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 text-slate-400" />
                    <span>QR Code</span>
                  </button>

                  <button
                    onClick={() => onNavigate('affiliate')}
                    className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-amber-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>Partner</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Credibility Strip (Stripe & Apple Standards) */}
      <section className="border-y border-white/[0.08] bg-white/[0.015] py-10 relative z-10">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-left">
          <div className="space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-violet-950/40 border border-violet-500/25 flex items-center justify-center text-violet-400">
              <CreditCard className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Stripe Direct Transfers</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Standard bank deposits straight to your checking account through Stripe Connect.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/40 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">1% + 5¢ Platform Fee</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Transparent, flat fees. Zero monthly subscription or hidden maintenance charges.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-950/40 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Frictionless Mobile Pay</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Supporters tip instantly using Apple Pay, Google Pay, or debit card in seconds.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-fuchsia-950/40 border border-fuchsia-500/25 flex items-center justify-center text-fuchsia-400">
              <QrCode className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Printable QR Displays</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ready-to-print signs and badges for live gigs, coffee counters, and stream screens.
            </p>
          </div>
        </div>
      </section>

      {/* How It Actually Works: 3 Functional Steps */}
      <section id="how-it-works" className="scroll-mt-24 max-w-5xl mx-auto px-4 py-16 sm:py-20 text-center relative z-10">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-xs font-semibold uppercase tracking-wider text-violet-400">
            Effortless Workflow
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight mt-2">
            How People Send & Receive Tips
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            No complicated apps. No merchant terminals. Just a fast, trusted link.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="luxe-glass-card p-6 rounded-2xl relative space-y-3 border border-white/[0.08]">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 font-display font-bold flex items-center justify-center text-sm">
              1
            </div>
            <h3 className="font-display text-base font-bold text-white">Claim your link in 60s</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Choose your personal URL <code className="text-violet-300 font-mono">{BRAND_DOMAIN}/yourname</code>, upload a photo, and set an optional support goal.
            </p>
          </div>

          <div className="luxe-glass-card p-6 rounded-2xl relative space-y-3 border border-white/[0.08]">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 font-display font-bold flex items-center justify-center text-sm">
              2
            </div>
            <h3 className="font-display text-base font-bold text-white">Share your link or QR</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Place it in your Instagram or TikTok bio, video descriptions, or download the printable QR sign for physical tables and tip jars.
            </p>
          </div>

          <div className="luxe-glass-card p-6 rounded-2xl relative space-y-3 border border-white/[0.08]">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 font-display font-bold flex items-center justify-center text-sm">
              3
            </div>
            <h3 className="font-display text-base font-bold text-white">Funds go straight to your bank</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Supporters tap and send with Apple Pay or Card. Funds transfer seamlessly into your connected checking account via Stripe.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom Conversion CTA Container */}
      <section className="max-w-4xl mx-auto px-4 pb-20 text-center relative z-10">
        <div className="p-8 sm:p-12 rounded-3xl luxe-glass-card relative overflow-hidden border border-white/[0.08]">
          <h2 className="font-display text-2xl sm:text-4xl font-bold text-white tracking-tight">
            Ready to claim your TipZeMe link?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-md mx-auto">
            Join musicians, creators, baristas, and indie artists receiving direct appreciation today.
          </p>

          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onNavigate('onboarding')}
              className="luxe-button-primary w-full sm:w-auto px-7 py-3.5 rounded-xl text-sm font-semibold text-white cursor-pointer shadow-md"
            >
              Create Your Tip Link
            </button>
            <button
              onClick={() => onNavigate('jar:alex')}
              className="luxe-button-secondary w-full sm:w-auto px-6 py-3.5 rounded-xl text-slate-200 hover:text-white text-sm font-medium cursor-pointer"
            >
              Preview Sample Creator Page
            </button>
          </div>
        </div>
      </section>

      {/* Clean Footer */}
      <footer className="border-t border-white/[0.08] py-8 px-4 text-xs text-slate-500 relative z-10 bg-[#0A0912]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <BrandLogo size="sm" />
          <div>© {new Date().getFullYear()} {BRAND_NAME}. All rights reserved. Powered by Stripe Connect.</div>
          <div className="flex items-center gap-5 text-slate-400">
            <button onClick={() => onNavigate('legal')} className="hover:text-white transition cursor-pointer">Terms & Privacy</button>
            <button onClick={() => onNavigate('signin')} className="hover:text-white transition cursor-pointer">Creator Login</button>
          </div>
        </div>
      </footer>

      {/* QR Code Modal for Interactive Preview */}
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        url={getCanonicalProfileUrl(activePersona.handle)}
        username={activePersona.handle}
        displayName={activePersona.name}
        photoUrl={activePersona.avatar}
        accentColor={activePersona.accent}
      />
    </div>
  );
}

