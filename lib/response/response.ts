import type { Response } from "express";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

/**
 * Send a successful response with data
 */
export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200,
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    ...(data !== undefined && { data }),
  };

  return res.status(statusCode).json(response);
};

/**
 * Send an error response for expected errors (validation, not found, etc.)
 */
export const sendError = (
  res: Response,
  message: string,
  error?: string,
  statusCode: number = 400,
): Response => {
  const response: ApiResponse = {
    success: false,
    message,
    ...(error && { error }),
  };

  return res.status(statusCode).json(response);
};

/**
 * Send not found response
 */
export const sendNotFound = (res: Response, message: string = "Resource not found"): Response => {
  return sendError(res, message, undefined, 404);
};

/**
 * Send unauthorized response
 */
export const sendUnauthorized = (res: Response, message: string = "Unauthorized"): Response => {
  return sendError(res, message, undefined, 401);
};

/**
 * Send validation error response
 */
export const sendValidationError = (
  res: Response,
  message: string = "Validation failed",
  error?: string,
): Response => {
  return sendError(res, message, error, 400);
};

/**
 * Utility to create response objects without sending them (for use in services)
 */
export const createSuccessResponse = <T>(message: string, data?: T): ApiResponse<T> => ({
  success: true,
  message,
  ...(data !== undefined && { data }),
});

export const createErrorResponse = (message: string, error?: string): ApiResponse => ({
  success: false,
  message,
  ...(error && { error }),
});
