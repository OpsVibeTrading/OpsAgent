import z from "zod";

// Quick long/short order schema
export const quickLongSchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  usdtValue: z.number().positive("USDT value must be positive"),
  stopLossPercent: z.number().positive().optional().default(15),
  takeProfitPercent: z.number().positive().optional().default(15),
  leverage: z.number().int().min(1).max(125).optional().default(10),
});

export const quickShortSchema = quickLongSchema;

// Close position schema
export const closePositionSchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
});

// Fetch positions query schema
export const fetchPositionsQuerySchema = z.object({
  symbol: z.string().optional(),
});

// Fetch trade history query schema
export const fetchTradeHistoryQuerySchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  startTime: z.coerce.number().optional(),
  endTime: z.coerce.number().optional(),
  fromId: z.coerce.number().optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(500),
});

// Market data query schemas
export const ticker24hrQuerySchema = z.object({
  symbol: z.string().optional(),
});

export const priceTickerQuerySchema = z.object({
  symbol: z.string().optional(),
});



export type QuickLongInput = z.infer<typeof quickLongSchema>;
export type QuickShortInput = z.infer<typeof quickShortSchema>;
export type ClosePositionInput = z.infer<typeof closePositionSchema>;
export type FetchPositionsQuery = z.infer<typeof fetchPositionsQuerySchema>;
export type FetchTradeHistoryQuery = z.infer<typeof fetchTradeHistoryQuerySchema>;
export type Ticker24hrQuery = z.infer<typeof ticker24hrQuerySchema>;
export type PriceTickerQuery = z.infer<typeof priceTickerQuerySchema>;
