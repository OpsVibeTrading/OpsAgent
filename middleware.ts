import { globalExceptionHandler, UnauthorizedException } from "@lib/response/exception";
import cors from "cors";
import express from "express";
import { pinoHttp } from "pino-http";
import { logger } from "./lib/logger/logger";

export function extractTokenFromHeader(request: express.Request): string | null {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7); // Remove "Bearer " prefix
}

export const adminMiddleware = async (
  req: express.Request,
  _: express.Response,
  next: express.NextFunction,
) => {
  const token = extractTokenFromHeader(req);
  if (token !== process.env.ADMIN_API_TOKEN) {
    throw new UnauthorizedException("Invalid token");
  }
  next();
};

// Logging middleware
export const loggingMiddleware = pinoHttp(logger);

// Rate limiting middleware (simple implementation)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimitMiddleware = (limit = 1000, windowMs: number = 15 * 60 * 1000) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const now = Date.now();

    const record = requestCounts.get(ip);

    if (!record || now > record.resetTime) {
      requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= limit) {
      return res.status(429).json({
        error: "Too many requests",
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
    }

    record.count++;
    next();
  };
};

// Response time middleware
export const responseTimeMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info({ method: req.method, path: req.path, duration }, "Request completed");
  });

  next();
};

// CORS configuration
export const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(",") || [
    "http://localhost:3000",
    "http://localhost:3001",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};

// Common middleware setup function
export const setupMiddleware = (app: express.Application) => {
  // Basic middleware
  app.use(cors(corsOptions));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Custom middleware
  app.use(responseTimeMiddleware);
  app.use(loggingMiddleware);
  // app.use(rateLimitMiddleware(100, 15 * 60 * 1000)); // 100 requests per 15 minutes
};

export const handleError = globalExceptionHandler;

import { ValidationException } from "@lib/response/exception";
import type { Request } from "express";
import type { ZodError, ZodType, z } from "zod";

export function formatZodError(error: ZodError) {
  return error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.join(".") : "input";
    return `${path}: ${issue.message}`;
  });
}

function validate<T extends ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationException("Invalid input", formatZodError(result.error).join("; "));
  }
  return result.data;
}

type Schemas = {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
};

type ValidatedRequest<T extends Schemas> = {
  [K in keyof T]: T[K] extends ZodType ? z.infer<T[K]> : never;
};

export function validateRequest<T extends Schemas>(schemas: T, req: Request): ValidatedRequest<T> {
  const out: Partial<Record<keyof T, unknown>> = {};

  if (schemas.body) out.body = validate(schemas.body, req.body);
  if (schemas.query) out.query = validate(schemas.query, req.query);
  if (schemas.params) out.params = validate(schemas.params, req.params);

  return out as ValidatedRequest<T>;
}
