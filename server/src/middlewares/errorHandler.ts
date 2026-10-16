import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

export interface AppError extends Error {
  statusCode?: number;
  status?: number;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error(`Unhandled error at ${req.method} ${req.originalUrl}:`, err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';
  const errors = config.isDev ? err.stack : undefined;

  res.status(statusCode).json(
    ApiResponse.error(message, statusCode, errors)
  );
};
