import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateUsername,
  generateUsernameSuggestions,
  canChangeUsername,
  validateTipAmount,
  calculateTipCents,
  calculatePlatformFee,
  calculateGoalProgress,
  USERNAME_CHANGE_COOLDOWN_MS,
} from './rules';

test('validateUsername: permits valid handles with letters, numbers, underscores (3-24 chars)', () => {
  assert.equal(validateUsername('alex').valid, true);
  assert.equal(validateUsername('sarah_99').valid, true);
  assert.equal(validateUsername('coffee_lover').valid, true);
  assert.equal(validateUsername('a_1').valid, true); // exactly 3 chars
  assert.equal(validateUsername('user_1234567890_long_ok').valid, true); // 23 chars
});

test('validateUsername: rejects reserved routes', () => {
  assert.equal(validateUsername('admin').valid, false);
  assert.equal(validateUsername('dashboard').valid, false);
  assert.equal(validateUsername('checkout').valid, false);
  assert.equal(validateUsername('settings').valid, false);
  assert.equal(validateUsername('api').valid, false);
});

test('validateUsername: rejects invalid lengths or non-allowed characters', () => {
  assert.equal(validateUsername('ab').valid, false); // too short (<3)
  assert.equal(validateUsername('a'.repeat(25)).valid, false); // too long (>24)
  assert.equal(validateUsername('alex-morgan').valid, false); // hyphens not allowed
  assert.equal(validateUsername('alex morgan').valid, false); // spaces
  assert.equal(validateUsername('alex@tip').valid, false); // special char
  assert.equal(validateUsername('').valid, false);
});

test('generateUsernameSuggestions: generates valid alternatives', () => {
  const suggestions = generateUsernameSuggestions('alex');
  assert.ok(suggestions.length >= 3);
  for (const s of suggestions) {
    assert.equal(validateUsername(s).valid, true);
  }
});

test('canChangeUsername: enforces 30-day cooldown', () => {
  // Never changed before
  assert.equal(canChangeUsername(undefined).allowed, true);

  // Changed 10 days ago (still on cooldown)
  const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
  const cooldownCheck = canChangeUsername(tenDaysAgo);
  assert.equal(cooldownCheck.allowed, false);
  assert.equal(cooldownCheck.daysRemaining, 20);

  // Changed 31 days ago (allowed)
  const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
  assert.equal(canChangeUsername(thirtyOneDaysAgo).allowed, true);
});

test('validateTipAmount: enforces boundaries', () => {
  assert.equal(validateTipAmount(1).valid, true);
  assert.equal(validateTipAmount(3).valid, true);
  assert.equal(validateTipAmount(5).valid, true);
  assert.equal(validateTipAmount(10).valid, true);
  assert.equal(validateTipAmount(25).valid, true);
  assert.equal(validateTipAmount(500).valid, true);
  assert.equal(validateTipAmount(0.5).valid, false);
  assert.equal(validateTipAmount(501).valid, false);
});

test('calculateTipCents: converts cleanly without float drift', () => {
  assert.equal(calculateTipCents(3), 300);
  assert.equal(calculateTipCents(5), 500);
  assert.equal(calculateTipCents(10.5), 1050);
});

test('calculatePlatformFee: hybrid fee 1% + $0.05 (5 cents) calculates accurately in integer cents', () => {
  // 100 cents ($1.00) → 1% (1c) + 5c = 6 cents
  assert.equal(calculatePlatformFee(100, 1, 5), 6);
  // 300 cents ($3.00) → 1% (3c) + 5c = 8 cents
  assert.equal(calculatePlatformFee(300, 1, 5), 8);
  // 500 cents ($5.00) → 1% (5c) + 5c = 10 cents
  assert.equal(calculatePlatformFee(500, 1, 5), 10);
  // 1000 cents ($10.00) → 1% (10c) + 5c = 15 cents
  assert.equal(calculatePlatformFee(1000, 1, 5), 15);
  // 2500 cents ($25.00) → 1% (25c) + 5c = 30 cents
  assert.equal(calculatePlatformFee(2500, 1, 5), 30);
  // 5000 cents ($50.00) → 1% (50c) + 5c = 55 cents
  assert.equal(calculatePlatformFee(5000, 1, 5), 55);
});

test('calculatePlatformFee: caps fee so it never exceeds transaction amount', () => {
  assert.equal(calculatePlatformFee(5, 1, 5), 5);
  assert.equal(calculatePlatformFee(0, 1, 5), 0);
});
