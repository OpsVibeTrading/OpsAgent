import { removeUndefined } from "@lib/util";

export type ToolResult<T = unknown> = {
  success: boolean;
  error: unknown; // null or error object
  message: string; // human readable message
  data: null | T;
};

export const getToolTimeoutMs = (timeoutMs: number = 2 * 60 * 1000): number => {
  return timeoutMs;
};

export const ok = <T>(data: T, message: string = "OK"): ToolResult<T> =>
  removeUndefined({
    success: true,
    error: null,
    message,
    data,
  });

export const fail = <T = unknown>(message: string, error?: unknown): ToolResult<T> =>
  removeUndefined({
    success: false,
    error: errorToString(error),
    message,
    data: null,
  });

export const withTimeout = async <T>(promise: Promise<T>, ms: number): Promise<T> => {
  let timeoutId: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Timeout after ${ms}ms`));
    }, ms);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result as T;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export function errorToString(error: unknown): string {
  if (error instanceof Error) return error.message;
  return JSON.stringify(error, null, 2); // pretty-print if it's an object
}
