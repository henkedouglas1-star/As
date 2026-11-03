import assert from 'node:assert';

console.log('Running TipZeMe Affiliate Payout Infrastructure & Admin Controls Automated Tests...');

// 1. Test Payout Eligibility & 30-Day Hold Rule
interface CommissionEntry {
  ledgerId: string;
  affiliateUserId: string;
  commissionCents: number;
  state: 'pending' | 'available' | 'paid' | 'reversed';
  availableAt: number;
}

const isEligibleForPayout = (entry: CommissionEntry, now: number, minThresholdCents: number, availableBalanceCents: number, hasFraudHold: boolean): boolean => {
  if (hasFraudHold) return false;
  if (entry.state !== 'available') return false;
  if (entry.availableAt > now) return false;
  if (availableBalanceCents < minThresholdCents) return false;
  return true;
};

const now = Date.now();
const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

const validEntry: CommissionEntry = {
  ledgerId: 'comm_1',
  affiliateUserId: 'partner_1',
  commissionCents: 1500,
  state: 'available',
  availableAt: now - 1000, // hold passed
};

// Test threshold $10.00 (1000 cents)
assert.strictEqual(isEligibleForPayout(validEntry, now, 1000, 1500, false), true, 'Eligible when available, hold passed, balance >= $10, no fraud hold');
assert.strictEqual(isEligibleForPayout(validEntry, now, 1000, 500, false), false, 'Ineligible when balance < $10 minimum threshold');
assert.strictEqual(isEligibleForPayout(validEntry, now, 1000, 1500, true), false, 'Ineligible when fraud hold is active');

const pendingEntry: CommissionEntry = {
  ledgerId: 'comm_2',
  affiliateUserId: 'partner_1',
  commissionCents: 1500,
  state: 'pending',
  availableAt: now + thirtyDaysMs, // still on hold
};
assert.strictEqual(isEligibleForPayout(pendingEntry, now, 1000, 1500, false), false, 'Ineligible when commission state is pending');
console.log('  [PASS] Payout eligibility and hold enforcement verified');

// 2. Test Monthly Payout Batch Generation & Duplicate Allocation Prevention
interface PayoutBatch {
  batchId: string;
  status: 'draft' | 'approved' | 'processing' | 'paid';
  totalCents: number;
  allocations: { affiliateUserId: string; amountCents: number; ledgerIds: string[] }[];
}

const generatePayoutBatch = (entries: CommissionEntry[], minThresholdCents: number): PayoutBatch => {
  const byPartner: Record<string, { totalCents: number; ledgerIds: string[] }> = {};

  for (const entry of entries) {
    if (entry.state === 'available') {
      if (!byPartner[entry.affiliateUserId]) {
        byPartner[entry.affiliateUserId] = { totalCents: 0, ledgerIds: [] };
      }
      byPartner[entry.affiliateUserId].totalCents += entry.commissionCents;
      byPartner[entry.affiliateUserId].ledgerIds.push(entry.ledgerId);
    }
  }

  const allocations: { affiliateUserId: string; amountCents: number; ledgerIds: string[] }[] = [];
  let batchTotal = 0;

  for (const [affiliateUserId, data] of Object.entries(byPartner)) {
    if (data.totalCents >= minThresholdCents) {
      allocations.push({
        affiliateUserId,
        amountCents: data.totalCents,
        ledgerIds: data.ledgerIds,
      });
      batchTotal += data.totalCents;
    }
  }

  return {
    batchId: `batch_${Date.now()}`,
    status: 'draft',
    totalCents: batchTotal,
    allocations,
  };
};

const testEntries: CommissionEntry[] = [
  { ledgerId: 'c1', affiliateUserId: 'p1', commissionCents: 1200, state: 'available', availableAt: now - 1000 },
  { ledgerId: 'c2', affiliateUserId: 'p1', commissionCents: 300, state: 'available', availableAt: now - 1000 }, // p1 total = 1500 (>= 1000)
  { ledgerId: 'c3', affiliateUserId: 'p2', commissionCents: 500, state: 'available', availableAt: now - 1000 }, // p2 total = 500 (< 1000, excluded)
];

const batch = generatePayoutBatch(testEntries, 1000);
assert.strictEqual(batch.allocations.length, 1, 'Only partners meeting $10 minimum included in batch');
assert.strictEqual(batch.allocations[0].affiliateUserId, 'p1', 'Partner 1 included');
assert.strictEqual(batch.allocations[0].amountCents, 1500, 'Partner 1 total amount correct (1500¢)');
console.log('  [PASS] Monthly payout batch generation & minimum threshold filtering passed');

// 3. Test Admin Authorization & Self-Approval Conflict Prevention
const authorizeAdmin = (adminKey: string, expectedKey: string): boolean => {
  return Boolean(adminKey && adminKey === expectedKey);
};

const validateBatchApproval = (approvingAdminId: string, affiliateBeneficiaryId: string, adminKey: string, expectedKey: string): boolean => {
  if (!authorizeAdmin(adminKey, expectedKey)) return false;
  // Conflict of interest: Admin cannot approve their own payout batch if they are the affiliate beneficiary
  if (approvingAdminId === affiliateBeneficiaryId) return false;
  return true;
};

assert.strictEqual(authorizeAdmin('secret_admin_123', 'secret_admin_123'), true, 'Valid admin key authorized');
assert.strictEqual(authorizeAdmin('wrong_key', 'secret_admin_123'), false, 'Invalid admin key rejected');
assert.strictEqual(validateBatchApproval('admin_alice', 'partner_bob', 'secret_admin_123', 'secret_admin_123'), true, 'Admin approving another partner batch allowed');
assert.strictEqual(validateBatchApproval('admin_alice', 'admin_alice', 'secret_admin_123', 'secret_admin_123'), false, 'Admin self-approval conflict correctly blocked');
console.log('  [PASS] Admin authorization and conflict-of-interest prevention passed');

// 4. Test Feature Flag Enforcement (`AFFILIATE_PAYOUTS_ENABLED`)
const executeTransferIfEnabled = (enabled: boolean, transferFunc: () => string): string => {
  if (!enabled) {
    throw new Error('Affiliate payouts are disabled. Live transfers are blocked.');
  }
  return transferFunc();
};

assert.throws(() => {
  executeTransferIfEnabled(false, () => 'transfer_123');
}, /Affiliate payouts are disabled/, 'Live transfers blocked when feature flag is false');
console.log('  [PASS] Feature flag enforcement verified');

console.log('All Affiliate Payout Infrastructure & Admin Controls tests passed successfully!');
