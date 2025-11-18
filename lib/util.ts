export function removeUndefined<T>(obj: T): T {
  if (obj === undefined) {
    return undefined as any;
  }

  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(removeUndefined).filter((v) => v !== undefined) as any;
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const cleaned = removeUndefined(value);
    if (cleaned !== undefined) {
      result[key] = cleaned;
    }
  }
  return result;
}

export function to8PrecisionDown(num: number) {
  return Math.floor(num * 1e8) / 1e8;
}
