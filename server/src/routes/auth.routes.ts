import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     summary: Authenticate User & Issue JWT Tokens
 *     description: Authenticates credentials for Gym Owner, Floor Trainer, or Super Admin. Issues an access token (15m) and refresh token (7d).
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginDTO'
 *           examples:
 *             GymOwner:
 *               summary: Demo Gym Owner
 *               value:
 *                 usernameOrEmail: paul_owner
 *                 password: Twelvo@1234
 *             Trainer:
 *               summary: Demo Floor Trainer
 *               value:
 *                 usernameOrEmail: rahul_trainer
 *                 password: Twelvo@1234
 *     responses:
 *       200:
 *         description: Login successful. Returns access token, refresh token, and user profile.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - properties:
 *                     data:
 *                       $ref: '#/components/schemas/AuthTokensResponse'
 *       400:
 *         description: Missing username/email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid username or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Account deactivated or gym suspended
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', AuthController.login);

/**
 * @openapi
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh Access Token
 *     description: Exchanges a valid refresh token for a newly signed access token.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenDTO'
 *     responses:
 *       200:
 *         description: New access token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - properties:
 *                     data:
 *                       $ref: '#/components/schemas/AuthTokensResponse'
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', AuthController.refresh);

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     summary: Current Authenticated User Profile
 *     description: Returns details of the currently authenticated user from their JWT Bearer token.
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - properties:
 *                     data:
 *                       $ref: '#/components/schemas/AuthUser'
 *       401:
 *         description: Unauthorized - missing or invalid Bearer token
 */
router.get('/me', authenticateJwt, AuthController.getMe);

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     summary: User Logout
 *     description: Invalidate session / log out.
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', AuthController.logout);

export default router;
