import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Share2, X, Download } from 'lucide-react';

interface ShareModalProps {
  url: string;
  username: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareModal({ url, username, isOpen, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (!url || !isOpen) return;
    QRCode.toDataURL(url, {
      margin: 1,
      width: 280,
      color: {
        dark: '#7C3AED',
        light: '#FFFFFF',
      },
    })
      .then((dataUri) => setQrDataUrl(dataUri))
      .catch((err) => console.error('QR generation error:', err));
  }, [url, isOpen]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Tip @${username} on TipZeMe`,
          text: `Support @${username} with a direct tip!`,
          url: url,
        });
      } catch {
        // User dismissed share dialog
      }
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${username}-tipzeme-qr.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="luxe-glass-card rounded-2xl max-w-sm w-full p-6 sm:p-7 shadow-xl relative text-white border border-white/[0.08]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.06] transition cursor-pointer"
          aria-label="Close share dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-display text-xl font-bold text-white text-center mb-1">Share Your TipZeMe</h3>
        <p className="text-xs text-slate-400 text-center mb-6">Let your supporters express appreciation</p>

        {/* QR Code Container */}
        <div className="flex flex-col items-center p-5 bg-white/[0.03] rounded-xl border border-white/[0.08] mb-5">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`QR Code for @${username}`} className="w-48 h-48 rounded-xl shadow-sm bg-white p-2" />
          ) : (
            <div className="w-48 h-48 bg-white/10 rounded-xl animate-pulse" />
          )}

          <button
            onClick={handleDownloadQR}
            className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-300 hover:text-white transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Download QR Code PNG
          </button>
        </div>

        {/* Copy Link input */}
        <div className="flex items-center gap-2 p-1.5 border border-white/[0.1] rounded-xl bg-white/[0.02] mb-3">
          <input
            type="text"
            readOnly
            value={url}
            className="w-full bg-transparent text-xs text-slate-200 outline-none px-2.5 font-mono select-all font-medium"
            aria-label="Public TipZeMe URL"
          />
          <button
            onClick={handleCopy}
            className="luxe-button-primary flex items-center gap-1 px-3.5 py-2 rounded-lg text-white text-xs font-semibold transition shrink-0 cursor-pointer shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            onClick={handleNativeShare}
            className="luxe-button-secondary w-full py-2.5 rounded-xl text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 hover:text-white transition cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-violet-300" /> Share via Apps
          </button>
        )}
      </div>
    </div>
  );
}
