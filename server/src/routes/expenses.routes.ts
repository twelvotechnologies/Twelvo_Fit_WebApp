import { Router } from 'express';
import { ExpensesController } from '../controllers/expenses.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// Protect all expense routes with JWT authentication
router.use(authenticateJwt);

// --- Expense Types Endpoints ---
router.get('/types', ExpensesController.getExpenseTypes);
router.post('/types', ExpensesController.createExpenseType);
router.put('/types/:id', ExpensesController.updateExpenseType);
router.patch('/types/:id/toggle', ExpensesController.toggleExpenseTypeStatus);
router.delete('/types/:id', ExpensesController.deleteExpenseType);

// --- Expense Records Endpoints ---
router.get('/summary', ExpensesController.getExpenseSummary);
router.get('/', ExpensesController.getExpenses);
router.get('/:id', ExpensesController.getExpenseById);
router.post('/', ExpensesController.createExpense);
router.put('/:id', ExpensesController.updateExpense);
router.delete('/:id', ExpensesController.deleteExpense);

export default router;
