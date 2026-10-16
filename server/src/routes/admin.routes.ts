import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';

const router = Router();

// 1. Suggest unique prefix, username, and password
router.get('/tenants/suggest', AdminController.suggestCredentials);

// 2. List all tenants (paginated, searchable, status filter)
router.get('/tenants', AdminController.getTenants);

// 3. Create tenant and gym_owner account in single transaction
router.post('/tenants', AdminController.createTenant);

// 4. Toggle or update tenant status
router.patch('/tenants/:id/status', AdminController.updateTenantStatus);

export default router;
