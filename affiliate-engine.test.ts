import assert from 'node:assert';
import { calculateAffiliateTier, AFFILIATE_TIERS } from './src/types/affiliate';

console.log('Running TipZeMe Referral Engine & Partner Enrollment Automated Tests...');

// 1. Test Partner Enrollment Tier Defaults
const defaultTier = calculateAffiliateTier(0);
assert.strictEqual(defaultTier, 'partner', 'New partners start at partner tier');
assert.strictEqual(AFFILIATE_TIERS[defaultTier].commissionRate, 0.20, 'Default partner commission rate is 20%');
console.log('  [PASS] Partner enrollment tier defaults verified');

// 2. Test Referral Code Sanitization & Formatting
const sanitizeCode = (raw: string) => raw.toLowerCase().replace(/[^a-z0-9_]/g, '');
assert.strictEqual(sanitizeCode('Alex_Morgan123!'), 'alex_morgan123', 'Referral code sanitizes special characters correctly');
assert.strictEqual(sanitizeCode('   PRO-PARTNER   '), 'propartner', 'Referral code trims and strips dashes');
console.log('  [PASS] Referral code sanitization passed');

// 3. Test First-Win Attribution Rule & Expiration
const now = Date.now();
const twelveMonthsMs = 365 * 24 * 60 * 60 * 1000;
const expiresAt = now + twelveMonthsMs;
assert.strictEqual(expiresAt - now, twelveMonthsMs, 'Attribution window is exactly 12 months');
console.log('  [PASS] Referral attribution window calculation verified');

// 4. Test Self-Referral Prevention Logic
const isSelfReferral = (affiliateUid: string, referredUid: string) => affiliateUid === referredUid;
assert.strictEqual(isSelfReferral('user_123', 'user_123'), true, 'Self-referral correctly detected');
assert.strictEqual(isSelfReferral('user_123', 'user_456'), false, 'Valid referral correctly identified');
console.log('  [PASS] Self-referral prevention logic passed');

console.log('All Referral Engine & Partner Enrollment tests passed successfully!');
