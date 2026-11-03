import { BRAND_WEBSITE_URL, BRAND_DOMAIN } from './constants';

/**
 * Canonical URL Utility for TipZeMe
 * Centralizes public profile and referral URL generation across the entire application
 * ensuring absolute consistency between dashboard, share modals, QR codes,
 * social cards, and table tent signs.
 */

export function getBrandWebsiteUrl(): string {
  return BRAND_WEBSITE_URL;
}

export function getBrandDomain(): string {
  return BRAND_DOMAIN;
}

export function getCanonicalProfileUrl(username: string): string {
  const cleanUsername = (username || '').toLowerCase().trim().replace(/^@/, '');
  
  let configuredPublicUrl = '';
  try {
    if (typeof window !== 'undefined' && (window as any).__PUBLIC_APP_URL__) {
      configuredPublicUrl = String((window as any).__PUBLIC_APP_URL__);
    }
  } catch {
    // ignore
  }

  const runtimeOrigin =
    typeof window !== 'undefined' && window.location && window.location.origin
      ? window.location.origin
      : 'https://ais-dev-lachnnqknocd4j6rwmfjol-618639502215.us-west2.run.app';

  const baseOrigin = configuredPublicUrl || runtimeOrigin;

  if (!cleanUsername) {
    return baseOrigin;
  }

  return `${baseOrigin.replace(/\/$/, '')}/${cleanUsername}`;
}

export function getCanonicalReferralUrl(partnerCode: string): string {
  const cleanCode = (partnerCode || '').toLowerCase().trim().replace(/^@/, '');
  
  let configuredPublicUrl = '';
  try {
    if (typeof window !== 'undefined' && (window as any).__PUBLIC_APP_URL__) {
      configuredPublicUrl = String((window as any).__PUBLIC_APP_URL__);
    }
  } catch {
    // ignore
  }

  const runtimeOrigin =
    typeof window !== 'undefined' && window.location && window.location.origin
      ? window.location.origin
      : 'https://ais-dev-lachnnqknocd4j6rwmfjol-618639502215.us-west2.run.app';

  const baseOrigin = configuredPublicUrl || runtimeOrigin;

  if (!cleanCode) {
    return `${baseOrigin.replace(/\/$/, '')}/ref`;
  }

  return `${baseOrigin.replace(/\/$/, '')}/ref/${cleanCode}`;
}

export function formatDisplayProfileUrl(username: string): string {
  const cleanUsername = (username || '').toLowerCase().trim().replace(/^@/, '');
  return `${BRAND_DOMAIN}/${cleanUsername}`;
}

export function formatDisplayReferralUrl(partnerCode: string): string {
  const cleanCode = (partnerCode || '').toLowerCase().trim().replace(/^@/, '');
  return `${BRAND_DOMAIN}/ref/${cleanCode}`;
}

