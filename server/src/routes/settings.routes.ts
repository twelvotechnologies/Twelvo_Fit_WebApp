import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller.js';
import { ExpensesController } from '../controllers/expenses.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// Require JWT authentication for all settings endpoints
router.use(authenticateJwt);

// Bank Accounts Endpoints
router.get('/banks', SettingsController.getBankAccounts);
router.post('/banks', SettingsController.createBankAccount);
router.put('/banks/:id', SettingsController.updateBankAccount);
router.patch('/banks/:id/toggle', SettingsController.toggleBankAccountStatus);
router.patch('/banks/:id/primary', SettingsController.setPrimaryBankAccount);
router.delete('/banks/:id', SettingsController.deleteBankAccount);

// Fee / Plan Types Endpoints
router.get('/plans', SettingsController.getPlanTypes);
router.get('/fees', SettingsController.getPlanTypes);
router.post('/plans', SettingsController.createPlanType);
router.put('/plans/:id', SettingsController.updatePlanType);
router.patch('/plans/:id/toggle', SettingsController.togglePlanTypeStatus);
router.delete('/plans/:id', SettingsController.deletePlanType);

// Payment Types Endpoints
router.get('/payment-types', SettingsController.getPaymentTypes);
router.post('/payment-types', SettingsController.addPaymentType);
router.patch('/payment-types/:id/toggle', SettingsController.togglePaymentTypeStatus);

// Expense Types Endpoints
router.get('/expense-types', ExpensesController.getExpenseTypes);
router.post('/expense-types', ExpensesController.createExpenseType);
router.put('/expense-types/:id', ExpensesController.updateExpenseType);
router.patch('/expense-types/:id/toggle', ExpensesController.toggleExpenseTypeStatus);
router.delete('/expense-types/:id', ExpensesController.deleteExpenseType);

export default router;
