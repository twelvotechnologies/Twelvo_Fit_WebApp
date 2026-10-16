import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import './utils/bigintSerializer.js';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { ApiResponse } from './utils/apiResponse.js';
import { swaggerSpec } from './config/swagger.js';
import apiRouter from './routes/index.js';
import adminRoutes from './routes/admin.routes.js';
import authRoutes from './routes/auth.routes.js';
import trainerRoutes from './routes/trainer.routes.js';
import memberRoutes from './routes/member.routes.js';
import receiptRoutes from './routes/receipt.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import payrollRoutes from './routes/payroll.routes.js';
import expensesRoutes from './routes/expenses.routes.js';
import { notFoundHandler } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';

export const createApp = (): Application => {
  const app: Application = express();

  // 1. Security Headers (Configured for Swagger UI compatibility)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
        },
      },
    })
  );

  // 2. CORS Handling
  app.use(
    cors({
      origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(','),
      credentials: true,
    })
  );

  // 3. Body Parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 4. Request Logging Middleware
  app.use((req: Request, res: Response, next) => {
    const start = Date.now();
    res.on('finish', () => {
      // Don't clutter logs with swagger static asset requests
      if (!req.originalUrl.startsWith('/api-docs')) {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.originalUrl} [${res.statusCode}] - ${duration}ms`);
      }
    });
    next();
  });

  // 5. Swagger UI Documentation
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'Gym ERP API Docs',
      swaggerOptions: {
        persistAuthorization: true,
      },
    })
  );

  // Raw OpenAPI JSON spec endpoint
  app.get('/api-docs.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // 6. Root Welcome Route
  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json(
      ApiResponse.success(
        {
          name: 'Gym ERP Backend API',
          version: '1.0.0',
          engine: 'Express.js (TypeScript)',
          orm: 'Prisma',
          documentation: '/api-docs',
          endpoints: {
            docs: '/api-docs',
            health: '/api/v1/health',
            auth: '/api/v1/auth',
            trainers: '/api/v1/trainers',
            members: '/api/v1/members',
          },
        },
        'Welcome to Gym ERP API'
      )
    );
  });

  // 7. Mount API routes
  app.use('/api/v1', apiRouter);
  app.use('/api/v1/v1', apiRouter);
  app.use('/api/auth', authRoutes);
  app.use('/api/trainers', trainerRoutes);
  app.use('/api/members', memberRoutes);
  app.use('/api/receipts', receiptRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/payroll', payrollRoutes);
  app.use('/api/expenses', expensesRoutes);
  app.use('/api/admin', adminRoutes);

  // 8. 404 Not Found Handler
  app.use(notFoundHandler);

  // 9. Centralized Error Handler
  app.use(errorHandler);

  return app;
};
