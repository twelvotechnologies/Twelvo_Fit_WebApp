import { Router } from 'express';
import { TrainerController } from '../controllers/trainer.controller.js';
import { authenticateJwt, requireRoles } from '../middlewares/auth.middleware.js';

const router = Router();

// Protect all trainer routes with JWT verification
// The JWT token automatically supplies req.user and req.tenantId
router.use(authenticateJwt);

router.get('/', TrainerController.getTrainers);
router.get('/stats', TrainerController.getStats);
router.get('/:id', TrainerController.getTrainerById);
router.post('/', requireRoles('gym_owner', 'super_admin'), TrainerController.createTrainer);
router.put('/:id', requireRoles('gym_owner', 'super_admin'), TrainerController.updateTrainer);
router.delete('/:id', requireRoles('gym_owner', 'super_admin'), TrainerController.deleteTrainer);

export default router;
