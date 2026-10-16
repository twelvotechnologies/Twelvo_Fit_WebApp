import assert from 'node:assert';
import { roundCurrency } from '../types/payroll.types.js';

// ================================================================
// UNIT TESTS: SALARY CALCULATION & ADVANCE FIFO ALLOCATION
// ================================================================

function calculateSalary(params: {
  baseSalary: number;
  daysInMonth: number;
  fullDays: number;
  halfDays: number;
  paidLeaveDays: number;
  bonus: number;
  otherDeductions: number;
  advanceDeduction: number;
}) {
  const {
    baseSalary,
    daysInMonth,
    fullDays,
    halfDays,
    paidLeaveDays,
    bonus,
    otherDeductions,
    advanceDeduction,
  } = params;

  const payableDays = roundCurrency(fullDays + halfDays * 0.5 + paidLeaveDays);
  const absentDays = daysInMonth - fullDays - halfDays - paidLeaveDays;
  const earnedSalary = roundCurrency((baseSalary / daysInMonth) * payableDays);
  const netPayable = roundCurrency(earnedSalary + bonus - otherDeductions - advanceDeduction);

  return {
    payableDays,
    absentDays,
    earnedSalary,
    netPayable,
  };
}

interface AdvanceRow {
  advanceId: number;
  advanceDate: string;
  amount: number;
  outstanding: number;
}

function allocateAdvanceFifo(
  advances: AdvanceRow[],
  advanceDeduction: number
): { advanceId: number; deductedAmount: number; newOutstanding: number }[] {
  let remainingToDeduct = roundCurrency(advanceDeduction);
  const results: { advanceId: number; deductedAmount: number; newOutstanding: number }[] = [];

  // Sort oldest first
  const sorted = [...advances].sort((a, b) => {
    const cmp = a.advanceDate.localeCompare(b.advanceDate);
    if (cmp !== 0) return cmp;
    return a.advanceId - b.advanceId;
  });

  for (const adv of sorted) {
    if (remainingToDeduct <= 0) break;
    const deduct = roundCurrency(Math.min(remainingToDeduct, adv.outstanding));
    const newOutstanding = roundCurrency(adv.outstanding - deduct);
    results.push({
      advanceId: adv.advanceId,
      deductedAmount: deduct,
      newOutstanding,
    });
    remainingToDeduct = roundCurrency(remainingToDeduct - deduct);
  }

  return results;
}

console.log('--- RUNNING PAYROLL UNIT TESTS ---');

// Test 1: Full attendance in 30-day month
{
  const res = calculateSalary({
    baseSalary: 30000,
    daysInMonth: 30,
    fullDays: 30,
    halfDays: 0,
    paidLeaveDays: 0,
    bonus: 2000,
    otherDeductions: 500,
    advanceDeduction: 1500,
  });

  assert.strictEqual(res.payableDays, 30);
  assert.strictEqual(res.absentDays, 0);
  assert.strictEqual(res.earnedSalary, 30000);
  assert.strictEqual(res.netPayable, 30000); // 30000 + 2000 - 500 - 1500 = 30000
  console.log('✓ Test 1 Passed: Full attendance salary calculation');
}

// Test 2: Half days and unpaid leaves (unmarked counts as absent) in 31-day month
{
  const res = calculateSalary({
    baseSalary: 45000,
    daysInMonth: 31,
    fullDays: 20,
    halfDays: 4,      // 4 * 0.5 = 2 days
    paidLeaveDays: 2,  // 2 days
    // total payable = 24 days
    // absent = 31 - 20 - 4 - 2 = 5 days
    bonus: 1000,
    otherDeductions: 0,
    advanceDeduction: 2000,
  });

  assert.strictEqual(res.payableDays, 24);
  assert.strictEqual(res.absentDays, 5);
  // 45000 / 31 * 24 = 34838.7096... -> 34838.71
  assert.strictEqual(res.earnedSalary, 34838.71);
  // net = 34838.71 + 1000 - 0 - 2000 = 33838.71
  assert.strictEqual(res.netPayable, 33838.71);
  console.log('✓ Test 2 Passed: Partial days and rounding precision');
}

// Test 3: Advance FIFO Allocation
{
  const openAdvances: AdvanceRow[] = [
    { advanceId: 101, advanceDate: '2026-08-01', amount: 5000, outstanding: 2000 },
    { advanceId: 102, advanceDate: '2026-08-15', amount: 3000, outstanding: 3000 },
    { advanceId: 103, advanceDate: '2026-09-01', amount: 4000, outstanding: 4000 },
  ];

  // Total deduction: 3500. Should clear 101 (2000), take 1500 from 102, leave 103 untouched.
  const allocations = allocateAdvanceFifo(openAdvances, 3500);

  assert.strictEqual(allocations.length, 2);
  assert.strictEqual(allocations[0].advanceId, 101);
  assert.strictEqual(allocations[0].deductedAmount, 2000);
  assert.strictEqual(allocations[0].newOutstanding, 0);

  assert.strictEqual(allocations[1].advanceId, 102);
  assert.strictEqual(allocations[1].deductedAmount, 1500);
  assert.strictEqual(allocations[1].newOutstanding, 1500);

  console.log('✓ Test 3 Passed: Advance FIFO allocation across multiple loans');
}

// Test 4: Advance FIFO Allocation covering all loans
{
  const openAdvances: AdvanceRow[] = [
    { advanceId: 201, advanceDate: '2026-07-10', amount: 1000, outstanding: 1000 },
    { advanceId: 202, advanceDate: '2026-08-10', amount: 2000, outstanding: 2000 },
  ];

  const allocations = allocateAdvanceFifo(openAdvances, 3000);
  assert.strictEqual(allocations.length, 2);
  assert.strictEqual(allocations[0].deductedAmount, 1000);
  assert.strictEqual(allocations[0].newOutstanding, 0);
  assert.strictEqual(allocations[1].deductedAmount, 2000);
  assert.strictEqual(allocations[1].newOutstanding, 0);

  console.log('✓ Test 4 Passed: Advance FIFO full clearance');
}

console.log('ALL PAYROLL UNIT TESTS PASSED SUCCESSFULLY! 🎉');
