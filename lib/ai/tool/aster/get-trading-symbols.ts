import { fail, getToolTimeoutMs, ok, type ToolResult, withTimeout } from "@lib/ai/tool/response";
import { createAsterTradingClient } from "@lib/aster-trading/client";
import { logger } from "@lib/logger/logger";
import { tool } from "ai";
import { z } from "zod";

export const getTradingSymbolsTool = tool({
  description: `
    Get a list of all available trading symbols on the exchange.
    Returns an array of symbol names like BTCUSDT, ETHUSDT, etc.
    This is a PUBLIC API that doesn't require portfolio credentials.
  `,
  inputSchema: z.object({}),
  execute: async (): Promise<ToolResult<string[]>> => {
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

      const result = await withTimeout(client.getTradingSymbols(), getToolTimeoutMs(15 * 1000));

      return ok(result, `Fetched ${result.length} trading symbols`);
    } catch (error) {
      logger.error({ error }, "Failed to get trading symbols");
      return fail("Failed to get trading symbols", error);
    }
  },
});
