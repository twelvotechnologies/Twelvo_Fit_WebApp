import { Router } from 'express';
import healthRoutes from './health.routes.js';
import memberRoutes from './member.routes.js';
import settingsRoutes from './settings.routes.js';
import adminRoutes from './admin.routes.js';
import authRoutes from './auth.routes.js';
import trainerRoutes from './trainer.routes.js';
import receiptRoutes from './receipt.routes.js';
import payrollRoutes from './payroll.routes.js';
import expensesRoutes from './expenses.routes.js';

const apiRouter = Router();

// Mount Gym ERP modules under /api/v1
apiRouter.use('/auth', authRoutes);
apiRouter.use('/trainers', trainerRoutes);
apiRouter.use('/health', healthRoutes);
apiRouter.use('/members', memberRoutes);
apiRouter.use('/receipts', receiptRoutes);
apiRouter.use('/settings', settingsRoutes);
apiRouter.use('/payroll', payrollRoutes);
apiRouter.use('/expenses', expensesRoutes);
apiRouter.use('/admin', adminRoutes);

export default apiRouter;
