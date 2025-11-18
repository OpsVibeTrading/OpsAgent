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
