import { RESERVED_USERNAMES, MIN_TIP_DOLLARS, MAX_TIP_DOLLARS } from './constants';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export const USERNAME_CHANGE_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function normalizeUsername(username: string): string {
  return (username || '').toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
}

export function validateUsername(username: string): ValidationResult {
  const normalized = (username || '').toLowerCase().trim();

  if (!normalized) {
    return { valid: false, error: 'Username is required' };
  }

  if (normalized.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }

  if (normalized.length > 24) {
    return { valid: false, error: 'Username cannot exceed 24 characters' };
  }

  if (!/^[a-z0-9_]+$/.test(normalized)) {
    return { valid: false, error: 'Only lowercase letters, numbers, and underscores are allowed' };
  }

  if (RESERVED_USERNAMES.has(normalized)) {
    return { valid: false, error: `"${normalized}" is a reserved system route` };
  }

  return { valid: true };
}

export function generateUsernameSuggestions(base: string): string[] {
  const clean = normalizeUsername(base) || 'vibes';
  const truncated = clean.slice(0, 16);
  const randomNum = Math.floor(Math.random() * 89 + 10);

  const candidates = [
    `${truncated}_tips`,
    `the_${truncated}`.slice(0, 24),
    `${truncated}${randomNum}`,
    `tip_${truncated}`.slice(0, 24),
    `${truncated}_hq`.slice(0, 24),
  ];

  return Array.from(new Set(candidates)).filter(
    (name) => validateUsername(name).valid
  );
}

export function canChangeUsername(lastChangedAt?: number): {
  allowed: boolean;
  daysRemaining?: number;
  nextAllowedDate?: string;
} {
  if (!lastChangedAt) {
    return { allowed: true };
  }

  const elapsed = Date.now() - lastChangedAt;
  if (elapsed >= USERNAME_CHANGE_COOLDOWN_MS) {
    return { allowed: true };
  }

  const msRemaining = USERNAME_CHANGE_COOLDOWN_MS - elapsed;
  const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
  const nextDate = new Date(lastChangedAt + USERNAME_CHANGE_COOLDOWN_MS).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    allowed: false,
    daysRemaining,
    nextAllowedDate: nextDate,
  };
}

export function validateTipAmount(dollars: number): ValidationResult {
  if (typeof dollars !== 'number' || isNaN(dollars)) {
    return { valid: false, error: 'Please enter a valid numeric amount' };
  }

  if (dollars < MIN_TIP_DOLLARS) {
    return { valid: false, error: `Minimum tip amount is $${MIN_TIP_DOLLARS}.00` };
  }

  if (dollars > MAX_TIP_DOLLARS) {
    return { valid: false, error: `Maximum tip amount is $${MAX_TIP_DOLLARS}.00` };
  }

  const parts = String(dollars).split('.');
  if (parts[1] && parts[1].length > 2) {
    return { valid: false, error: 'Tip amount can have at most 2 decimal places (cents)' };
  }

  return { valid: true };
}

export function calculateTipCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function calculatePlatformFee(
  amountCents: number,
  feePercent: number = 0,
  fixedCents: number = 0
): number {
  if (typeof amountCents !== 'number' || isNaN(amountCents) || amountCents <= 0) {
    return 0;
  }
  const percentAmount = feePercent > 0 ? Math.round(amountCents * (feePercent / 100)) : 0;
  const fixedAmount = fixedCents > 0 ? Math.round(fixedCents) : 0;
  const totalFee = percentAmount + fixedAmount;

  // Never allow fee to exceed the transaction amount or be negative
  return Math.min(amountCents, Math.max(0, totalFee));
}

export function calculateGoalProgress(currentDollars: number, targetDollars: number): number {
  if (!targetDollars || targetDollars <= 0) return 0;
  const percent = Math.round((currentDollars / targetDollars) * 100);
  return Math.min(100, Math.max(0, percent));
}

export interface TransactionEconomics {
  grossCents: number;
  stripeProcessingFeeCents: number;
  platformFeeCents: number;
  creatorTransferCents: number;
  platformNetCents: number;
  isPositiveMargin: boolean;
}

export function calculateTransactionEconomics(
  grossCents: number,
  feePercent: number = 1,
  fixedCents: number = 5,
  stripePercent: number = 2.9,
  stripeFixedCents: number = 30
): TransactionEconomics {
  const platformFeeCents = calculatePlatformFee(grossCents, feePercent, fixedCents);
  const stripeProcessingFeeCents = Math.round(grossCents * (stripePercent / 100)) + stripeFixedCents;
  const creatorTransferCents = Math.max(0, grossCents - stripeProcessingFeeCents - platformFeeCents);
  const platformNetCents = platformFeeCents;
  const isPositiveMargin = platformNetCents > 0;

  return {
    grossCents,
    stripeProcessingFeeCents,
    platformFeeCents,
    creatorTransferCents,
    platformNetCents,
    isPositiveMargin,
  };
}
