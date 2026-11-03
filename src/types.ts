export interface SupportGoal {
  id: string;
  title: string;
  targetAmountDollars: number;
  currentAmountDollars: number;
  description?: string;
  isActive: boolean;
  createdAt: number;
}

export interface SocialLinks {
  instagram?: string;
  threads?: string;
  tiktok?: string;
  twitter?: string;
  youtube?: string;
  twitch?: string;
  website?: string;
  spotify?: string;
}

export interface AvatarCropState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  email: string;
  bio?: string;
  supportMessage?: string;
  avatarUrl?: string;
  photoURL?: string;
  originalPhotoURL?: string;
  avatarCropState?: AvatarCropState;
  accentColor?: string;
  socialLinks?: SocialLinks;
  showTotalTips?: boolean;
  showSupporters?: boolean;
  stripeAccountId?: string;
  chargesEnabled: boolean;
  activeGoal?: SupportGoal | null;
  referredBy?: string | null;
  createdAt: number;
  updatedAt?: number;
}

export interface TipTransaction {
  id: string;
  recipientId: string;
  recipientUsername: string;
  amountCents: number;
  currency: string;
  supporterName: string;
  supporterAvatarUrl?: string;
  supporterIsPublic?: boolean;
  message?: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded' | 'expired' | 'disputed';
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  platformFeeCents?: number;
  stripeFeeCents?: number;
  netAmountCents?: number;
  refundedAt?: number;
  disputedAt?: number;
  disputeId?: string;
  disputeStatus?: string;
  goalId?: string | null;
  referralSource?: string | null;
  createdAt: number;
  completedAt?: number;
}

export interface CreatorStats {
  totalGrossCents: number;
  supportersCount: number;
  averageTipCents: number;
}

export interface ReportItem {
  id: string;
  username: string;
  reason: string;
  details?: string;
  createdAt: number;
}
