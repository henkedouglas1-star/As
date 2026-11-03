import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TipTransaction } from '../types';
import { calculatePlatformFee } from '../lib/rules';
import { calculateLedgerAggregates } from '../lib/ledger';
import {
  DollarSign,
  CreditCard,
  Building,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  ArrowLeft,
  Clock,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  X,
  AlertTriangle,
  RotateCcw,
  Bug,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface EarningsPayoutsPageProps {
  onNavigate: (route: string) => void;
}

interface PayoutErrorDetails {
  hasError: boolean;
  category: string;
  code: string;
  step: string;
  explanation: string;
  recommendedAction: string;
  actualErrorMessage: string;
  httpStatus: number | null;
  endpoint: string;
  reactException: string | null;
  urlGenerated: boolean;
}

export default function EarningsPayoutsPage({ onNavigate }: EarningsPayoutsPageProps) {
  const { user, profile, loading } = useAuth();

  const [stripeConfig, setStripeConfig] = useState<any>(null);
  const [accountStatus, setAccountStatus] = useState<any>(null);
  const [balance, setBalance] = useState<{ available: any[]; pending: any[] } | null>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [tips, setTips] = useState<TipTransaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [connectingStripe, setConnectingStripe] = useState(false);
  const [openingDashboard, setOpeningDashboard] = useState(false);
  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState<'info' | 'success' | 'warning' | 'error'>('info');

  // Structured Error State for Recoverable Error Experience
  const [payoutError, setPayoutError] = useState<PayoutErrorDetails>({
    hasError: false,
    category: '',
    code: '',
    step: '',
    explanation: '',
    recommendedAction: '',
    actualErrorMessage: '',
    httpStatus: null,
    endpoint: '/api/stripe/connect',
    reactException: null,
    urlGenerated: false,
  });

  const [showTechDetails, setShowTechDetails] = useState(false);

  // Diagnostic State (Development / Preview visibility)
  const [diagStep, setDiagStep] = useState<string>('idle');
  const [diagBackendStatus, setDiagBackendStatus] = useState<string>('idle');
  const [diagHttpStatus, setDiagHttpStatus] = useState<number | null>(null);
  const [diagStripeCode, setDiagStripeCode] = useState<string>('none');
  const [diagNavType, setDiagNavType] = useState<string>('none');
  const [diagLastException, setDiagLastException] = useState<string | null>(null);
  const [showDiagPanel, setShowDiagPanel] = useState<boolean>(false);

  // Onboarding Modal for iframe / fallback navigation
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);

  const feeConfig = { percent: 1, fixedCents: 5 };

  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  const loadStripeData = async () => {
    if (!user) return;
    setLoadingData(true);

    try {
      // 0. Stripe Mode Config
      const configRes = await fetch('/api/config/stripe');
      if (configRes.ok) {
        const configData = await configRes.json();
        setStripeConfig(configData);
      }

      // 1. Account status
      const statusRes = await fetch(`/api/stripe/account-status?userId=${user.uid}`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setAccountStatus(statusData);
      }

      // 2. Stripe Balance
      const balanceRes = await fetch(`/api/stripe/balance?userId=${user.uid}`);
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setBalance(balanceData);
      }

      // 3. Payouts List
      const payoutsRes = await fetch(`/api/stripe/payouts?userId=${user.uid}`);
      if (payoutsRes.ok) {
        const payoutsData = await payoutsRes.json();
        setPayouts(payoutsData.payouts || []);
      }
    } catch (err: any) {
      console.warn('Notice loading payout information:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // Inspect return query params on mount
  useEffect(() => {
    const hash = window.location.hash;
    const queryPart = hash.includes('?') ? hash.split('?')[1] : window.location.search.replace(/^\?/, '');
    const params = new URLSearchParams(queryPart);
    const stripeParam = params.get('stripe');

    if (stripeParam === 'success') {
      setDiagStep('returned_from_stripe_success');
      setNotice('Returned from Stripe onboarding. Verifying your bank connection status with Stripe...');
      setNoticeType('info');
      // Trigger status refresh
      if (user) {
        loadStripeData().then(() => {
          fetch(`/api/stripe/account-status?userId=${user.uid}`)
            .then((r) => r.json())
            .then((status) => {
              if (status.payoutsEnabled) {
                setNotice('Your bank payouts are verified and active! Funds from tips will deposit directly to your bank.');
                setNoticeType('success');
                setDiagStep('account_verified_active');
              } else if (status.detailsSubmitted) {
                setNotice('Stripe received your details. Verification is underway or requires additional documentation in Stripe.');
                setNoticeType('warning');
                setDiagStep('verification_pending');
              } else {
                setNotice('Onboarding was started but not completed. Click "Complete payout setup" below to finish.');
                setNoticeType('warning');
                setDiagStep('onboarding_incomplete');
              }
            })
            .catch(() => {});
        });
      }
    } else if (stripeParam === 'refresh') {
      setDiagStep('returned_from_stripe_refresh');
      setNotice('Your Stripe onboarding session timed out or was interrupted. Click "Connect payouts" to generate a fresh link.');
      setNoticeType('warning');
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadStripeData();

      // Load Firestore tips
      try {
        const q = query(
          collection(db, 'tips'),
          where('recipientId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const unsub = onSnapshot(q, (snap) => {
          setTips(snap.docs.map((d) => d.data() as TipTransaction));
        });
        return () => unsub();
      } catch (err) {
        console.warn('Tips listener notice:', err);
      }
    }
  }, [user]);

  // Helper to map errors into clear categories
  const mapStripeError = (code: string, message: string, httpStatus: number | null): { category: string; explanation: string; recommendedAction: string } => {
    if (code === 'platform_profile_incomplete' || message.includes('platform profile') || message.includes('dashboard.stripe.com/connect/accounts/overview')) {
      return {
        category: 'Stripe Connect setup incomplete',
        explanation: 'TipZeMe’s payment platform profile questionnaire in the Stripe Dashboard needs to be completed before creator accounts can be linked.',
        recommendedAction: 'Log in to your Stripe Dashboard at dashboard.stripe.com/connect/accounts/overview to complete the required platform profile questions.',
      };
    }
    if (code === 'unauthenticated' || httpStatus === 401 || message.includes('sign in') || message.includes('session expired')) {
      return {
        category: 'Authentication expired',
        explanation: 'Your TipZeMe session has expired or is not authenticated.',
        recommendedAction: 'Sign in again to refresh your session credentials and retry.',
      };
    }
    if (code === 'restricted_key_permission_missing' || httpStatus === 403 || message.includes('permission')) {
      return {
        category: 'Insufficient Stripe permissions',
        explanation: 'The configured restricted Stripe API key lacks "Connected accounts: Write" permission.',
        recommendedAction: 'In your Stripe Dashboard API keys settings, update the key permissions to grant Write access for Connected Accounts.',
      };
    }
    if (code === 'network_error' || message.includes('Network error') || message.includes('Failed to fetch')) {
      return {
        category: 'Network unavailable',
        explanation: 'A network connection timeout or interruption prevented communication with Stripe.',
        recommendedAction: 'Check your internet connection and try again.',
      };
    }
    if (code === 'missing_credentials') {
      return {
        category: 'Missing Stripe API credentials',
        explanation: 'Stripe secret keys are not configured on the server environment.',
        recommendedAction: 'Configure STRIPE_SECRET_KEY in the application environment settings.',
      };
    }
    if (code === 'missing_url' || message.includes('valid onboarding destination')) {
      return {
        category: 'Invalid onboarding URL',
        explanation: 'Stripe did not return a valid onboarding destination link.',
        recommendedAction: 'Retry generating a new onboarding session.',
      };
    }
    return {
      category: 'Payout service temporarily unavailable',
      explanation: message || 'An unexpected issue occurred while preparing your Stripe onboarding link.',
      recommendedAction: 'Please retry or contact support if the issue persists.',
    };
  };

  const handleConnectStripe = async () => {
    // Reset previous errors
    setPayoutError({
      hasError: false,
      category: '',
      code: '',
      step: '',
      explanation: '',
      recommendedAction: '',
      actualErrorMessage: '',
      httpStatus: null,
      endpoint: '/api/stripe/connect',
      reactException: null,
      urlGenerated: false,
    });

    if (!user) {
      const err = mapStripeError('unauthenticated', 'User session is not authenticated.', 401);
      setPayoutError({
        hasError: true,
        category: err.category,
        code: 'unauthenticated',
        step: 'Client authentication check',
        explanation: err.explanation,
        recommendedAction: err.recommendedAction,
        actualErrorMessage: 'No authenticated Firebase user found in context.',
        httpStatus: 401,
        endpoint: '/api/stripe/connect',
        reactException: null,
        urlGenerated: false,
      });
      setDiagStep('error_unauthenticated');
      setDiagBackendStatus('Aborted: User not authenticated');
      return;
    }

    setConnectingStripe(true);
    setNotice('');
    setDiagStep('requesting_endpoint');
    setDiagBackendStatus('POST /api/stripe/connect pending...');
    setDiagHttpStatus(null);
    setDiagStripeCode('none');
    setDiagLastException(null);

    try {
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email,
          username: profile?.username,
        }),
      });

      setDiagHttpStatus(res.status);
      const data = await res.json();

      if (!res.ok || data.error) {
        const errMsg = data.error || 'Failed to initialize Stripe onboarding.';
        const errCode = data.code || (res.status === 403 ? 'restricted_key_permission_missing' : 'stripe_error');
        const mapped = mapStripeError(errCode, errMsg, res.status);

        setPayoutError({
          hasError: true,
          category: mapped.category,
          code: errCode,
          step: 'Stripe account link generation',
          explanation: mapped.explanation,
          recommendedAction: mapped.recommendedAction,
          actualErrorMessage: errMsg,
          httpStatus: res.status,
          endpoint: '/api/stripe/connect',
          reactException: null,
          urlGenerated: false,
        });

        setDiagStep('backend_error_returned');
        setDiagBackendStatus(`Failed: HTTP ${res.status}`);
        setDiagStripeCode(errCode);
        setConnectingStripe(false);
        return;
      }

      setDiagBackendStatus(`Success: HTTP ${res.status}`);

      if (data.url && typeof data.url === 'string' && data.url.startsWith('http')) {
        setDiagStep('account_link_ready');
        setDiagNavType(isIframe ? 'Preview Modal Link (target="_blank")' : 'Top-Level Redirect');

        // Inside Google AI Studio Preview iframe, Stripe's SAMEORIGIN blocks iframe loading.
        // Showing the modal or launching top-level window completely prevents white screen.
        if (isIframe) {
          setOnboardingUrl(data.url);
        } else {
          try {
            if (window.top && window.top !== window.self) {
              window.top.location.href = data.url;
            } else {
              window.location.href = data.url;
            }
          } catch (navErr: any) {
            console.warn('Direct top navigation blocked, falling back to modal:', navErr);
            setDiagLastException(navErr.message || 'Top navigation blocked by browser');
            setOnboardingUrl(data.url);
          }
        }
      } else {
        const mapped = mapStripeError('missing_url', 'Stripe did not return a valid onboarding URL.', res.status);
        setPayoutError({
          hasError: true,
          category: mapped.category,
          code: 'missing_url',
          step: 'Account link validation',
          explanation: mapped.explanation,
          recommendedAction: mapped.recommendedAction,
          actualErrorMessage: 'Response succeeded but `url` property was empty or invalid.',
          httpStatus: res.status,
          endpoint: '/api/stripe/connect',
          reactException: null,
          urlGenerated: false,
        });
        setDiagStep('missing_url_in_response');
      }
    } catch (err: any) {
      console.error('Connect payouts network error:', err);
      const mapped = mapStripeError('network_error', err.message || 'Network request failed', 0);
      setPayoutError({
        hasError: true,
        category: mapped.category,
        code: 'network_error',
        step: 'Network transmission to backend',
        explanation: mapped.explanation,
        recommendedAction: mapped.recommendedAction,
        actualErrorMessage: err.message || String(err),
        httpStatus: null,
        endpoint: '/api/stripe/connect',
        reactException: err.stack || err.message,
        urlGenerated: false,
      });
      setDiagStep('exception_caught');
      setDiagBackendStatus('Network / Client exception');
      setDiagLastException(err.message || String(err));
    } finally {
      setConnectingStripe(false);
    }
  };

  const handleOpenStripeDashboard = async () => {
    if (!user) return;
    setOpeningDashboard(true);
    setNotice('');
    setDiagStep('opening_express_dashboard');

    try {
      const res = await fetch('/api/stripe/dashboard-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });

      const data = await res.json();
      if (data.url) {
        if (isIframe) {
          setOnboardingUrl(data.url);
        } else {
          try {
            if (window.top && window.top !== window.self) {
              window.top.location.href = data.url;
            } else {
              window.location.href = data.url;
            }
          } catch {
            setOnboardingUrl(data.url);
          }
        }
      } else {
        setNotice(data.error || 'Could not generate Stripe Express dashboard link.');
        setNoticeType('error');
      }
    } catch (err: any) {
      setNotice('Could not open Stripe Express dashboard. Please try again.');
      setNoticeType('error');
    } finally {
      setOpeningDashboard(false);
    }
  };

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-8 h-8 rounded-full border-2 border-[#7427DF] border-t-transparent animate-spin" />
      </div>
    );
  }

  // Calculate verified gross and net totals
  const ledgerAggregates = calculateLedgerAggregates(tips, feeConfig.percent, feeConfig.fixedCents);
  const confirmedTips = ledgerAggregates.completedTips;
  const totalGrossCents = ledgerAggregates.completedGrossCents;
  const totalNetCents = ledgerAggregates.completedNetCents;

  const availableCents = balance?.available?.[0]?.amount || 0;
  const pendingCents = balance?.pending?.[0]?.amount || 0;

  // Render Recoverable Branded Error Screen when payout connection fails
  if (payoutError.hasError) {
    return (
      <div className="min-h-screen bg-[#08051B] text-white p-4 sm:p-8 font-sans selection:bg-[#7928FF] selection:text-white flex items-center justify-center">
        <div className="max-w-xl w-full surface-royal-elevated rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 text-left">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/70 text-rose-400 flex items-center justify-center border border-rose-800 shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-950/70 text-rose-400 text-[10px] font-bold uppercase tracking-wider border border-rose-800">
                {payoutError.category}
              </span>
              <h2 className="font-headline text-xl sm:text-2xl font-black text-white mt-0.5">
                We couldn’t connect your payouts
              </h2>
            </div>
          </div>

          <p className="text-xs text-[#77717E] leading-relaxed mb-5">
            Something interrupted your Stripe connection. Your account is safe, and you can try again.
          </p>

          {/* Structured Detail Box */}
          <div className="bg-[#F5EEFF]/40 border border-[#E8E2EF] rounded-2xl p-4 space-y-2 mb-6 text-xs">
            {payoutError.code && (
              <div className="flex items-center justify-between">
                <span className="text-[#77717E] font-medium">Error Code:</span>
                <span className="font-mono font-bold text-[#7427DF]">{payoutError.code}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[#77717E] font-medium">Failed Step:</span>
              <span className="font-bold text-[#17131D]">{payoutError.step}</span>
            </div>
            <div className="pt-2 border-t border-[#E8E2EF]">
              <p className="text-[#17131D] font-medium leading-relaxed">
                {payoutError.explanation}
              </p>
            </div>
            <div className="pt-1">
              <p className="text-[11px] text-[#7427DF] font-bold">
                Next action: {payoutError.recommendedAction}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
            <button
              onClick={handleConnectStripe}
              disabled={connectingStripe}
              className="w-full sm:w-auto flex-1 py-3 px-6 rounded-xl bg-[#7427DF] hover:bg-[#5819B8] text-white font-black text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`w-4 h-4 ${connectingStripe ? 'animate-spin' : ''}`} />
              <span>{connectingStripe ? 'Connecting...' : 'Try Again'}</span>
            </button>
            <button
              onClick={() => onNavigate('settings')}
              className="w-full sm:w-auto py-3 px-5 rounded-xl bg-[#F5EEFF] hover:bg-[#F5EEFF]/80 text-[#7427DF] font-bold text-xs transition border border-[#7427DF]/20 cursor-pointer text-center"
            >
              Return to Settings
            </button>
            <button
              onClick={() => setPayoutError((prev) => ({ ...prev, hasError: false }))}
              className="w-full sm:w-auto py-3 px-4 rounded-xl bg-white border border-[#E8E2EF] text-[#77717E] hover:text-[#17131D] font-medium text-xs transition cursor-pointer text-center"
            >
              Dismiss
            </button>
          </div>

          {/* Expandable Technical Details */}
          <div className="border-t border-[#E8E2EF] pt-4">
            <button
              onClick={() => setShowTechDetails(!showTechDetails)}
              className="w-full flex items-center justify-between text-xs font-bold text-[#77717E] hover:text-[#17131D] cursor-pointer"
            >
              <span>Technical Error Details</span>
              {showTechDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showTechDetails && (
              <div className="mt-3 p-3.5 rounded-xl bg-stone-50 border border-[#E8E2EF] text-[11px] font-mono space-y-1.5 text-[#17131D] break-all">
                <p><strong>Actual Error:</strong> {payoutError.actualErrorMessage}</p>
                <p><strong>HTTP Status:</strong> {payoutError.httpStatus ?? 'N/A'}</p>
                <p><strong>Endpoint:</strong> {payoutError.endpoint}</p>
                <p><strong>Onboarding URL Generated:</strong> {payoutError.urlGenerated ? 'YES' : 'NO'}</p>
                <p><strong>Preview Embedded (iframe):</strong> {isIframe ? 'YES (Google AI Studio Preview)' : 'NO'}</p>
                {isIframe && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-sans mt-2">
                    <p className="font-bold">Google AI Studio Preview Environment Note:</p>
                    <p className="mt-0.5">Stripe onboarding cannot open inside this preview iframe. Open TipZeMe in a separate browser tab to continue.</p>
                    <a
                      href={window.location.origin + window.location.pathname + '#payouts'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-[#7427DF] text-white rounded-lg text-xs font-bold"
                    >
                      <span>Open in Separate Browser Tab</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
                {payoutError.reactException && (
                  <p><strong>Exception Details:</strong> {payoutError.reactException}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08051B] text-white pb-24 font-sans selection:bg-[#7928FF] selection:text-white">
      <main className="max-w-5xl mx-auto px-4 pt-6 sm:pt-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#7928FF]/20 mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('dashboard')}
              className="p-2 rounded-xl bg-[#120A2B] border border-[#7928FF]/30 text-[#D49BFF] hover:text-white hover:bg-[#1B103B] transition cursor-pointer"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-headline text-2xl font-black text-white">Earnings &amp; Bank Payouts</h1>
                {stripeConfig?.isLiveMode ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#7928FF]/20 text-[#D49BFF] text-[10px] font-bold uppercase tracking-wider border border-[#7928FF]/40">
                    Stripe Live Mode
                  </span>
                ) : stripeConfig?.configured ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-950/70 text-amber-300 text-[10px] font-bold uppercase tracking-wider border border-amber-700/60">
                    Stripe Test Mode
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-950/70 text-rose-300 text-[10px] font-bold uppercase tracking-wider border border-rose-800">
                    Setup Required
                  </span>
                )}
              </div>
              <p className="text-xs text-[#C9BFDF] mt-1">
                Direct payouts to your bank account via Stripe Connect Express.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadStripeData}
              disabled={loadingData}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F5EEFF]/50 text-xs font-bold text-[#17131D] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 border border-[#E8E2EF]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin text-[#7427DF]' : 'text-[#7427DF]'}`} />
              <span>Refresh Balance</span>
            </button>
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-4 py-2 rounded-xl bg-[#7427DF] hover:bg-[#5819B8] text-white text-xs font-black transition cursor-pointer shadow-sm"
            >
              Dashboard
            </button>
          </div>
        </div>

        {/* Development Diagnostic Panel (Diagnostic & Visible Failure Inspection) */}
        <div className="mb-6 rounded-3xl bg-white border border-[#E8E2EF] shadow-sm overflow-hidden">
          <button
            onClick={() => setShowDiagPanel(!showDiagPanel)}
            className="w-full px-5 py-3.5 bg-[#F5EEFF]/60 hover:bg-[#F5EEFF] transition flex items-center justify-between text-left cursor-pointer border-b border-[#E8E2EF]"
          >
            <div className="flex items-center gap-2">
              <Bug className="w-4 h-4 text-[#7427DF]" />
              <span className="text-xs font-black text-[#17131D]">
                Connect Payouts Diagnostic Panel
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#E8E2EF] text-[#7427DF] font-mono">
                {isIframe ? 'Preview Iframe Mode' : 'Standalone Window'}
              </span>
            </div>
            {showDiagPanel ? (
              <ChevronUp className="w-4 h-4 text-[#77717E]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#77717E]" />
            )}
          </button>

          {showDiagPanel && (
            <div className="p-5 space-y-3 bg-white text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-[#F5EEFF]/40 border border-[#E8E2EF]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#77717E] block">
                    Current Step
                  </span>
                  <span className="font-mono font-bold text-[#7427DF] text-xs break-all">
                    {diagStep}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-[#F5EEFF]/40 border border-[#E8E2EF]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#77717E] block">
                    Backend Status
                  </span>
                  <span className="font-mono font-bold text-[#17131D] text-xs">
                    {diagBackendStatus}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-[#F5EEFF]/40 border border-[#E8E2EF]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#77717E] block">
                    HTTP Response Code
                  </span>
                  <span className="font-mono font-bold text-[#17131D] text-xs">
                    {diagHttpStatus ? `${diagHttpStatus}` : 'None'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-[#F5EEFF]/40 border border-[#E8E2EF]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#77717E] block">
                    Stripe Error Code
                  </span>
                  <span className={`font-mono font-bold text-xs ${diagStripeCode !== 'none' ? 'text-red-600' : 'text-[#7427DF]'}`}>
                    {diagStripeCode}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-[#F5EEFF]/40 border border-[#E8E2EF]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#77717E] block">
                    Firebase Auth Status
                  </span>
                  <span className="font-mono text-xs text-[#17131D]">
                    {user ? `Authenticated (${user.uid.slice(0, 10)}...)` : 'Unauthenticated'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-[#F5EEFF]/40 border border-[#E8E2EF]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#77717E] block">
                    Navigation Target
                  </span>
                  <span className="font-mono text-xs text-[#17131D]">
                    {diagNavType}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-[#F5EEFF]/40 border border-[#E8E2EF]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#77717E] block">
                    Preview Iframe Active
                  </span>
                  <span className={`font-mono font-bold text-xs ${isIframe ? 'text-amber-600' : 'text-[#77717E]'}`}>
                    {isIframe ? 'YES (iframe detected)' : 'NO (standalone)'}
                  </span>
                </div>
              </div>

              {diagLastException && (
                <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 font-mono text-[11px]">
                  <strong>Last Exception:</strong> {diagLastException}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleConnectStripe}
                  disabled={connectingStripe}
                  className="px-4 py-2 rounded-xl bg-[#7427DF] hover:bg-[#5819B8] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${connectingStripe ? 'animate-spin' : ''}`} />
                  <span>{connectingStripe ? 'Testing Onboarding...' : 'Run Diagnostics & Test Onboarding'}</span>
                </button>
                <button
                  onClick={loadStripeData}
                  disabled={loadingData}
                  className="px-3.5 py-2 rounded-xl bg-white border border-[#E8E2EF] text-[#17131D] font-bold text-xs hover:bg-[#F5EEFF]/50 cursor-pointer"
                >
                  Re-fetch Payout Status
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notice Banner */}
        {notice && (
          <div
            className={`mb-6 p-4 rounded-2xl text-xs font-medium flex items-start justify-between gap-3 border ${
              noticeType === 'success'
                ? 'bg-[#F5EEFF] border-[#E8E2EF] text-[#7427DF]'
                : noticeType === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : noticeType === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-[#F5EEFF] border-[#7427DF]/20 text-[#7427DF]'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {noticeType === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[#7427DF] shrink-0 mt-0.5" />
              ) : noticeType === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold">{notice}</p>
              </div>
            </div>
            <button
              onClick={() => setNotice('')}
              className="text-[#77717E] hover:text-[#17131D] text-sm font-bold"
              aria-label="Dismiss notice"
            >
              ✕
            </button>
          </div>
        )}

        {/* Payout Connection Status Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E8E2EF] shadow-md mb-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#F5EEFF] flex items-center justify-center text-[#7427DF] shrink-0 border border-[#7427DF]/20">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black text-[#17131D]">Bank Account & Payout Status</h3>
                  {accountStatus?.payoutsEnabled ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-[#F5EEFF] text-[#7427DF] px-2.5 py-0.5 rounded-full border border-[#E8E2EF]">
                      <CheckCircle2 className="w-3 h-3 text-[#7427DF]" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200">
                      <Clock className="w-3 h-3" /> Setup Required
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#77717E] mt-1 leading-relaxed max-w-xl">
                  {accountStatus?.payoutsEnabled
                    ? 'Your bank account is verified. Stripe automatically routes tips to your connected bank on a daily rolling schedule.'
                    : 'Connect your checking account or debit card via Stripe Connect Express so tips can transfer directly to your bank.'}
                </p>

                {accountStatus?.accountId && (
                  <p className="text-[11px] font-mono text-[#77717E] mt-2">
                    Stripe Account ID: <span className="text-[#17131D] font-bold">{accountStatus.accountId}</span>
                  </p>
                )}

                {/* Outstanding Onboarding Requirements from Stripe */}
                {!accountStatus?.payoutsEnabled && accountStatus?.requirements?.currentlyDue?.length > 0 && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs">
                    <p className="font-bold text-amber-900 mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      Outstanding Stripe Requirements:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800 font-medium">
                      {accountStatus.requirements.currentlyDue.map((req: string) => {
                        let label = req;
                        if (req === 'external_account') label = 'Bank account or debit card for direct payouts';
                        else if (req.startsWith('individual.address')) label = 'Residential street address';
                        else if (req.startsWith('individual.dob')) label = 'Date of birth';
                        else if (req.startsWith('individual.ssn')) label = 'Last 4 digits of SSN';
                        else if (req.startsWith('individual.phone')) label = 'Phone verification';
                        else if (req.startsWith('business_profile.url')) label = 'Website or public social link';
                        else if (req.startsWith('tos_acceptance')) label = 'Terms of service acceptance';
                        return <li key={req}>{label}</li>;
                      })}
                    </ul>
                  </div>
                )}

                {/* Preserved Duplicate Stripe Accounts Notice */}
                {accountStatus?.duplicateAccounts?.length > 0 && (
                  <div className="mt-3 p-3 rounded-2xl bg-[#F5F3FF] border border-[#EDE9FE] text-[11px] text-[#71717A]">
                    <span className="font-bold text-[#7C3AED]">Duplicate Account Protection: </span>
                    Found {accountStatus.duplicateAccounts.length} previous connection attempts on Stripe. They have been preserved for review without creating new accounts. Active mapped account: <strong className="font-mono text-[#18181B]">{accountStatus.accountId}</strong>.
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0 flex flex-col gap-2">
              {!accountStatus?.hasAccount ? (
                <button
                  onClick={handleConnectStripe}
                  disabled={connectingStripe}
                  className="px-5 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#5B21B6] text-white font-black text-xs transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{connectingStripe ? 'Connecting...' : 'Connect payouts'}</span>
                </button>
              ) : !accountStatus?.payoutsEnabled ? (
                <button
                  onClick={handleOpenStripeDashboard}
                  disabled={openingDashboard}
                  className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>{openingDashboard ? 'Opening...' : 'Complete payout setup'}</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleOpenStripeDashboard}
                  disabled={openingDashboard}
                  className="px-5 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#5B21B6] text-white font-black text-xs transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>{openingDashboard ? 'Opening...' : 'Payouts connected'}</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Real Balance & Earnings Metric Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-5 rounded-3xl bg-white border border-[#E4E4E7] shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-[#71717A] block mb-2">
              Available in Stripe
            </span>
            <div className="text-3xl font-black text-[#7C3AED] font-mono tabular-nums">
              ${(availableCents / 100).toFixed(2)}
            </div>
            <p className="text-[11px] text-[#71717A] mt-1">Ready for next automatic transfer</p>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-[#E4E4E7] shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-[#71717A] block mb-2">
              Pending in Stripe
            </span>
            <div className="text-3xl font-black text-[#18181B] font-mono tabular-nums">
              ${(pendingCents / 100).toFixed(2)}
            </div>
            <p className="text-[11px] text-[#71717A] mt-1">Clearing card payment rails (1–2 days)</p>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-[#E4E4E7] shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-[#71717A] block mb-2">
              Net Creator Payouts
            </span>
            <div className="text-3xl font-black text-[#16A34A] font-mono tabular-nums">
              ${(totalNetCents / 100).toFixed(2)}
            </div>
            <p className="text-[11px] text-[#71717A] mt-1">Lifetime earnings after platform fee</p>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-[#E4E4E7] shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-[#71717A] block mb-2">
              Gross Tips Received
            </span>
            <div className="text-3xl font-black text-[#18181B] font-mono tabular-nums">
              ${(totalGrossCents / 100).toFixed(2)}
            </div>
            <p className="text-[11px] text-[#71717A] mt-1">{confirmedTips.length} verified tip contributions</p>
          </div>
        </div>

        {/* Automatic Payout Schedule Explanation */}
        <div className="p-6 rounded-3xl bg-white border border-[#E4E4E7] shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-[#7C3AED] shrink-0" />
            <div>
              <h4 className="text-sm font-black text-[#18181B]">Stripe-Managed Automatic Payouts</h4>
              <p className="text-xs text-[#71717A] mt-0.5">
                Stripe automatically transfers available funds to your linked bank account on a daily rolling schedule (2 business day delay). No manual cash-out required.
              </p>
            </div>
          </div>
          <div className="shrink-0 text-xs font-mono font-bold text-[#7C3AED] bg-[#F5F3FF] px-3 py-1.5 rounded-xl border border-[#EDE9FE]">
            Schedule: Daily Rolling
          </div>
        </div>

        {/* Payout History Section */}
        <div className="bg-white rounded-3xl border border-[#E8E2EF] shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-[#E8E2EF] flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#17131D]">Stripe Bank Transfers</h3>
            <span className="text-xs text-[#77717E] font-mono">{payouts.length} transfers</span>
          </div>

          {payouts.length === 0 ? (
            <div className="p-10 text-center text-xs text-[#77717E] space-y-1">
              <p className="font-bold text-[#17131D]">No bank payouts initiated yet</p>
              <p className="text-[11px] text-[#77717E]">
                When supporters tip you, funds clear into your available balance and transfer automatically to your bank.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#E8E2EF]">
              {payouts.map((p) => (
                <div key={p.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-[#F5EEFF]/20 transition">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#17131D] text-xs font-mono">{p.id}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.status === 'paid'
                            ? 'bg-[#F5EEFF] text-[#7427DF] border border-[#E8E2EF]'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#77717E] mt-0.5">
                      Estimated arrival:{' '}
                      {p.arrival_date ? new Date(p.arrival_date * 1000).toLocaleDateString() : 'Pending'}
                    </p>
                  </div>
                  <div className="text-right font-black text-[#17131D] text-sm font-mono">
                    ${(p.amount / 100).toFixed(2)} {p.currency?.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Platform Fee Disclosure */}
        <div className="p-6 rounded-3xl bg-[#F5EEFF]/30 border border-[#E8E2EF] text-xs text-[#77717E] space-y-1">
          <p className="font-bold text-[#17131D] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#7427DF]" />
            <span>Platform Fee Schedule: 1% + $0.05 per tip</span>
          </p>
          <p className="text-[11px] leading-relaxed text-[#77717E]">
            TipZeMe applies a 1% + $0.05 fee per tip via Stripe Connect's application fee amount. Funds transfer directly to your connected account and automatic payouts deposit straight into your checking account or debit card.
          </p>
        </div>
      </main>

      {/* Onboarding Navigation Modal (Prevents Iframe Blank Screen) */}
      {onboardingUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8E2EF] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setOnboardingUrl(null)}
              className="absolute top-4 right-4 text-[#77717E] hover:text-[#17131D] p-1 rounded-xl hover:bg-[#F5EEFF] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-[#F5EEFF] text-[#7427DF] flex items-center justify-center mx-auto mb-4 border border-[#7427DF]/20">
              <CreditCard className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-[#17131D] text-center">
              Complete Stripe Onboarding
            </h3>

            <p className="text-xs text-[#77717E] text-center mt-2 leading-relaxed">
              Stripe requires bank setup to open in a full browser tab for security (Stripe security blocks rendering inside iframe previews).
            </p>

            <div className="mt-6 space-y-3">
              <a
                href={onboardingUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOnboardingUrl(null)}
                className="w-full py-3.5 rounded-2xl bg-[#7427DF] hover:bg-[#5819B8] text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer text-center"
              >
                <span>Open Stripe Onboarding in New Tab</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <a
                href={window.location.origin + window.location.pathname + '#payouts'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-2xl bg-[#F5EEFF] hover:bg-[#F5EEFF]/80 text-[#7427DF] font-bold text-xs flex items-center justify-center gap-1.5 transition border border-[#7427DF]/20 cursor-pointer text-center"
              >
                <span>Open TipZeMe in Standalone Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
