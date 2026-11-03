import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLedgerAggregates,
  reconcileTipStatus,
  isTipEligibleForAffiliateCommission,
} from '../src/lib/ledger';
import { calculatePlatformFee, calculateTransactionEconomics } from '../src/lib/rules';
import { TipTransaction } from '../src/types';

// Mock fixtures
const baseTimestamp = 1700000000000;

function createFixtureTip(
  id: string,
  amountCents: number,
  status: TipTransaction['status'],
  opts: Partial<TipTransaction> = {}
): TipTransaction {
  const platformFeeCents = calculatePlatformFee(amountCents, 1, 5);
  return {
    id,
    recipientId: 'creator_123',
    recipientUsername: 'alice',
    amountCents,
    currency: 'usd',
    supporterName: 'Supporter ' + id,
    status,
    platformFeeCents,
    stripeFeeCents: opts.stripeFeeCents ?? 0,
    netAmountCents: opts.netAmountCents ?? Math.max(0, amountCents - platformFeeCents - (opts.stripeFeeCents ?? 0)),
    createdAt: baseTimestamp,
    ...opts,
  };
}

test('1. Completed revenue calculation strictly excludes pending, failed, expired, refunded, and disputed tips', () => {
  const testTips: TipTransaction[] = [
    createFixtureTip('tip_1', 1000, 'succeeded'), // $10.00
    createFixtureTip('tip_2', 2500, 'succeeded'), // $25.00
    createFixtureTip('tip_3', 500, 'pending'),   // $5.00 (Pending - MUST BE EXCLUDED)
    createFixtureTip('tip_4', 5000, 'disputed'), // $50.00 (Disputed - MUST BE EXCLUDED)
    createFixtureTip('tip_5', 1500, 'refunded'), // $15.00 (Refunded - MUST BE EXCLUDED)
    createFixtureTip('tip_6', 2000, 'failed'),   // $20.00 (Failed - MUST BE EXCLUDED)
    createFixtureTip('tip_7', 3000, 'expired'),  // $30.00 (Expired - MUST BE EXCLUDED)
  ];

  const aggregates = calculateLedgerAggregates(testTips);

  // Completed gross must ONLY equal tip_1 ($10) + tip_2 ($25) = $35.00 (3500 cents)
  assert.equal(aggregates.completedGrossCents, 3500, 'Completed gross cents is strictly 3500 cents');
  assert.equal(aggregates.completedGrossDollars, 35.0, 'Completed gross dollars is strictly $35.00');
  assert.equal(aggregates.completedCount, 2, 'Only 2 tips are counted as completed');

  // Segregated non-completed funds
  assert.equal(aggregates.pendingFundsCents, 500, 'Pending funds strictly segregated ($5.00)');
  assert.equal(aggregates.disputedFundsCents, 5000, 'Disputed funds strictly segregated ($50.00)');
  assert.equal(aggregates.refundedFundsCents, 1500, 'Refunded funds strictly segregated ($15.00)');
  assert.equal(aggregates.failedCount, 2, '2 tips marked as failed/expired');
});

test('2. Platform fee and Net Creator proceeds separation (1% + $0.05)', () => {
  // $10.00 tip (1000 cents):
  // 1% = 10 cents, fixed = 5 cents -> Platform fee = 15 cents
  // Net = 1000 - 15 = 985 cents ($9.85)
  const tip10 = createFixtureTip('tip_10', 1000, 'succeeded');
  assert.equal(tip10.platformFeeCents, 15, '$10.00 tip fee is 15 cents (1% + 5¢)');

  // $100.00 tip (10000 cents):
  // 1% = 100 cents, fixed = 5 cents -> Platform fee = 105 cents
  // Net = 10000 - 105 = 9895 cents ($98.95)
  const tip100 = createFixtureTip('tip_100', 10000, 'succeeded');
  assert.equal(tip100.platformFeeCents, 105, '$100.00 tip fee is 105 cents (1% + 5¢)');

  const aggregates = calculateLedgerAggregates([tip10, tip100]);
  assert.equal(aggregates.completedGrossCents, 11000);
  assert.equal(aggregates.completedPlatformFeeCents, 120);
  assert.equal(aggregates.completedNetCents, 10880);
  assert.equal(aggregates.completedNetDollars, 108.8);
});

