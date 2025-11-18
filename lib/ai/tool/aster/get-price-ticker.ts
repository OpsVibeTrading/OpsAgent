import { fail, getToolTimeoutMs, ok, type ToolResult, withTimeout } from "@lib/ai/tool/response";
import { createAsterTradingClient, type PriceTicker } from "@lib/aster-trading/client";
import { logger } from "@lib/logger/logger";
import { tool } from "ai";
import { z } from "zod";

export const getPriceTickerTool = tool({
  description: `
    Get the current price for a trading symbol or all symbols.
    Returns the latest price information.
    This is a PUBLIC API that doesn't require portfolio credentials.
  `,
  inputSchema: z.object({
    symbol: z
      .string()
      .optional()
      .describe("Trading symbol, e.g., BTCUSDT. If not provided, returns prices for all symbols"),
  }),
  execute: async ({ symbol }): Promise<ToolResult<PriceTicker | PriceTicker[]>> => {
    try {
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

      const result = await withTimeout(client.getPriceTicker(symbol), getToolTimeoutMs(15 * 1000));

      const message = symbol
        ? `Fetched price ticker for ${symbol}`
        : `Fetched price ticker for all symbols`;

      return ok(result, message);
    } catch (error) {
      logger.error({ error, symbol }, "Failed to get price ticker");
      return fail("Failed to get price ticker", error);
    }
  },
});
