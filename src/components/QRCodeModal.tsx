import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Share2, Copy, Check, X, QrCode as QrIcon } from 'lucide-react';
import Avatar from './Avatar';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  username: string;
  displayName: string;
  photoUrl?: string | null;
  accentColor?: string;
}

export default function QRCodeModal({
  isOpen,
  onClose,
  url,
  username,
  displayName,
  photoUrl,
  accentColor = '#7C3AED',
}: QRCodeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const qrCanvas = document.createElement('canvas');
    QRCode.toCanvas(
      qrCanvas,
      url,
      {
        width: 480,
        margin: 2,
        color: {
          dark: '#18181B',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'H',
      },
      (err) => {
        if (err) {
          console.error('Failed to generate QR:', err);
          return;
        }

        canvas.width = 480;
        canvas.height = 480;

        // Draw the QR code
        ctx.drawImage(qrCanvas, 0, 0);

        // Center circular badge area
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const badgeRadius = 46;

        // Draw white circle backing
        ctx.beginPath();
        ctx.arc(centerX, centerY, badgeRadius + 4, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        // Draw accent colored ring
        ctx.beginPath();
        ctx.arc(centerX, centerY, badgeRadius, 0, Math.PI * 2);
        ctx.fillStyle = accentColor || '#7C3AED';
        ctx.fill();

        // If user has photo, draw image in center
        if (photoUrl) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            ctx.save();
            ctx.beginPath();
            ctx.arc(centerX, centerY, badgeRadius - 4, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(
              img,
              centerX - (badgeRadius - 4),
              centerY - (badgeRadius - 4),
              (badgeRadius - 4) * 2,
              (badgeRadius - 4) * 2
            );
            ctx.restore();
          };
          img.src = photoUrl;
        } else {
          // Initials
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const initials = (displayName || username).slice(0, 2).toUpperCase();
          ctx.fillText(initials, centerX, centerY);
        }
      }
    );
  }, [isOpen, url, username, displayName, photoUrl, accentColor]);

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

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Tip @${username} on TipZeMe`,
          text: `Support @${username} directly on TipZeMe!`,
          url,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    setDownloading(true);
    try {
      const link = document.createElement('a');
      link.download = `tipzeme-${username}-qr.png`;
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.warn('Download notice:', e);
    } finally {
      setDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm luxe-glass-card rounded-2xl p-6 shadow-xl text-center text-white border border-white/[0.08]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center">
          <Avatar
            url={photoUrl}
            name={displayName}
            size="lg"
            accentColor={accentColor}
            className="mb-2"
          />
          <h3 className="font-display font-bold text-lg text-white">{displayName}</h3>
          <p className="text-xs text-violet-400 font-mono font-bold mt-0.5">@{username}</p>
        </div>

        {/* QR Code Canvas */}
        <div className="mt-5 p-4 bg-white rounded-2xl shadow-xl flex items-center justify-center inline-block">
          <canvas
            ref={canvasRef}
            className="w-56 h-56 max-w-full rounded-xl"
            style={{ width: '224px', height: '224px' }}
          />
        </div>

        <p className="text-[11px] text-slate-400 mt-3 font-mono truncate px-4">
          {url}
        </p>

        {/* Actions */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="luxe-button-secondary py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-200 hover:text-white transition flex flex-col items-center justify-center gap-1 cursor-pointer"
          >
            <Download className="w-4 h-4 text-violet-300" />
            <span>Save QR</span>
          </button>

          <button
            onClick={handleCopy}
            className="luxe-button-secondary py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-200 hover:text-white transition flex flex-col items-center justify-center gap-1 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-violet-300" />}
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>

          <button
            onClick={handleShare}
            className="luxe-button-primary py-2.5 px-3 rounded-xl text-white text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer shadow-lg"
          >
            <Share2 className="w-4 h-4 text-violet-200" />
            <span>Share</span>
          </button>
        </div>
      </div>
    </div>
  );
}
