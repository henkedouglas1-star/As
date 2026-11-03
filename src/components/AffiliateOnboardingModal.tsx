import React, { useState } from 'react';
import { Sparkles, CheckCircle2, ArrowRight, Share2, DollarSign, ShieldCheck } from 'lucide-react';
import { BRAND_DOMAIN } from '../lib/constants';


interface AffiliateOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { uid: string; email?: string | null; displayName?: string | null } | null;
  onEnrolled: (profile: any) => void;
}

export const AffiliateOnboardingModal: React.FC<AffiliateOnboardingModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onEnrolled,
}) => {
  const [step, setStep] = useState<number>(1);
  const [customCode, setCustomCode] = useState<string>('');
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEnroll = async () => {
    if (!currentUser) return;
    if (!acceptedTerms) {
      setError('Please accept the Partner Program terms to continue.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/affiliate/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          customCode: customCode.trim() || undefined,
          termsVersion: 'v1.0',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to enroll');
      }

      onEnrolled(data.profile);
      setStep(4); // Success step
    } catch (err: any) {
      setError(err.message || 'Failed to join partner program');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#141416] border border-[#2a2a2e] rounded-3xl p-6 md:p-8 text-white shadow-2xl overflow-hidden">
        {/* Background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#9333EA]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#10B981]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Step Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#9333EA] to-[#C084FC] flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">TipZeMe Partner Program</h3>
              <p className="text-xs text-zinc-400">Earn up to 50% commission on platform fees</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-zinc-800/50 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Progress Bar */}
        {step < 4 && (
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  step >= s ? 'bg-gradient-to-r from-[#9333EA] to-[#C084FC]' : 'bg-zinc-800'
                }`}
              />
            ))}
          </div>
        )}

        {/* Step 1: Overview */}
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
                <div className="p-2.5 rounded-xl bg-[#9333EA]/10 text-[#C084FC] mt-0.5">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">1. Share Your Link</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Invite creators to TipZeMe using your unique partner referral link.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
                <div className="p-2.5 rounded-xl bg-[#10B981]/10 text-[#10B981] mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">2. Creators Get Activated</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    When your referred creator completes onboarding and receives their first verified tip, they count toward your tier.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 mt-0.5">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">3. Earn Recurring Commissions</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Earn 20% to 50% of TipZeMe platform fees on every tip for 12 months per referral.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#9333EA] to-[#C084FC] text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/25"
            >
              Continue to Setup <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Choose Partner Code */}
        {step === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Choose Your Custom Referral Code
              </label>
              <div className="flex items-center rounded-2xl bg-zinc-900 border border-zinc-700/80 focus-within:border-[#9333EA] overflow-hidden">
                <span className="px-3.5 py-3 text-zinc-400 font-mono text-xs sm:text-sm bg-zinc-800/60 border-r border-zinc-700/60 select-none shrink-0">
                  {BRAND_DOMAIN}/ref/
                </span>
                <input
                  type="text"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder={currentUser?.displayName?.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'yourname'}
                  className="flex-1 min-w-0 bg-transparent px-3 py-3 text-white placeholder-zinc-600 focus:outline-none font-mono text-sm"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Letters, numbers, and underscores only. This will form your permanent referral URL.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="w-1/3 py-3 rounded-2xl bg-zinc-800 text-zinc-300 font-semibold hover:bg-zinc-700 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="w-2/3 py-3 rounded-2xl bg-gradient-to-r from-[#9333EA] to-[#C084FC] text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/25"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Terms & Agreement */}
        {step === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 space-y-3 max-h-48 overflow-y-auto">
              <h5 className="font-semibold text-white">TipZeMe Partner Program Terms (v1.0)</h5>
              <p>
                By joining the TipZeMe Partner Program, you agree to promote TipZeMe fairly and transparently. Self-referrals, fake accounts, and fraudulent activity will result in immediate disqualification and commission forfeiture.
              </p>
              <p>
                Commissions accrue from net positive platform contributions and are subject to a 30-day security hold before becoming eligible for payout.
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 rounded border-zinc-700 bg-zinc-900 text-[#9333EA] focus:ring-[#9333EA]"
              />
              <span className="text-xs text-zinc-300">
                I accept the TipZeMe Partner Program Terms and confirm I am at least 18 years old.
              </span>
            </label>

            {error && <p className="text-xs text-rose-400">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="w-1/3 py-3 rounded-2xl bg-zinc-800 text-zinc-300 font-semibold hover:bg-zinc-700 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleEnroll}
                disabled={loading || !acceptedTerms}
                className="w-2/3 py-3 rounded-2xl bg-gradient-to-r from-[#9333EA] to-[#C084FC] text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/25 disabled:opacity-50"
              >
                {loading ? 'Joining...' : 'Join Partner Program'} <ShieldCheck className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="text-center space-y-6 py-4 animate-fadeIn">
            <div className="w-16 h-16 bg-[#10B981]/20 text-[#10B981] rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold">You're a TipZeMe Partner!</h4>
              <p className="text-sm text-zinc-400 mt-2">
                Your partner account is active and ready. Start sharing your link to earn recurring commissions.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#9333EA] to-[#C084FC] text-white font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/25"
            >
              Open Partner Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
