export type AffiliateTier = 'partner' | 'pro' | 'elite';

export interface AffiliateProfile {
  userId: string;
  partnerCode: string;
  tier: AffiliateTier;
  activatedReferralsCount: number;
  commissionRate: number; // 0.20, 0.35, 0.50
  status: 'active' | 'suspended' | 'pending';
  termsVersion: string;
  termsAcceptedAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface ReferralAttribution {
  referredUserId: string;
  affiliateUserId: string;
  partnerCode: string;
  attributedAt: number;
  expiresAt: number; // 12 months from activation
  status: 'pending' | 'activated' | 'expired';
}

export interface ReferralActivation {
  referredUserId: string;
  affiliateUserId: string;
  firstTipId: string;
  activatedAt: number;
  eligibleContributionCents: number;
}

export type CommissionState = 'pending' | 'available' | 'on_hold' | 'paid' | 'reversed';

export interface CommissionLedgerEntry {
  ledgerId: string;
  affiliateUserId: string;
  referredUserId: string;
  sourceTipId: string;
  platformFeeCents: number;
  platformNetContributionCents: number;
  tierRate: number;
  commissionCents: number;
  state: CommissionState;
  availableAt: number; // 30-day hold from accrual
  createdAt: number;
  updatedAt: number;
}

export interface AffiliatePayoutBatch {
  batchId: string;
  totalAmountCents: number;
  status: 'draft' | 'approved' | 'processing' | 'paid' | 'failed';
  approvedByAdminId: string | null;
  createdAt: number;
  paidAt: number | null;
}

export interface AffiliatePayout {
  payoutId: string;
  batchId: string;
  affiliateUserId: string;
  amountCents: number;
  currency: string;
  stripeTransferId: string | null;
  status: 'pending' | 'succeeded' | 'failed';
  createdAt: number;
}

export interface AffiliateAuditEvent {
  eventId: string;
  adminUserId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, any>;
  timestamp: number;
}

export interface AffiliateTierConfig {
  name: AffiliateTier;
  label: string;
  minReferrals: number;
  maxReferrals: number | null;
  commissionRate: number;
}

export const AFFILIATE_TIERS: Record<AffiliateTier, AffiliateTierConfig> = {
  partner: {
    name: 'partner',
    label: 'Partner',
    minReferrals: 0,
    maxReferrals: 9,
    commissionRate: 0.20,
  },
  pro: {
    name: 'pro',
    label: 'Pro Partner',
    minReferrals: 10,
    maxReferrals: 49,
    commissionRate: 0.35,
  },
  elite: {
    name: 'elite',
    label: 'Elite Partner',
    minReferrals: 50,
    maxReferrals: null,
    commissionRate: 0.50,
  },
};

export function calculateAffiliateTier(activatedCount: number): AffiliateTier {
  if (activatedCount >= 50) return 'elite';
  if (activatedCount >= 10) return 'pro';
  return 'partner';
}

export function calculateCommissionAmount(netContributionCents: number, rate: number): number {
  return Math.round(netContributionCents * rate);
}
