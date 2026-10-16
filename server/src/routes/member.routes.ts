import { Router } from 'express';
import {
  getAllMembers,
  getMemberStats,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
} from '../controllers/member.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// Require JWT authentication for all member routes
router.use(authenticateJwt);

/**
 * Member Statistics & Roster Routes
 */
router.get('/stats', getMemberStats);
router.get('/', getAllMembers);
router.post('/', createMember);
router.get('/:id', getMemberById);
router.put('/:id', updateMember);
router.delete('/:id', deleteMember);

export default router;
