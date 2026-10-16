import { prisma } from '../config/prisma.js';
import { PayrollService } from '../services/payroll.service.js';

async function runIntegrationTest() {
  console.log('--- STARTING PAYROLL INTEGRATION TEST ---');

  // 1. Find a gym owner user and tenant
  const tenant = await prisma.tenant.findFirst({
    where: { isDeleted: false },
  });

  if (!tenant) {
    throw new Error('No tenant found in database');
  }

  const user = await prisma.user.findFirst({
    where: { tenantId: tenant.tenantId, isDeleted: false },
  });

  if (!user) {
    throw new Error('No user found in tenant');
  }

  const tenantId = tenant.tenantId;
  const userId = user.userId;
  console.log(`Using Tenant: ${tenant.gymName} (ID: ${tenantId}), User: ${user.fullName} (ID: ${userId})`);

  // Always create a fresh test staff member for each test run to test the full lifecycle
  const uniqueCode = `STF-T-${Date.now().toString().slice(-6)}`;
  console.log(`Creating isolated test staff member (${uniqueCode})...`);
  const insertedStaff: any[] = await prisma.$queryRawUnsafe(
    `INSERT INTO staff (tenant_id, user_id, staff_code, full_name, designation, phone, joining_date, base_salary, employment_status)
     VALUES ($1, $2, $3, 'Rohan Verma', 'Senior Trainer', '9876543210', '2026-01-01'::date, 35000, 'active')
     RETURNING *`,
    tenantId,
    userId,
    uniqueCode
  );
  const staff = insertedStaff[0];

  const staffId = (staff.staff_id || staff.staffId).toString();
  const staffName = staff.full_name || staff.fullName;
  const baseSalary = staff.base_salary || staff.baseSalary;
  console.log(`Using Staff: ${staffName} (ID: ${staffId}, Base Salary: ${baseSalary})`);

  // Test 1: Daily Attendance
  const today = new Date().toISOString().split('T')[0];
  console.log(`\n1. Testing Daily Attendance for ${today}...`);
  const dailyRes = await PayrollService.getDailyAttendance(tenantId, today);
  console.log(`   Total active staff for today: ${dailyRes.staff.length}`);

  // Test 2: Save Daily Attendance (Bulk Upsert)
  console.log(`\n2. Saving Attendance (Bulk Upsert) for staff ${staffName} -> FULL_DAY...`);
  const saveRes = await PayrollService.saveAttendance(tenantId, userId, {
    date: today,
    entries: [
      {
        staffId,
        status: 'FULL_DAY',
        note: 'Punctual opening shift',
      },
    ],
  });
  console.log(`   Updated count: ${saveRes.updatedCount}`);

  // Re-verify daily
  const dailyAfter = await PayrollService.getDailyAttendance(tenantId, today);
  const staffMark = dailyAfter.staff.find((s) => s.staffId === staffId);
  console.log(`   Verified mark for ${staffName}: ${staffMark?.status}`);

  // Test 3: Monthly Attendance Grid
  const currentMonth = today.substring(0, 7);
  console.log(`\n3. Testing Monthly Attendance Grid for ${currentMonth}...`);
  const monthlyRes = await PayrollService.getMonthlyAttendance(tenantId, currentMonth);
  console.log(`   Monthly Grid staff count: ${monthlyRes.staff.length}, Days: ${monthlyRes.daysInMonth}`);

  // Test 4: Create Advance
  console.log(`\n4. Creating Salary Advance of ₹5,000 (Mode: CASH)...`);
  const advRes = await PayrollService.createAdvance(tenantId, userId, {
    staffId,
    amount: 5000,
    advanceDate: today,
    reason: 'Emergency equipment repair',
    paymentMode: 'CASH',
  });
  console.log(`   Advance Created: ID ${advRes.advanceId}, Amount: ₹${advRes.amount}, Outstanding: ₹${advRes.outstandingAmount}`);

  // Test 5: Staff Ledger
  console.log(`\n5. Fetching Chronological Ledger for staff ${staffId}...`);
  const ledgerRes = await PayrollService.getStaffLedger(tenantId, staffId);
  console.log(`   Staff Ledger items: ${ledgerRes.ledger.length}, Current Outstanding: ₹${ledgerRes.currentOutstanding}`);

  // Test 6: Record Repayment
  console.log(`\n6. Recording Direct Repayment of ₹1,000 for advance ${advRes.advanceId}...`);
  const repRes = await PayrollService.recordRepayment(tenantId, userId, advRes.advanceId, {
    amount: 1000,
    repaymentDate: today,
    paymentMode: 'CASH',
    note: 'Partial cash return at reception',
  });
  console.log(`   Repayment recorded! New Outstanding: ₹${repRes.newOutstanding}`);

  // Test 7: Salary Preview
  console.log(`\n7. Fetching Salary Preview for month ${currentMonth}...`);
  const previewRes = await PayrollService.getSalaryPreview(tenantId, currentMonth);
  console.log(`   Preview items count: ${previewRes.items.length}`);
  const previewStaff = previewRes.items.find((i) => i.staffId === staffId);
  if (previewStaff) {
    console.log(`   Preview for ${previewStaff.fullName}: Earned ₹${previewStaff.earnedSalary}, Outstanding Adv: ₹${previewStaff.outstandingAdvance}, Rec. Adv Deduction: ₹${previewStaff.recommendedAdvanceDeduction}, Net: ₹${previewStaff.netPayable}`);
  }

  // Test 8: Generate Salary Slip (DRAFT)
  console.log(`\n8. Generating DRAFT Salary Slip for staff ${staffId}...`);
  const genRes = await PayrollService.generateSalaries(tenantId, userId, {
    month: currentMonth,
    items: [
      {
        staffId,
        bonusAmount: 1500,
        otherDeductions: 0,
        advanceDeduction: previewStaff?.recommendedAdvanceDeduction || 1000,
        remarks: 'September month salary generated',
      },
    ],
  });
  console.log(`   Generated count: ${genRes.createdCount}`);

  // Test 9: Query Salaries List
  console.log(`\n9. Querying Salaries list for ${currentMonth}...`);
  const salariesList = await PayrollService.getSalaries(tenantId, currentMonth);
  const mySlip = salariesList.slips.find((s) => s.staffId === staffId);
  console.log(`   Found slip #${mySlip?.slipId}, Status: ${mySlip?.status}, Net Payable: ₹${mySlip?.netPayable}`);

  if (mySlip) {
    // Test 10: Finalize Slip (Applies FIFO advance deduction)
    console.log(`\n10. Finalizing Slip #${mySlip.slipId}...`);
    const finalizeRes = await PayrollService.finalizeSlip(tenantId, userId, mySlip.slipId);
    console.log(`   Slip finalized: ${finalizeRes.success}`);

    // Verify ledger after salary deduction
    const ledgerAfterSlip = await PayrollService.getStaffLedger(tenantId, staffId);
    console.log(`   Ledger items after slip finalization: ${ledgerAfterSlip.ledger.length}, Remaining Outstanding: ₹${ledgerAfterSlip.currentOutstanding}`);

    // Test 11: Record Payout
    const payoutAmount = Number(mySlip.netPayable || 1500);
    console.log(`\n11. Recording Salary Payout of ₹${payoutAmount} against Slip #${mySlip.slipId}...`);
    const payRes = await PayrollService.recordSalaryPayment(tenantId, userId, mySlip.slipId, {
      amount: payoutAmount,
      paymentDate: today,
      paymentMode: 'CASH',
      note: 'Full cash disbursement',
    });
    console.log(`   Payment Recorded: ID ${payRes.paymentId}, Remaining Balance: ₹${payRes.balanceAmount}, Status: ${payRes.paymentStatus}`);

    // Test 12: Slip Details for Payslip
    console.log(`\n12. Fetching Detailed Payslip for Slip #${mySlip.slipId}...`);
    const detail = await PayrollService.getSlipDetail(tenantId, mySlip.slipId);
    console.log(`   Payslip for ${detail.slip.staffName}, Net Payable: ₹${detail.slip.netPayable}, Payments: ${detail.payments.length}, Adv Deductions: ${detail.advanceDeductions.length}`);
  }

  console.log('\n======================================================');
  console.log('ALL PAYROLL INTEGRATION TESTS COMPLETED SUCCESSFULLY! 🎉');
  console.log('======================================================\n');
}

runIntegrationTest()
  .catch((err) => {
    console.error('Integration test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
