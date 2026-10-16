import { Router } from 'express';
import { PayrollController } from '../controllers/payroll.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { requirePayrollAccess } from '../middlewares/payroll.middleware.js';

const router = Router();

// Protect all payroll endpoints with JWT verification and Role-Based Access Control
router.use(authenticateJwt, requirePayrollAccess);

// ================================================================
// TAB 1: ATTENDANCE
// ================================================================
router.get('/attendance', PayrollController.getDailyAttendance);
router.put('/attendance', PayrollController.saveAttendance);
router.get('/attendance/monthly', PayrollController.getMonthlyAttendance);

// ================================================================
// TAB 2: ADVANCES & REPAYMENTS
// ================================================================
router.get('/advances', PayrollController.getAdvances);
router.get('/advances/staff/:staffId/ledger', PayrollController.getStaffLedger);
router.post('/advances', PayrollController.createAdvance);
router.post('/advances/:advanceId/repayments', PayrollController.recordRepayment);
router.patch('/advances/:advanceId/cancel', PayrollController.cancelAdvance);

// ================================================================
// TAB 3: SALARIES
// ================================================================
router.get('/salaries', PayrollController.getSalaries);
router.get('/salaries/preview', PayrollController.getSalaryPreview);
router.post('/salaries/generate', PayrollController.generateSalaries);
router.post('/salaries/finalize-bulk', PayrollController.finalizeBulk);
router.post('/salaries/:slipId/finalize', PayrollController.finalizeSlip);
router.post('/salaries/:slipId/payments', PayrollController.recordSalaryPayment);
router.get('/salaries/:slipId', PayrollController.getSlipDetail);
router.patch('/salaries/:slipId/cancel', PayrollController.cancelSlip);

export default router;
