import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Printer, X, Heart } from 'lucide-react';
import Avatar from './Avatar';
import { BRAND_DOMAIN } from '../lib/constants';
import { formatDisplayProfileUrl } from '../lib/urlUtils';

interface PrintableSignModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorName: string;
  username: string;
  supportMessage: string;
  tipJarUrl: string;
  photoUrl?: string | null;
  accentColor?: string;
}


export default function PrintableSignModal({
  isOpen,
  onClose,
  creatorName,
  username,
  supportMessage,
  tipJarUrl,
  photoUrl,
  accentColor = '#7C3AED',
}: PrintableSignModalProps) {
  const [qrUri, setQrUri] = useState<string>('');

  const qrUrl = tipJarUrl.includes('?') ? `${tipJarUrl}&source=qr` : `${tipJarUrl}?source=qr`;

  useEffect(() => {
    if (!isOpen || !qrUrl) return;
    QRCode.toDataURL(qrUrl, {
      margin: 1,
      width: 480,
      color: { dark: '#18181B', light: '#FFFFFF' },
      errorCorrectionLevel: 'H',
    }).then(setQrUri);
  }, [isOpen, qrUrl]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/60 backdrop-blur-xs p-4 overflow-y-auto print:bg-white print:p-0">
      <div className="bg-white border border-[#E4E4E7] text-[#18181B] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative print:m-0 print:p-0 print:shadow-none print:border-none print:text-black print:bg-white">
        <div className="print:hidden flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-black text-[#18181B]">Printable Table Tent & Counter Sign</h3>
            <p className="text-xs text-[#71717A] mt-0.5">
              Print this sheet for your counter, studio, performance stand, or table.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#71717A] hover:text-[#18181B] rounded-xl hover:bg-[#F5F3FF] transition cursor-pointer"
            aria-label="Close printable sign"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Sign Content */}
        <div
          id="printable-tip-sign"
          className="border-4 border-[#7C3AED] rounded-3xl p-8 text-center bg-white text-[#18181B] print:border-4 print:p-8 shadow-md"
        >
          {/* Creator Avatar & Header */}
          <div className="flex flex-col items-center mb-4">
            <Avatar
              url={photoUrl}
              name={creatorName || username}
              size="2xl"
              accentColor="#7C3AED"
              className="mb-3"
            />
            <h2 className="text-3xl font-black tracking-tight text-[#18181B]">
              {creatorName || username}
            </h2>
            <p className="text-sm font-mono font-bold text-[#7C3AED] mt-0.5">
              {formatDisplayProfileUrl(username)}
            </p>
          </div>

          <p className="text-base font-semibold text-[#71717A] italic max-w-xs mx-auto mb-6">
            “{supportMessage || 'Good vibes deserve good tips! Leave a little love.'}”
          </p>

          {/* QR Code */}
          {qrUri ? (
            <div className="inline-block p-4 bg-white rounded-2xl border-2 border-[#E4E4E7] mb-4 shadow-sm">
              <img src={qrUri} alt={`QR Code to tip ${username}`} className="w-56 h-56 mx-auto" />
            </div>
          ) : (
            <div className="w-56 h-56 bg-[#F5F3FF] rounded-2xl mx-auto mb-4 animate-pulse" />
          )}

          <p className="text-sm font-extrabold text-[#18181B] uppercase tracking-wider">
            Scan with your iPhone or Camera
          </p>
          <p className="text-xs text-[#71717A] mt-1">
            Accepts Apple Pay, Google Pay, Debit & Credit Card
          </p>

          <div className="mt-6 pt-4 border-t border-[#E4E4E7] flex items-center justify-center gap-1.5 text-xs text-[#71717A] font-bold">
            <span>Powered by</span>
            <span className="font-black text-[#18181B] inline-flex items-center gap-1">
              Tip<span className="text-[#7C3AED]">ZeMe</span>
              <Heart className="w-3.5 h-3.5 fill-[#7C3AED] text-[#7C3AED]" />
            </span>
            <span>• Claim your link at {BRAND_DOMAIN}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="print:hidden mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="w-1/3 py-3 rounded-xl bg-[#F5F3FF] hover:bg-[#EDE9FE] text-[#7C3AED] font-bold text-xs transition border border-[#EDE9FE] cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="w-2/3 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#5B21B6] text-white font-black text-xs flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Counter Sign
          </button>
        </div>
      </div>
    </div>
  );
}
