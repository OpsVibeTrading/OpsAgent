/* eslint-disable @typescript-eslint/no-unsafe-function-type */

import { logger } from "@lib/logger/logger";
import type { NextFunction, Request, Response } from "express";
import { sendError } from "./response";

/**
 * Base API Exception class
 */
export class ApiException extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errorCode?: string;

  constructor(message: string, statusCode: number = 500, errorCode?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errorCode = errorCode;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Exception
 */
export class ValidationException extends ApiException {
  constructor(message: string = "Validation failed", errorCode?: string) {
    super(message, 400, errorCode);
  }
}

/**
 * Not Found Exception
 */
export class NotFoundException extends ApiException {
  constructor(message: string = "Resource not found", errorCode?: string) {
    super(message, 404, errorCode);
  }
}

/**
 * Unauthorized Exception
 */
export class UnauthorizedException extends ApiException {
  constructor(message: string = "Unauthorized", errorCode?: string) {
    super(message, 401, errorCode);
  }
}

/**
 * Forbidden Exception
 */
export class ForbiddenException extends ApiException {
  constructor(message: string = "Forbidden", errorCode?: string) {
    super(message, 403, errorCode);
  }
}

/**
 * Conflict Exception (for duplicate resources)
 */
export class ConflictException extends ApiException {
  constructor(message: string = "Resource already exists", errorCode?: string) {
    super(message, 409, errorCode);
  }
}

/**
 * Internal Server Error Exception
 */
export class InternalServerException extends ApiException {
  constructor(message: string = "Internal server error", errorCode?: string) {
    super(message, 500, errorCode);
  }
}

/**
 * Bad Request Exception
 */
export class BadRequestException extends ApiException {
  constructor(message: string = "Bad request", errorCode?: string) {
    super(message, 400, errorCode);
  }
}

/**
 * Global exception handler middleware
 * This should be registered as the last middleware in your Express app
 */
export const globalExceptionHandler = (
  err: Error | ApiException,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // If response already sent, delegate to Express default error handler
  if (res.headersSent) {
    next(err);
    return;
  }

  // Handle ApiException instances
  if (err instanceof ApiException) {
    sendError(
      res,
      err.message,
      process.env.NODE_ENV === "development" ? err.stack : err.errorCode,
      err.statusCode,
    );
    return;
  }

  logger.debug({ err }, "Error handler called");
  // Handle specific error types
  if (err.name === "JsonWebTokenError") {
    sendError(res, "Invalid token. Please log in again", undefined, 401);
    return;
  }

  if (err.name === "TokenExpiredError") {
    sendError(res, "Token expired. Please log in again", undefined, 401);
    return;
  }

  if (err.name === "ValidationError") {
    sendError(res, "Validation failed", err.message, 400);
    return;
  }

  // Log unexpected errors
  logger.error(
    {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
    },
    "Unexpected error",
  );

  // Handle unexpected errors
  const message = process.env.NODE_ENV === "production" ? "Something went wrong!" : err.message;

  const error = process.env.NODE_ENV === "development" ? err.stack : undefined;

  sendError(res, message, error, 500);
};

/**
 * Async error wrapper to catch errors in async route handlers
 */
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
