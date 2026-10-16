import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';

const router = Router();

/**
 * @openapi
 * /api/v1/health:
 *   get:
 *     summary: System Health & Status Check
 *     description: Returns operational status, system uptime, memory usage metrics, and runtime version.
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Server is running and healthy
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - properties:
 *                     data:
 *                       $ref: '#/components/schemas/HealthStatus'
 */
router.get('/', getHealth);

export default router;
