import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share, PlusSquare, X, Check, Smartphone } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'button' | 'banner' | 'menu-item';
  className?: string;
}

export default function PWAInstallButton({ variant = 'button', className = '' }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setInstalling(true);
      try {
        await install();
      } finally {
        setInstalling(false);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  // If neither installable nor iOS, we can still show a gentle iOS instruction prompt on mobile or general install guide
  if (!isInstallable && !isIOS && typeof window !== 'undefined') {
    // If desktop or other browser without beforeinstallprompt, allow manual prompt or keep hidden
    // For TipZeMe mobile PWA requirements, let's show it if mobile or fallback
  }

  if (variant === 'banner') {
    return (
      <div className={`p-4 rounded-2xl bg-[#F5F3FF] border border-[#7C3AED]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center font-black shrink-0 shadow-sm">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-[#18181B]">Install TipZeMe App</h4>
            <p className="text-xs text-[#71717A]">Add TipZeMe to your Home Screen for instant access & standalone experience.</p>
          </div>
        </div>
        <button
          onClick={handleInstallClick}
          disabled={installing}
          className="px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#5B21B6] text-white font-black text-xs transition shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>{installing ? 'Installing...' : 'Install TipZeMe'}</span>
        </button>

        {/* iOS Instructions Modal */}
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18181B]/60 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-sm bg-white border border-[#E4E4E7] rounded-3xl p-6 shadow-2xl text-left relative">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 p-2 text-[#71717A] hover:text-[#18181B] rounded-xl hover:bg-[#F5F3FF]"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-black text-[#18181B] mb-1">Install TipZeMe on iPhone</h3>
              <p className="text-xs text-[#71717A] mb-4">Follow these simple steps in Safari:</p>
              <ol className="text-xs text-[#18181B] space-y-2.5 font-medium">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#F5F3FF] text-[#7C3AED] font-bold flex items-center justify-center shrink-0">1</span>
                  <span>Tap the Safari <strong>Share</strong> button <Share className="w-3.5 h-3.5 inline text-[#7C3AED]" /> at the bottom of your screen.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#F5F3FF] text-[#7C3AED] font-bold flex items-center justify-center shrink-0">2</span>
                  <span>Scroll down and select <strong>Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline text-[#7C3AED]" />.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#F5F3FF] text-[#7C3AED] font-bold flex items-center justify-center shrink-0">3</span>
                  <span>Enable <strong>Open as Web App</strong> if that option appears.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#F5F3FF] text-[#7C3AED] font-bold flex items-center justify-center shrink-0">4</span>
                  <span>Tap <strong>Add</strong> in the top right corner.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#F5F3FF] text-[#7C3AED] font-bold flex items-center justify-center shrink-0">5</span>
                  <span>Launch TipZeMe directly from your Home Screen!</span>
                </li>
              </ol>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full py-3 rounded-xl bg-[#7C3AED] text-white font-black text-xs cursor-pointer shadow-sm"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'menu-item') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          className={`w-full flex items-center justify-between p-3 rounded-2xl bg-white hover:bg-[#F5F3FF] border border-[#E4E4E7] text-xs font-bold text-[#18181B] transition cursor-pointer ${className}`}
        >
          <div className="flex items-center gap-2.5 text-[#7C3AED]">
            <Smartphone className="w-4 h-4" />
            <span>Install TipZeMe App</span>
          </div>
          <Download className="w-3.5 h-3.5 text-[#71717A]" />
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18181B]/60 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-sm bg-white border border-[#E4E4E7] rounded-3xl p-6 shadow-2xl text-left relative">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 p-2 text-[#71717A] hover:text-[#18181B] rounded-xl hover:bg-[#F5F3FF]"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-black text-[#18181B] mb-1">Install TipZeMe on iPhone</h3>
              <p className="text-xs text-[#71717A] mb-4">Follow these simple steps in Safari:</p>
              <ol className="text-xs text-[#18181B] space-y-2.5 font-medium">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#F5F3FF] text-[#7C3AED] font-bold flex items-center justify-center shrink-0">1</span>
                  <span>Tap the Safari <strong>Share</strong> button <Share className="w-3.5 h-3.5 inline text-[#7C3AED]" /> at the bottom of your screen.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#F5F3FF] text-[#7C3AED] font-bold flex items-center justify-center shrink-0">2</span>
                  <span>Scroll down and select <strong>Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline text-[#7C3AED]" />.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#F5F3FF] text-[#7C3AED] font-bold flex items-center justify-center shrink-0">3</span>
                  <span>Enable <strong>Open as Web App</strong> if that option appears.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#F5F3FF] text-[#7C3AED] font-bold flex items-center justify-center shrink-0">4</span>
                  <span>Tap <strong>Add</strong> in the top right corner.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#F5F3FF] text-[#7C3AED] font-bold flex items-center justify-center shrink-0">5</span>
                  <span>Launch TipZeMe directly from your Home Screen!</span>
                </li>
              </ol>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full py-3 rounded-xl bg-[#7C3AED] text-white font-black text-xs cursor-pointer shadow-sm"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        disabled={installing}
        className={`px-3.5 py-2 rounded-xl bg-[#F5F3FF] hover:bg-[#EDE9FE] text-xs font-bold text-[#7C3AED] transition flex items-center gap-1.5 cursor-pointer border border-[#7C3AED]/20 ${className}`}
      >
        <Download className="w-3.5 h-3.5 text-[#7C3AED]" />
        <span>{installing ? 'Installing...' : 'Install App'}</span>
      </button>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18181B]/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white border border-[#E4E4E7] rounded-3xl p-6 shadow-2xl text-left relative">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 p-2 text-[#71717A] hover:text-[#18181B] rounded-xl hover:bg-[#F5F3FF]"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-black text-[#18181B] mb-1">Install TipZeMe on iPhone</h3>
            <p className="text-xs text-[#71717A] mb-4">Follow these simple steps in Safari:</p>
            <ol className="text-xs text-[#18181B] space-y-2.5 font-medium">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#F5F3FF] text-[#7C3AED] font-bold flex items-center justify-center shrink-0">1</span>
                <span>Tap the Safari <strong>Share</strong> button <Share className="w-3.5 h-3.5 inline text-[#7C3AED]" /> at the bottom of your screen.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#F5F3FF] text-[#7C3AED] font-bold flex items-center justify-center shrink-0">2</span>
                <span>Scroll down and select <strong>Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline text-[#7C3AED]" />.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#F5F3FF] text-[#7C3AED] font-bold flex items-center justify-center shrink-0">3</span>
                <span>Enable <strong>Open as Web App</strong> if that option appears.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#F5F3FF] text-[#7C3AED] font-bold flex items-center justify-center shrink-0">4</span>
                <span>Tap <strong>Add</strong> in the top right corner.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#F5F3FF] text-[#7C3AED] font-bold flex items-center justify-center shrink-0">5</span>
                <span>Launch TipZeMe directly from your Home Screen!</span>
              </li>
            </ol>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-6 w-full py-3 rounded-xl bg-[#7C3AED] text-white font-black text-xs cursor-pointer shadow-sm"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
}
