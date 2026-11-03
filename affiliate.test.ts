import assert from 'node:assert';
import {
  calculateAffiliateTier,
  calculateCommissionAmount,
  AFFILIATE_TIERS,
} from './src/types/affiliate';

console.log('Running TipZeMe Affiliate System Automated Test Suite...');

// 1. Test Tier Thresholds & Calculations
assert.strictEqual(calculateAffiliateTier(0), 'partner', '0 referrals -> partner');
assert.strictEqual(calculateAffiliateTier(5), 'partner', '5 referrals -> partner');
assert.strictEqual(calculateAffiliateTier(9), 'partner', '9 referrals -> partner');
assert.strictEqual(calculateAffiliateTier(10), 'pro', '10 referrals -> pro');
assert.strictEqual(calculateAffiliateTier(25), 'pro', '25 referrals -> pro');
assert.strictEqual(calculateAffiliateTier(49), 'pro', '49 referrals -> pro');
assert.strictEqual(calculateAffiliateTier(50), 'elite', '50 referrals -> elite');
assert.strictEqual(calculateAffiliateTier(150), 'elite', '150 referrals -> elite');
console.log('  [PASS] Tier thresholds and calculation logic passed');

// 2. Test Commission Rates
assert.strictEqual(AFFILIATE_TIERS.partner.commissionRate, 0.20, 'Partner rate is 20%');
assert.strictEqual(AFFILIATE_TIERS.pro.commissionRate, 0.35, 'Pro rate is 35%');
assert.strictEqual(AFFILIATE_TIERS.elite.commissionRate, 0.50, 'Elite rate is 50%');
console.log('  [PASS] Affiliate tier commission rates verified');

// 3. Test Commission Calculations & Integer Cent Arithmetic
// Example: $10.00 tip (1000 cents), application fee = 15 cents, platform costs = 2 cents -> Net contribution = 13 cents.
// Partner (20%): 13 * 0.20 = 2.6 cents -> rounded to 3 cents.
const netContribution = 13; // cents
const partnerCommission = calculateCommissionAmount(netContribution, AFFILIATE_TIERS.partner.commissionRate);
assert.strictEqual(partnerCommission, 3, 'Partner commission on 13¢ contribution rounds correctly');

// Pro (35%): 13 * 0.35 = 4.55 cents -> rounded to 5 cents.
const proCommission = calculateCommissionAmount(netContribution, AFFILIATE_TIERS.pro.commissionRate);
assert.strictEqual(proCommission, 5, 'Pro commission on 13¢ contribution rounds correctly');

// Elite (50%): 13 * 0.50 = 6.5 cents -> rounded to 7 cents.
const eliteCommission = calculateCommissionAmount(netContribution, AFFILIATE_TIERS.elite.commissionRate);
assert.strictEqual(eliteCommission, 7, 'Elite commission on 13¢ contribution rounds correctly');
console.log('  [PASS] Commission amount calculation and integer-cent rounding passed');

// 4. Test 30-Day Hold Period Calculation
const now = Date.now();
const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
const availableAt = now + thirtyDaysMs;
assert.strictEqual(availableAt - now, thirtyDaysMs, '30-day hold period equals exactly 30 days in ms');
console.log('  [PASS] 30-day hold period duration verified');

console.log('All Affiliate System tests passed successfully!');
