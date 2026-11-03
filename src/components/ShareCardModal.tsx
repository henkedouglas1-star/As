import React, { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { Download, X, Sparkles, Share2, Copy, Check } from 'lucide-react';
import { formatDisplayProfileUrl } from '../lib/urlUtils';

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorName: string;
  username: string;
  supportMessage: string;
  tipJarUrl: string;
  photoUrl?: string | null;
  accentColor?: string;
}

type AspectRatio = 'square' | 'story' | 'landscape';
type CardTheme = 'purple' | 'white' | 'deep';

export default function ShareCardModal({
  isOpen,
  onClose,
  creatorName,
  username,
  supportMessage,
  tipJarUrl,
  photoUrl,
  accentColor = '#7C3AED',
}: ShareCardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [aspect, setAspect] = useState<AspectRatio>('square');
  const [theme, setTheme] = useState<CardTheme>('purple');
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Add source=qr query param for growth attribution
  const attributedUrl = tipJarUrl.includes('?')
    ? `${tipJarUrl}&source=qr`
    : `${tipJarUrl}?source=qr`;

  useEffect(() => {
    if (!isOpen) return;
    renderCard();
  }, [isOpen, aspect, theme, creatorName, username, supportMessage, attributedUrl, photoUrl, accentColor]);

  const renderCard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensions
    let width = 1080;
    let height = 1080;
    if (aspect === 'story') {
      width = 1080;
      height = 1920;
    } else if (aspect === 'landscape') {
      width = 1200;
      height = 630;
    }

    canvas.width = width;
    canvas.height = height;

    // Theme Colors
    let bgColor = '#F5F3FF';
    let cardBg = '#FFFFFF';
    let textColor = '#18181B';
    let subTextColor = '#71717A';
    let themeAccent = accentColor || '#7C3AED';
    let qrLight = '#FFFFFF';
    let qrDark = '#7C3AED';

    if (theme === 'white') {
      bgColor = '#FFFFFF';
      cardBg = '#F5F3FF';
      textColor = '#18181B';
      subTextColor = '#71717A';
      themeAccent = '#7C3AED';
      qrLight = '#FFFFFF';
      qrDark = '#18181B';
    } else if (theme === 'deep') {
      bgColor = '#5B21B6';
      cardBg = '#7C3AED';
      textColor = '#FFFFFF';
      subTextColor = '#EDE9FE';
      themeAccent = '#FFFFFF';
      qrLight = '#FFFFFF';
      qrDark = '#5B21B6';
    }

    // Outer Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Inner Card
    const margin = aspect === 'landscape' ? 40 : 80;
    const cardWidth = width - margin * 2;
    const cardHeight = height - margin * 2;

    ctx.fillStyle = cardBg;
    ctx.beginPath();
    ctx.roundRect(margin, margin, cardWidth, cardHeight, 52);
    ctx.fill();

    // Top border glow line
    ctx.fillStyle = themeAccent;
    ctx.beginPath();
    ctx.roundRect(margin + 40, margin, cardWidth - 80, 8, 4);
    ctx.fill();

    const centerX = width / 2;

    if (aspect === 'landscape') {
      // Side-by-Side Layout
      const leftCenterX = margin + (cardWidth * 0.46) / 2 + 20;
      const rightCenterX = margin + cardWidth * 0.72;

      let startY = margin + 110;
      const avatarRadius = 54;

      // Draw Avatar
      await drawAvatarCircle(ctx, leftCenterX, startY, avatarRadius, themeAccent, creatorName || username, photoUrl);

      startY += avatarRadius + 45;
      ctx.fillStyle = textColor;
      ctx.font = 'bold 44px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(creatorName || username, leftCenterX, startY);

      startY += 40;
      ctx.fillStyle = themeAccent;
      ctx.font = 'bold 24px monospace';
      ctx.fillText(formatDisplayProfileUrl(username), leftCenterX, startY);

      if (supportMessage) {
        startY += 48;
        ctx.fillStyle = subTextColor;
        ctx.font = 'italic 22px system-ui, -apple-system, sans-serif';
        ctx.fillText(`“${supportMessage}”`, leftCenterX, startY);
      }

      // Right Column: QR Code
      const qrSize = 250;
      const qrY = margin + (cardHeight - qrSize) / 2 - 20;
      await drawAttributedQr(ctx, rightCenterX, qrY + qrSize / 2, qrSize, qrLight, qrDark, themeAccent, creatorName || username, photoUrl);

      ctx.fillStyle = subTextColor;
      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
      ctx.fillText('Scan to tip with Apple Pay / Card', rightCenterX, qrY + qrSize + 35);

      // Branding
      ctx.fillStyle = themeAccent;
      ctx.font = '900 24px system-ui, -apple-system, sans-serif';
      ctx.fillText('TipZeMe • Good vibes deserve good tips', leftCenterX, margin + cardHeight - 40);
    } else {
      // Square or Story Layout
      let startY = aspect === 'story' ? margin + cardHeight * 0.16 : margin + cardHeight * 0.1;
      const avatarRadius = 64;

      // Avatar
      await drawAvatarCircle(ctx, centerX, startY, avatarRadius, themeAccent, creatorName || username, photoUrl);

      startY += avatarRadius + 50;
      ctx.fillStyle = textColor;
      ctx.font = '900 52px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(creatorName || username, centerX, startY);

      startY += 48;
      ctx.fillStyle = themeAccent;
      ctx.font = 'bold 30px monospace';
      ctx.fillText(formatDisplayProfileUrl(username), centerX, startY);

      if (supportMessage) {
        startY += 48;
        ctx.fillStyle = subTextColor;
        ctx.font = 'italic 26px system-ui, -apple-system, sans-serif';
        ctx.fillText(`“${supportMessage}”`, centerX, startY);
      }

      const qrSize = aspect === 'story' ? 380 : 320;
      const qrY = startY + (aspect === 'story' ? 80 : 45);

      await drawAttributedQr(ctx, centerX, qrY + qrSize / 2, qrSize, qrLight, qrDark, themeAccent, creatorName || username, photoUrl);

      ctx.fillStyle = subTextColor;
      ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
      ctx.fillText('Scan with iPhone or Camera to Send a Tip', centerX, qrY + qrSize + 48);

      // Bottom Branding
      ctx.fillStyle = themeAccent;
      ctx.font = '900 30px system-ui, -apple-system, sans-serif';
      ctx.fillText('TipZeMe 💜 Good vibes deserve good tips', centerX, margin + cardHeight - 45);
    }
  };

  const drawAvatarCircle = async (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    accent: string,
    name: string,
    photo?: string | null
  ) => {
    // Outer accent ring
    ctx.beginPath();
    ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();

    if (photo) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = photo;
      await new Promise((res) => {
        img.onload = res;
        img.onerror = res;
      });

      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#F5F3FF';
      ctx.fill();

      ctx.fillStyle = '#7C3AED';
      ctx.font = `bold ${Math.round(radius * 0.8)}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name.slice(0, 2).toUpperCase(), x, y);
    }
  };

  const drawAttributedQr = async (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    size: number,
    qrLight: string,
    qrDark: string,
    accent: string,
    name: string,
    photo?: string | null
  ) => {
    const qrDataUrl = await QRCode.toDataURL(attributedUrl, {
      margin: 1,
      width: size,
      color: { dark: qrDark, light: qrLight },
      errorCorrectionLevel: 'H',
    });

    const qrImg = new Image();
    qrImg.src = qrDataUrl;
    await new Promise((resolve) => (qrImg.onload = resolve));
    ctx.drawImage(qrImg, centerX - size / 2, centerY - size / 2, size, size);

    // Center badge
    const badgeR = Math.round(size * 0.15);
    ctx.beginPath();
    ctx.arc(centerX, centerY, badgeR + 3, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, badgeR, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();

    if (photo) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = photo;
      await new Promise((res) => {
        img.onload = res;
        img.onerror = res;
      });

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, badgeR - 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, centerX - (badgeR - 2), centerY - (badgeR - 2), (badgeR - 2) * 2, (badgeR - 2) * 2);
      ctx.restore();
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${Math.round(badgeR * 0.8)}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name.slice(0, 2).toUpperCase(), centerX, centerY);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);
    const link = document.createElement('a');
    link.download = `tipzeme-${username}-${aspect}-${theme}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setDownloading(false);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Tip @${username} on TipZeMe`,
          text: `Support @${username} directly with a tip on TipZeMe!`,
          url: attributedUrl,
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
      await navigator.clipboard.writeText(attributedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-[#E4E4E7] text-[#18181B] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-6">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-[#71717A] hover:text-[#18181B] hover:bg-[#F5F3FF] transition cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-[#7C3AED]" />
          <h3 className="text-xl font-black text-[#18181B]">Viral QR & Share Card Generator</h3>
        </div>
        <p className="text-xs text-[#71717A]">
          Export branded cards with your photo and QR code for Instagram Stories, TikTok, tables, and social feeds.
        </p>

        {/* Format and Theme Selector */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-[#71717A] uppercase tracking-wider mb-1.5">
              Card Aspect Ratio
            </label>
            <div className="grid grid-cols-3 gap-1 bg-[#F5F3FF] p-1 rounded-xl border border-[#E4E4E7]">
              {(['square', 'story', 'landscape'] as AspectRatio[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setAspect(fmt)}
                  className={`py-2 text-xs font-bold rounded-lg capitalize transition cursor-pointer ${
                    aspect === fmt
                      ? 'bg-white text-[#7C3AED] shadow-xs font-black'
                      : 'text-[#71717A] hover:text-[#18181B]'
                  }`}
                >
                  {fmt === 'square' ? 'Square 1:1' : fmt === 'story' ? 'Story 9:16' : 'Feed 16:9'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#71717A] uppercase tracking-wider mb-1.5">
              Theme Style
            </label>
            <div className="grid grid-cols-3 gap-1 bg-[#F5F3FF] p-1 rounded-xl border border-[#E4E4E7]">
              {(['purple', 'white', 'deep'] as CardTheme[]).map((thm) => (
                <button
                  key={thm}
                  onClick={() => setTheme(thm)}
                  className={`py-2 text-xs font-bold rounded-lg capitalize transition cursor-pointer ${
                    theme === thm
                      ? 'bg-white text-[#7C3AED] shadow-xs font-black'
                      : 'text-[#71717A] hover:text-[#18181B]'
                  }`}
                >
                  {thm === 'purple' ? 'Purple' : thm === 'white' ? 'White' : 'Deep Purple'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Canvas Preview */}
        <div className="mt-5 flex justify-center bg-[#F5F3FF] rounded-2xl p-4 border border-[#E4E4E7] overflow-hidden">
          <canvas
            ref={canvasRef}
            className="rounded-xl shadow-xl max-h-[320px] w-auto max-w-full object-contain bg-white"
          />
        </div>

        {/* Actions */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="py-3 px-4 rounded-xl bg-[#7C3AED] hover:bg-[#5B21B6] text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Download PNG</span>
          </button>

          <button
            onClick={handleShare}
            className="py-3 px-4 rounded-xl bg-[#F5F3FF] hover:bg-[#EDE9FE] text-[#7C3AED] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer border border-[#EDE9FE]"
          >
            <Share2 className="w-4 h-4 text-[#7C3AED]" />
            <span>One-Click Share</span>
          </button>

          <button
            onClick={handleCopy}
            className="py-3 px-4 rounded-xl bg-[#F5F3FF] hover:bg-[#EDE9FE] text-[#7C3AED] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer border border-[#EDE9FE]"
          >
            {copied ? <Check className="w-4 h-4 text-[#7C3AED]" /> : <Copy className="w-4 h-4 text-[#7C3AED]" />}
            <span>{copied ? 'Copied Link!' : 'Copy Link'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
