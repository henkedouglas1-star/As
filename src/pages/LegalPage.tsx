import React from 'react';
import { ShieldCheck, ArrowLeft, Heart } from 'lucide-react';

interface LegalPageProps {
  onNavigate: (route: string) => void;
}

export default function LegalPage({ onNavigate }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#18181B] pb-20 font-sans">
      <main className="max-w-3xl mx-auto px-4 pt-10">
        <button
          onClick={() => onNavigate('landing')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#71717A] hover:text-[#18181B] mb-6 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#7C3AED]" />
          <span>Back to TipZeMe</span>
        </button>

        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#E4E4E7] shadow-sm space-y-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F3FF] text-[#7C3AED] text-xs font-bold mb-3 border border-[#EDE9FE]">
              <ShieldCheck className="w-4 h-4 text-[#7C3AED]" />
              <span>Trust, Safety & Legal Terms</span>
            </div>
            <h1 className="text-3xl font-black text-[#18181B]">Terms of Service & Policies</h1>
            <p className="text-xs text-[#71717A] mt-1">Last revised: October 2026</p>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-extrabold text-[#18181B]">1. Acceptable Use Policy</h2>
            <p className="text-xs text-[#71717A] leading-relaxed">
              TipZeMe enables creators, performers, artists, writers, service workers, and developers
              to receive voluntary financial appreciation for legitimate content, artistic works, or
              services provided. TipZeMe is not a peer-to-peer personal money transmitter, remittance
              service, or anonymous fundraising platform for prohibited items.
            </p>
            <p className="text-xs text-[#71717A] leading-relaxed">
              Users must not use TipZeMe for illegal activities, harassment, money laundering, hate
              speech, or deceptive impersonation. Any account violating these terms is subject to
              immediate suspension and reporting.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-extrabold text-[#18181B]">2. Payment Processing & Stripe Connect</h2>
            <p className="text-xs text-[#71717A] leading-relaxed">
              Payments are processed using Stripe Connect. By connecting your payout account, creators
              agree to the Stripe Connected Account Agreement. Funds are transferred directly to the
              creator’s connected bank account. TipZeMe does not hold user funds in custom custody.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-extrabold text-[#18181B]">3. Privacy Policy</h2>
            <p className="text-xs text-[#71717A] leading-relaxed">
              We respect your privacy. Supporters can tip without creating an account. Supporter names
              and messages are strictly delivered to the recipient creator and are not indexed or
              displayed publicly by default. We do not sell user data to third parties.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-extrabold text-[#18181B]">4. Support & Contact</h2>
            <p className="text-xs text-[#71717A] leading-relaxed">
              Need assistance or want to report an issue? Contact our trust and safety team at{' '}
              <a href="mailto:support@tipzeme.com" className="text-[#7C3AED] underline font-semibold hover:text-[#5B21B6]">
                support@tipzeme.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
