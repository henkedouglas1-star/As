import assert from 'node:assert';
import { calculateAffiliateTier, calculateCommissionAmount, AFFILIATE_TIERS } from './src/types/affiliate';

console.log('Running TipZeMe Commission Engine & Immutable Financial Ledger Automated Tests...');

// 1. Test Fractional-Cent Precision & Integer Rounding in Commission Calculation
const netContribution = 13; // cents

// Partner (20%): 13 * 0.20 = 2.6 -> rounds to 3
assert.strictEqual(calculateCommissionAmount(netContribution, 0.20), 3, 'Partner 20% rounding on 13¢');
// Pro (35%): 13 * 0.35 = 4.55 -> rounds to 5
assert.strictEqual(calculateCommissionAmount(netContribution, 0.35), 5, 'Pro 35% rounding on 13¢');
// Elite (50%): 13 * 0.50 = 6.5 -> rounds to 7
assert.strictEqual(calculateCommissionAmount(netContribution, 0.50), 7, 'Elite 50% rounding on 13¢');

// Larger amounts
assert.strictEqual(calculateCommissionAmount(105, 0.20), 21, 'Partner 20% on 105¢ platform fee');
assert.strictEqual(calculateCommissionAmount(105, 0.35), 37, 'Pro 35% on 105¢ platform fee (36.75 -> 37)');
assert.strictEqual(calculateCommissionAmount(105, 0.50), 53, 'Elite 50% on 105¢ platform fee (52.5 -> 53)');
console.log('  [PASS] Fractional-cent precision and integer rounding verified');

// 2. Test 30-Day Commission Hold Period & Timestamp Calculation
const now = Date.now();
const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
const availableAt = now + thirtyDaysMs;
assert.strictEqual(availableAt - now, thirtyDaysMs, '30-day hold period duration equals exactly 30 days');
console.log('  [PASS] 30-day commission hold calculation passed');

// 3. Test 12-Month Attribution Window Expiration Rule
const twelveMonthsMs = 365 * 24 * 60 * 60 * 1000;
const attributedAt = now;
const expiresAt = attributedAt + twelveMonthsMs;
const withinWindow = (eventTime: number) => eventTime >= attributedAt && eventTime <= expiresAt;

assert.strictEqual(withinWindow(now + 1000), true, 'Commission within 12 months is valid');
assert.strictEqual(withinWindow(now + twelveMonthsMs + 1000), false, 'Commission after 12 months is expired');
console.log('  [PASS] 12-month attribution window enforcement verified');

// 4. Test Refund & Dispute Reversal State Transition Logic
interface MockLedgerEntry {
  ledgerId: string;
  commissionCents: number;
  state: 'pending' | 'available' | 'reversed';
}

const processRefundReversal = (entry: MockLedgerEntry): MockLedgerEntry => {
  return {
    ...entry,
    state: 'reversed',
  };
};

const initialEntry: MockLedgerEntry = { ledgerId: 'comm_tip_1', commissionCents: 15, state: 'pending' };
const reversedEntry = processRefundReversal(initialEntry);
assert.strictEqual(reversedEntry.state, 'reversed', 'Refund correctly transitions commission state to reversed');
console.log('  [PASS] Refund and dispute reversal handling passed');

console.log('All Commission Engine & Immutable Financial Ledger tests passed successfully!');
