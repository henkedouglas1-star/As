import { validateTipAmount, calculatePlatformFee, calculateTipCents, calculateTransactionEconomics } from './src/lib/rules';
import { MIN_TIP_DOLLARS, MAX_TIP_DOLLARS } from './src/lib/constants';

console.log('Running TipZeMe Direct Charges Financial Reconciliation & Payment Automated Test Suite...\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    failed++;
  }
}

// 1. Tip Amount Validation Tests (with $3.00 minimum floor)
console.log('1. Testing Tip Amount Validation ($1, $3, $5, $10, $25, $100, $500, invalid):');
assert(validateTipAmount(1).valid === false, '$1.00 tip amount is rejected by the $3 minimum');
assert(validateTipAmount(3).valid === true, '$3.00 tip amount is valid');
assert(validateTipAmount(5).valid === true, '$5.00 tip amount is valid');
assert(validateTipAmount(10).valid === true, '$10.00 tip amount is valid');
assert(validateTipAmount(25).valid === true, '$25.00 tip amount is valid');
assert(validateTipAmount(100).valid === true, '$100.00 tip amount is valid');
assert(validateTipAmount(500).valid === true, '$500.00 tip amount is valid');
assert(validateTipAmount(0.50).valid === false, 'Below minimum ($0.50) is invalid');
assert(validateTipAmount(600).valid === false, 'Above maximum ($600.00) is invalid');
assert(validateTipAmount(-1).valid === false, 'Negative tip amount is invalid');

// 2. Platform Fee Calculation Tests (1% + $0.05)
console.log('\n2. Testing Platform Fee Calculations (1% + $0.05 fixed):');
const fee1 = calculatePlatformFee(100, 1, 5);
assert(fee1 === 6, `$1.00 tip platform fee is 6 cents (got ${fee1} cents)`);

const fee3 = calculatePlatformFee(300, 1, 5);
assert(fee3 === 8, `$3.00 tip platform fee is 8 cents (got ${fee3} cents)`);

const fee5 = calculatePlatformFee(500, 1, 5);
assert(fee5 === 10, `$5.00 tip platform fee is 10 cents (got ${fee5} cents)`);

const fee100 = calculatePlatformFee(10000, 1, 5);
assert(fee100 === 105, `$100.00 tip platform fee is 105 cents (got ${fee100} cents)`);

// 3. Exact Financial Reconciliation & Money Conservation ($1, $3, $5, $10, $25, $100, $500)
console.log('\n3. Testing Exact Financial Reconciliation & Money Conservation:');
const testAmountsDollars = [1, 3, 5, 10, 25, 100, 500];

for (const dollars of testAmountsDollars) {
  const grossCents = Math.round(dollars * 100);
  const eco = calculateTransactionEconomics(grossCents);

  // Exact conservation law: Gross = Stripe Processing Fee + Creator Net Proceeds + Platform Fee
  const conserved = grossCents === (eco.stripeProcessingFeeCents + eco.creatorTransferCents + eco.platformFeeCents);
  
  assert(conserved, `$${dollars.toFixed(2)} tip: Gross (${grossCents}¢) = Stripe Fee (${eco.stripeProcessingFeeCents}¢) + Creator Net (${eco.creatorTransferCents}¢) + Platform Fee (${eco.platformFeeCents}¢)`);
  assert(eco.platformNetCents > 0, `$${dollars.toFixed(2)} tip: Platform Net Contribution is positive (${eco.platformNetCents}¢)`);
}

console.log(`\nTest Summary: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All financial reconciliation and payment tests passed successfully!');
}
