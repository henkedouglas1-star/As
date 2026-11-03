import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import BrandLogo from '../components/BrandLogo';
import { ArrowLeft, AlertCircle, ExternalLink, Terminal, ChevronDown, ChevronUp } from 'lucide-react';

interface SignInPageProps {
  onNavigate: (route: string) => void;
}

type AuthStep =
  | 'idle'
  | 'starting'
  | 'popup_opened'
  | 'popup_blocked'
  | 'auth_failed'
  | 'auth_succeeded';

export default function SignInPage({ onNavigate }: SignInPageProps) {
  const { user, profile, loading, profileLoaded, signInWithGoogle } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [authStep, setAuthStep] = useState<AuthStep>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(true);

  const isIframe = typeof window !== 'undefined' && window.self !== window.top;
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  // Synchronize authenticated user routing only after auth AND profile check have completed
  useEffect(() => {
    if (!loading && user) {
      if (profile) {
        setStatusMessage(`Welcome back, ${profile.displayName || profile.username}! Opening dashboard...`);
        setAuthStep('auth_succeeded');
        const timer = setTimeout(() => {
          onNavigate('dashboard');
        }, 300);
        return () => clearTimeout(timer);
      } else if (profileLoaded) {
        setStatusMessage(`Signed in as ${user.email}. Setting up your creator handle...`);
        setAuthStep('auth_succeeded');
        const timer = setTimeout(() => {
          onNavigate('onboarding');
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [user, profile, loading, profileLoaded, onNavigate]);

  const handleGoogleSignIn = async () => {
    if (submitting || user || authStep === 'auth_succeeded') return;
    setSubmitting(true);
    setError(null);
    setAuthStep('popup_opened');
    setStatusMessage('Google popup opened. Please select your Google account in the popup window...');

    try {
      const cred = await signInWithGoogle();

      if (cred && cred.user) {
        setAuthStep('auth_succeeded');
        setStatusMessage(`Authenticated as ${cred.user.email}. Loading creator profile...`);
      }
    } catch (err: any) {
      console.error('[Google Sign-In Error]:', err);
      const code = err.code || 'auth/unknown';
      let friendlyMessage = err.message || 'Failed to complete Google sign-in.';

      if (code === 'auth/popup-blocked') {
        setAuthStep('popup_blocked');
        friendlyMessage =
          'The Google sign-in popup was blocked by your browser. Click below to open in browser to sign in.';
      } else if (code === 'auth/popup-closed-by-user') {
        setAuthStep('auth_failed');
        friendlyMessage = 'The Google sign-in popup was closed before completing authentication.';
      } else if (code === 'auth/cancelled-popup-request') {
        setAuthStep('auth_failed');
        friendlyMessage = 'Sign-in was cancelled due to another popup request.';
      } else if (code === 'auth/unauthorized-domain') {
        setAuthStep('auth_failed');
        friendlyMessage = `This domain (${window.location.hostname}) is not authorized for Firebase Auth. Add it in the Firebase Console under Authentication > Settings > Authorized domains.`;
      } else if (code === 'auth/network-request-failed') {
        setAuthStep('auth_failed');
        friendlyMessage = 'Network connection failed. Please check your internet connection and try again.';
      } else {
        setAuthStep('auth_failed');
      }

      setError({
        message: friendlyMessage,
        code,
      });
      setStatusMessage('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4 py-8 bg-[#08051B] text-white font-sans relative overflow-hidden select-none">
      {/* Subtle midnight-purple ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] sm:w-[540px] h-[320px] sm:h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(121,40,255,0.12),transparent_70%)] blur-[100px] pointer-events-none" />

      {/* Main Authentication Card */}
      <div className="w-full max-w-[420px] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center z-10 bg-[#120A2B]/90 backdrop-blur-xl border border-[#7928FF]/25">
        {/* Subtle glass hairline highlight */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#D49BFF]/30 to-transparent" />

        {/* Brand Header: Logo in subtle jewel tile */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-[#1B103B] p-2.5 shadow-md mb-4 flex items-center justify-center border border-[#7928FF]/30">
          <BrandLogo size="md" showText={false} />
        </div>

        {/* Card Heading & Supporting Text */}
        <div className="mb-6">
          <h1 className="font-headline text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back
          </h1>
          <p className="text-[#C9BFDF] text-xs sm:text-sm mt-1.5 font-sans leading-relaxed">
            Sign in to manage your tips, profile, and earnings.
          </p>
        </div>

        {/* Live Status Feedback Banner */}
        {statusMessage && (
          <div className="mb-4 p-3 rounded-xl bg-[#7928FF]/15 border border-[#7928FF]/40 text-[#D49BFF] text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <div className="w-2 h-2 rounded-full bg-[#D49BFF] animate-ping shrink-0" />
            <span className="truncate">{statusMessage}</span>
          </div>
        )}

        {/* Error Feedback Banner */}
        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs font-medium space-y-2 animate-in fade-in text-left">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{error.message}</p>
            </div>
            {error.code === 'auth/popup-blocked' && (
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg bg-[#7928FF]/40 hover:bg-[#7928FF]/60 text-white text-xs font-semibold border border-[#7928FF]/40 transition cursor-pointer"
              >
                <span>Open in browser window to sign in</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {/* Primary Authentication Action: High-contrast "Continue with Google" */}
        <div className="mt-2">
          <button
            onClick={handleGoogleSignIn}
            disabled={submitting || Boolean(user) || authStep === 'auth_succeeded'}
            className="w-full h-12 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer shadow-md bg-white hover:bg-slate-100 text-slate-900 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed group border border-white/20"
            id="google-signin-btn"
            aria-label="Continue with Google"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-[#7928FF] border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>{submitting ? 'Signing in with Google...' : 'Continue with Google'}</span>
          </button>
          <p className="text-[11px] text-[#968AAE] mt-2 text-center">
            Opens in a separate secure Google window while keeping TipZeMe open.
          </p>
        </div>

        {/* New User Action */}
        <div className="mt-6 pt-5 border-t border-white/[0.08] flex items-center justify-center gap-1.5 text-xs">
          <span className="text-[#968AAE]">New to TipZeMe?</span>
          <button
            onClick={() => onNavigate('onboarding')}
            className="text-[#D49BFF] hover:text-white font-bold transition cursor-pointer hover:underline"
          >
            Create your tip jar link
          </button>
        </div>

        {/* Quiet Back to TipZeMe Navigation */}
        <div className="mt-4 text-center">
          <button
            onClick={() => onNavigate('landing')}
            className="text-xs text-[#968AAE] hover:text-white font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#968AAE]" />
            <span>Back to TipZeMe</span>
          </button>
        </div>


        {/* Development Diagnostic Panel (Only visible with ?debug=1) */}
        {typeof window !== 'undefined' && window.location.search.includes('debug=1') && (
          <div className="mt-6 pt-4 border-t border-white/[0.08] text-left">
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="w-full flex items-center justify-between text-[11px] font-medium text-slate-400 hover:text-white transition cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
                <span>Diagnostics (Debug Mode)</span>
              </span>
              {showDiagnostics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showDiagnostics && (
              <div className="mt-2.5 p-3 rounded-xl bg-black/40 border border-white/[0.08] space-y-1.5 font-mono text-[10px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Origin:</span>
                  <span className="text-white font-medium truncate max-w-[190px]">{currentOrigin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Iframe:</span>
                  <span className={isIframe ? 'text-amber-400 font-medium' : 'text-purple-300 font-medium'}>
                    {isIframe ? 'YES (Preview)' : 'NO (Top-level)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Firebase Auth:</span>
                  <span className="text-purple-300 font-medium">
                    {auth ? 'INITIALIZED' : 'FAILED'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Auth State:</span>
                  <span className="text-white font-medium truncate max-w-[190px]">
                    {user ? `${user.email}` : 'Signed Out'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Creator Profile:</span>
                  <span className="text-white font-medium">
                    {profile ? `@${profile.username}` : profileLoaded ? 'None' : 'Loading...'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Step:</span>
                  <span className="text-purple-300 font-medium">{authStep}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
