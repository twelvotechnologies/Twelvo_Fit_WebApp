import { IApiResponse } from '../types/api.types.js';

export class ApiResponse {
  static success<T>(data: T | null = null, message = 'Success', statusCode = 200): IApiResponse<T> {
    return {
      success: true,
      statusCode,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  static error(message = 'Internal Server Error', statusCode = 500, errors: unknown = null): IApiResponse<null> {
    return {
      success: false,
      statusCode,
      message,
      errors,
      timestamp: new Date().toISOString(),
    };
  }
}
