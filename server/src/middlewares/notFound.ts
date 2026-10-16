import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/apiResponse.js';

export const notFoundHandler = (req: Request, res: Response, _next: NextFunction): void => {
  res.status(404).json(
    ApiResponse.error(`Route not found: ${req.method} ${req.originalUrl}`, 404)
  );
};
