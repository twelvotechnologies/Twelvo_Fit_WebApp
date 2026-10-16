import { Router } from 'express';
import {
  getAllReceipts,
  getReceiptStats,
  getReceiptById,
  createReceipt,
  approveReceipt,
  rejectReceipt,
} from '../controllers/receipt.controller.js';
import { authenticateJwt, requireRoles } from '../middlewares/auth.middleware.js';

const router = Router();

// Require JWT authentication for all receipt routes
router.use(authenticateJwt);

/**
 * Receipt Ledger & Approval Routes
 */
router.get('/stats', getReceiptStats);
router.get('/', getAllReceipts);
router.post('/', createReceipt);
router.get('/:id', getReceiptById);
router.post('/:id/approve', requireRoles('gym_owner', 'super_admin'), approveReceipt);
router.post('/:id/reject', requireRoles('gym_owner', 'super_admin'), rejectReceipt);

export default router;
