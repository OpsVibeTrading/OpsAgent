import { fail, getToolTimeoutMs, ok, type ToolResult, withTimeout } from "@lib/ai/tool/response";
import { createAsterTradingClient, type Ticker24hr } from "@lib/aster-trading/client";
import { logger } from "@lib/logger/logger";
import { isValidSymbol } from "@services/trading";
import { tool } from "ai";
import { z } from "zod";

export const get24hTickerTool = tool({
  description: `
    Get 24-hour price change statistics for a trading symbol or all symbols.
    Returns price change, volume, high/low prices, and other statistics for the last 24 hours.
    This is a PUBLIC API that doesn't require portfolio credentials.
  `,
  inputSchema: z.object({
    symbol: z
      .string()
      .optional()
      .describe("Trading symbol, e.g., BTCUSDT. If not provided, returns data for all symbols"),
  }),
  execute: async ({ symbol }): Promise<ToolResult<Ticker24hr | Ticker24hr[]>> => {
    try {
      if (!symbol || !isValidSymbol(symbol)) {
        return fail("Invalid symbol", "Symbol is not valid");
      }

      const publicApiKey = process.env.ASTER_PUBLIC_API_KEY;
      if (!publicApiKey) {
        return fail("Public API key not found", "ASTER_PUBLIC_API_KEY not configured");
      }

      const baseUrl = process.env.ASTER_TRADING_BASE_URL;
      if (!baseUrl) {
        return fail("Base URL not found", "ASTER_TRADING_BASE_URL not configured");
      }

      const client = createAsterTradingClient({
        apiKey: publicApiKey,
        baseURL: baseUrl,
      });

      const result = await withTimeout(client.get24hrTicker(symbol), getToolTimeoutMs(15 * 1000));

      const message = symbol
        ? `Fetched 24h ticker for ${symbol}`
        : `Fetched 24h ticker for all symbols`;

      return ok(result, message);
    } catch (error) {
      logger.error({ error, symbol }, "Failed to get 24h ticker");
      return fail("Failed to get 24h ticker", error);
    }
  },
});