test('3. Direct charge accounting with actual Stripe balance transaction fee', () => {
  // Direct charge where Stripe fee is recorded from balance_transaction (e.g., standard 2.9% + 30¢)
  // For $20.00 (2000 cents):
  // Platform fee: 1% (20¢) + 5¢ = 25¢
  // Stripe fee from balance transaction: 88¢
  // Creator net proceeds: 2000 - 25 - 88 = 1887¢ ($18.87)
  const tipWithStripeFee = createFixtureTip('tip_direct', 2000, 'succeeded', {
    platformFeeCents: 25,
    stripeFeeCents: 88,
    netAmountCents: 1887,
  });

  const aggregates = calculateLedgerAggregates([tipWithStripeFee]);
  assert.equal(aggregates.completedGrossCents, 2000);
  assert.equal(aggregates.completedPlatformFeeCents, 25);
  assert.equal(aggregates.completedStripeFeeCents, 88);
  assert.equal(aggregates.completedNetCents, 1887);
  assert.equal(aggregates.completedNetDollars, 18.87);
});

test('4. Dispute lifecycle transitions and reconciliation against Stripe', () => {
  // When a dispute is created on Stripe ('under_review')
  const disputedResult = reconcileTipStatus('succeeded', 5000, {
    paymentIntentStatus: 'succeeded',
    dispute: { id: 'dp_123', status: 'under_review' },
  });
  assert.equal(disputedResult.status, 'disputed');
  assert.equal(disputedResult.isModified, true);
  assert.equal(disputedResult.disputeStatus, 'under_review');

  // When creator wins the dispute ('won') -> status is restored to 'succeeded'
  const wonResult = reconcileTipStatus('disputed', 5000, {
    paymentIntentStatus: 'succeeded',
    dispute: { id: 'dp_123', status: 'won' },
  });
  assert.equal(wonResult.status, 'succeeded');
  assert.equal(wonResult.disputeStatus, 'won');
  assert.equal(wonResult.isModified, true);

  // When cardholder wins the dispute ('lost') -> status becomes 'refunded'
  const lostResult = reconcileTipStatus('disputed', 5000, {
    paymentIntentStatus: 'succeeded',
    dispute: { id: 'dp_123', status: 'lost' },
  });
  assert.equal(lostResult.status, 'refunded');
  assert.equal(lostResult.disputeStatus, 'lost');
  assert.equal(lostResult.isModified, true);
});

test('5. Refund detection and reversal reconciliation', () => {
  // Full refund detected on Stripe
  const refundResult = reconcileTipStatus('succeeded', 2500, {
    paymentIntentStatus: 'succeeded',
    amountRefunded: 2500,
  });
  assert.equal(refundResult.status, 'refunded');
  assert.equal(refundResult.isModified, true);

  // Status does not arbitrarily change if no refund or dispute
  const unchangedResult = reconcileTipStatus('succeeded', 2500, {
    paymentIntentStatus: 'succeeded',
    amountRefunded: 0,
    dispute: null,
  });
  assert.equal(unchangedResult.status, 'succeeded');
  assert.equal(unchangedResult.isModified, false);
});

test('6. Affiliate partner commission eligibility strictly restricted to succeeded tips', () => {
  const succeededTip = createFixtureTip('tip_succ', 1000, 'succeeded');
  const pendingTip = createFixtureTip('tip_pend', 1000, 'pending');
  const disputedTip = createFixtureTip('tip_disp', 1000, 'disputed');
  const refundedTip = createFixtureTip('tip_ref', 1000, 'refunded');
  const failedTip = createFixtureTip('tip_fail', 1000, 'failed');
  const expiredTip = createFixtureTip('tip_exp', 1000, 'expired');

  assert.equal(isTipEligibleForAffiliateCommission(succeededTip), true, 'Succeeded tip is eligible');
  assert.equal(isTipEligibleForAffiliateCommission(pendingTip), false, 'Pending tip is NOT eligible');
  assert.equal(isTipEligibleForAffiliateCommission(disputedTip), false, 'Disputed tip is NOT eligible');
  assert.equal(isTipEligibleForAffiliateCommission(refundedTip), false, 'Refunded tip is NOT eligible');
  assert.equal(isTipEligibleForAffiliateCommission(failedTip), false, 'Failed tip is NOT eligible');
  assert.equal(isTipEligibleForAffiliateCommission(expiredTip), false, 'Expired tip is NOT eligible');
});
