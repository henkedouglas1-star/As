import React, { useState } from 'react';
import { CheckCircle2, Sparkles, Share2, ArrowRight, Check, Copy, Heart } from 'lucide-react';
import { BRAND_NAME } from '../lib/theme';
import { getCanonicalProfileUrl } from '../lib/urlUtils';

interface SuccessPageProps {
  creatorName: string;
  creatorHandle: string;
  amount: string;
  onNavigate: (route: string) => void;
}

export default function SuccessPage({
  creatorName,
  creatorHandle,
  amount,
  onNavigate,
}: SuccessPageProps) {
  const [copied, setCopied] = useState(false);

  const jarUrl = getCanonicalProfileUrl(creatorHandle);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Tip @${creatorHandle} on TipZeMe`,
          text: `I just sent good vibes and a tip to @${creatorHandle} on TipZeMe!`,
          url: jarUrl,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jarUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#18181B] flex items-center justify-center p-4 font-sans py-12 selection:bg-[#7C3AED] selection:text-white">
      <div className="max-w-md w-full bg-white border border-[#E4E4E7] rounded-3xl p-8 text-center shadow-lg relative overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Accent top bar */}
        <div className="absolute top-0 right-0 left-0 h-2 bg-[#7C3AED]" />

        <div className="w-16 h-16 bg-[#F5F3FF] text-[#7C3AED] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#EDE9FE]">
          <Heart className="w-8 h-8 fill-[#7C3AED]" />
        </div>

        <h1 className="text-2xl font-black text-[#18181B] tracking-tight">
          Your tip made someone’s day! 💜
        </h1>
        <p className="mt-2 text-[#71717A] text-sm leading-relaxed">
          Your tip of{' '}
          <span className="font-black text-[#7C3AED] text-base tabular-nums">${amount || '5.00'}</span> was
          sent to <span className="font-bold text-[#18181B]">@{creatorHandle}</span> ({creatorName}).
        </p>

        {/* Receipt Details Card */}
        <div className="mt-6 p-4 rounded-2xl bg-[#F5F3FF] border border-[#EDE9FE] text-left text-xs space-y-2">
          <div className="flex justify-between text-[#71717A]">
            <span>Recipient</span>
            <span className="font-mono text-[#18181B] font-bold">@{creatorHandle}</span>
          </div>
          <div className="flex justify-between text-[#71717A]">
            <span>Payment Status</span>
            <span className="font-bold text-[#16A34A] inline-flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Verified Paid
            </span>
          </div>
          <div className="flex justify-between text-[#71717A]">
            <span>Method</span>
            <span className="text-[#18181B]">Stripe Secure Checkout</span>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-[#E4E4E7] space-y-3">
          <button
            onClick={handleShare}
            className="w-full py-3.5 rounded-2xl bg-[#7C3AED] hover:bg-[#5B21B6] text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
          >
            {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? 'Link Copied to Clipboard!' : `Share @${creatorHandle}’s Tip Link`}</span>
          </button>

          <button
            onClick={() => onNavigate(`jar:${creatorHandle}`)}
            className="w-full py-3 rounded-2xl bg-[#F5F3FF] hover:bg-[#EDE9FE] text-[#7C3AED] text-xs font-bold transition cursor-pointer border border-[#EDE9FE]"
          >
            Return to @{creatorHandle}’s Tip Page
          </button>

          {/* Post-Tip Discovery: Viral Growth Invitation */}
          <div className="pt-3">
            <div className="p-4 rounded-2xl bg-[#F5F3FF] border border-[#EDE9FE] text-center space-y-2">
              <p className="text-xs font-bold text-[#18181B]">
                Loved supporting a creator? Turn your own craft into tips.
              </p>
              <button
                onClick={() => onNavigate(`onboarding?ref=${creatorHandle}`)}
                className="w-full py-3 rounded-xl bg-[#7C3AED] hover:bg-[#5B21B6] text-white text-xs font-black transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Claim Your Own Tipping Link</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
