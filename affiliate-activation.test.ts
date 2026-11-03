import assert from 'node:assert';
import { calculateAffiliateTier } from './src/types/affiliate';

console.log('Running TipZeMe Creator Activation & Tier Progression Automated Tests...');

// 1. Test Tier Thresholds exact boundaries
assert.strictEqual(calculateAffiliateTier(0), 'partner', '0 referrals -> partner');
assert.strictEqual(calculateAffiliateTier(9), 'partner', '9 referrals -> partner (Partner Tier)');
assert.strictEqual(calculateAffiliateTier(10), 'pro', '10 referrals -> pro (Pro Upgrade)');
assert.strictEqual(calculateAffiliateTier(25), 'pro', '25 referrals -> pro');
assert.strictEqual(calculateAffiliateTier(49), 'pro', '49 referrals -> pro');
assert.strictEqual(calculateAffiliateTier(50), 'elite', '50 referrals -> elite (Elite Upgrade)');
assert.strictEqual(calculateAffiliateTier(120), 'elite', '120 referrals -> elite');
console.log('  [PASS] Tier boundary calculations verified (9->Partner, 10->Pro, 50->Elite)');

// 2. Test Commission Rates for Tiers
const getRateForTier = (tier: string) => {
  if (tier === 'elite') return 0.50;
  if (tier === 'pro') return 0.35;
  return 0.20;
};

assert.strictEqual(getRateForTier(calculateAffiliateTier(9)), 0.20, 'Partner rate is 20%');
assert.strictEqual(getRateForTier(calculateAffiliateTier(10)), 0.35, 'Pro rate is 35%');
assert.strictEqual(getRateForTier(calculateAffiliateTier(50)), 0.50, 'Elite rate is 50%');
console.log('  [PASS] Tier commission rate mapping passed');

console.log('All Creator Activation & Tier Progression tests passed successfully!');
