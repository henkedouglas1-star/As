import { authenticatedFetch } from '../lib/authenticatedFetch';
import React, { useEffect } from 'react';

interface ReferralTrackerProps {
  currentUser?: { uid: string } | null;
}

export const ReferralTracker: React.FC<ReferralTrackerProps> = ({ currentUser }) => {
  useEffect(() => {
    // Check URL path or query params for /ref/{code}
    const path = window.location.pathname;
    const hash = window.location.hash;
    
    let refCode: string | null = null;

    const pathMatch = path.match(/^\/ref\/([a-zA-Z0-9_-]+)/);
    if (pathMatch && pathMatch[1]) {
      refCode = pathMatch[1];
    } else {
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
      refCode = urlParams.get('ref') || hashParams.get('ref');
    }

    if (refCode) {
      localStorage.setItem('tipzeme_ref', refCode);
      // Set cookie for 90 days
      document.cookie = `tipzeme_ref=${refCode}; path=/; max-age=${90 * 24 * 60 * 60}; SameSite=Lax`;
      console.log(`[Affiliate] Captured referral code: @${refCode}`);
    }
  }, []);

  useEffect(() => {
    // If user is authenticated, check for pending referral attribution
    const registerAttribution = async () => {
      if (!currentUser?.uid) return;
      
      const storedRef = localStorage.getItem('tipzeme_ref');
      if (!storedRef) return;

      try {
        const res = await authenticatedFetch('/api/affiliate/attribution', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            referredUserId: currentUser.uid,
            partnerCode: storedRef,
          }),
        });

        const data = await res.json();
        if (data.success) {
          console.log('[Affiliate] Referral attribution successfully registered for user:', currentUser.uid);
          localStorage.removeItem('tipzeme_ref'); // clear once bound
        }
      } catch (err) {
        console.warn('[Affiliate] Notice registering attribution:', err);
      }
    };

    registerAttribution();
  }, [currentUser]);

  return null;
};
