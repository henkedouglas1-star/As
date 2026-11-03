import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import LandingPage from './pages/LandingPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import PublicTipJarPage from './pages/PublicTipJarPage';
import SuccessPage from './pages/SuccessPage';
import SettingsPage from './pages/SettingsPage';
import SignInPage from './pages/SignInPage';
import LegalPage from './pages/LegalPage';
import EditProfilePage from './pages/EditProfilePage';
import EarningsPayoutsPage from './pages/EarningsPayoutsPage';
import GrowthAnalyticsPage from './pages/GrowthAnalyticsPage';
import ActivityPage from './pages/ActivityPage';
import AffiliatePage from './pages/AffiliatePage';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineIndicator from './components/OfflineIndicator';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<string>('landing');
  const [referralCode, setReferralCode] = useState<string>('');
  const [successInfo, setSuccessInfo] = useState<{
    creatorName: string;
    creatorHandle: string;
    amount: string;
  }>({
    creatorName: 'Alex Morgan',
    creatorHandle: 'alex',
    amount: '5.00',
  });

  // Sync with URL location / hash on mount and hashchange
  useEffect(() => {
    function parseRoute() {
      const hash = window.location.hash.replace(/^#/, '');
      const searchParams = new URLSearchParams(window.location.search);

      // Check referral query param
      const ref = searchParams.get('ref');
      if (ref) {
        setReferralCode(ref);
      }

      // Check success query params
      if (hash.startsWith('success') || window.location.pathname === '/success') {
        const creator = searchParams.get('creator') || 'Alex Morgan';
        const handle = searchParams.get('handle') || 'alex';
        const amount = searchParams.get('amount') || '5.00';
        setSuccessInfo({
          creatorName: creator,
          creatorHandle: handle,
          amount,
        });
        setCurrentRoute('success');
        return;
      }

      const knownRoutes = [
        'onboarding',
        'dashboard',
        'activity',
        'settings',
        'signin',
        'legal',
        'landing',
        'edit-profile',
        'payouts',
        'earnings',
        'growth',
        'analytics',
        'affiliate',
        'partners',
        'how-it-works',
      ];

      if (hash) {
        const hashBase = hash.split('?')[0];
        if (hashBase === 'how-it-works') {
          setCurrentRoute('landing');
          setTimeout(() => {
            const el = document.getElementById('how-it-works');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 80);
        } else if (hashBase.startsWith('ref/')) {
          const refUser = hashBase.replace('ref/', '');
          setReferralCode(refUser);
          setCurrentRoute('onboarding');
        } else if (hashBase.startsWith('jar:')) {
          setCurrentRoute(hashBase);
        } else if (knownRoutes.includes(hashBase)) {
          setCurrentRoute(hashBase === 'earnings' ? 'payouts' : hashBase === 'partners' ? 'affiliate' : hashBase);
        } else {
          // If hash is a plain handle e.g. #alex
          setCurrentRoute(`jar:${hashBase}`);
        }
      } else {
        // Check pathname (e.g. /alex, /signin, /dashboard, /ref/username)
        const path = window.location.pathname.replace(/^\//, '').split('?')[0];
        if (path === 'how-it-works') {
          setCurrentRoute('landing');
          setTimeout(() => {
            const el = document.getElementById('how-it-works');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 80);
        } else if (path.startsWith('ref/')) {
          const refUser = path.replace('ref/', '');
          setReferralCode(refUser);
          setCurrentRoute('onboarding');
        } else if (knownRoutes.includes(path)) {
          setCurrentRoute(path === 'earnings' ? 'payouts' : path === 'partners' ? 'affiliate' : path);
        } else if (path && !['api', 'index.html', ''].includes(path)) {
          setCurrentRoute(`jar:${path}`);
        } else {
          setCurrentRoute('landing');
        }
      }
    }

    parseRoute();
    window.addEventListener('hashchange', parseRoute);
    return () => window.removeEventListener('hashchange', parseRoute);
  }, []);

  const handleNavigate = (route: string) => {
    if (route === 'how-it-works') {
      if (currentRoute !== 'landing') {
        setCurrentRoute('landing');
      }
      setTimeout(() => {
        const el = document.getElementById('how-it-works');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 80);
      return;
    }

    if (route.startsWith('success?')) {
      const search = route.replace('success?', '');
      const params = new URLSearchParams(search);
      setSuccessInfo({
        creatorName: params.get('creator') || 'Creator',
        creatorHandle: params.get('handle') || 'creator',
        amount: params.get('amount') || '5.00',
      });
      window.location.hash = 'success';
      setCurrentRoute('success');
      window.scrollTo(0, 0);
      return;
    }

    if (route.startsWith('onboarding?ref=')) {
      const ref = route.split('?ref=')[1];
      setReferralCode(ref);
      window.location.hash = 'onboarding';
      setCurrentRoute('onboarding');
      window.scrollTo(0, 0);
      return;
    }

    window.location.hash = route;
    setCurrentRoute(route);
    window.scrollTo(0, 0);
  };

  const renderCurrentView = () => {
    if (currentRoute === 'landing') {
      return <LandingPage onNavigate={handleNavigate} />;
    }
    if (currentRoute === 'signin') {
      return <SignInPage onNavigate={handleNavigate} />;
    }
    if (currentRoute === 'onboarding') {
      return <OnboardingPage onNavigate={handleNavigate} referralCode={referralCode} />;
    }
    if (currentRoute === 'dashboard') {
      return <DashboardPage onNavigate={handleNavigate} />;
    }
    if (currentRoute === 'activity') {
      return <ActivityPage onNavigate={handleNavigate} />;
    }
    if (currentRoute === 'edit-profile') {
      return <EditProfilePage onNavigate={handleNavigate} />;
    }
    if (currentRoute === 'payouts' || currentRoute === 'earnings') {
      return <EarningsPayoutsPage onNavigate={handleNavigate} />;
    }
    if (currentRoute === 'growth' || currentRoute === 'analytics') {
      return <GrowthAnalyticsPage onNavigate={handleNavigate} />;
    }
    if (currentRoute === 'affiliate' || currentRoute === 'partners') {
      return <AffiliatePage onNavigate={handleNavigate} />;
    }
    if (currentRoute === 'settings') {
      return <SettingsPage onNavigate={handleNavigate} />;
    }
    if (currentRoute === 'legal') {
      return <LegalPage onNavigate={handleNavigate} />;
    }
    if (currentRoute === 'success') {
      return (
        <SuccessPage
          creatorName={successInfo.creatorName}
          creatorHandle={successInfo.creatorHandle}
          amount={successInfo.amount}
          onNavigate={handleNavigate}
        />
      );
    }
    if (currentRoute.startsWith('jar:')) {
      const handle = currentRoute.replace('jar:', '');
      return <PublicTipJarPage username={handle} onNavigate={handleNavigate} />;
    }

    return <LandingPage onNavigate={handleNavigate} />;
  };

  const isPublicJar = currentRoute.startsWith('jar:') || currentRoute === 'success';

  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col font-sans bg-[#0A0912] text-white selection:bg-violet-600 selection:text-white">
        {/* Render global Navbar unless on distraction-free public tipping page */}
        {!isPublicJar && (
          <Navbar onNavigate={handleNavigate} currentRoute={currentRoute} />
        )}
        <div className="flex-1">
          <ErrorBoundary onReset={() => setCurrentRoute('landing')}>
            {renderCurrentView()}
          </ErrorBoundary>
        </div>
        {/* Mobile Bottom Navigation for authenticated user */}
        <BottomNav currentRoute={currentRoute} onNavigate={handleNavigate} />
        <OfflineIndicator />
      </div>
    </AuthProvider>
  );
}
