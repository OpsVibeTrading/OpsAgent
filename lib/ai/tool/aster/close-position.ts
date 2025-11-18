import { fail, getToolTimeoutMs, ok, type ToolResult, withTimeout } from "@lib/ai/tool/response";
import type { ClosePositionResponse } from "@lib/aster-trading/client";
import type { Credentials, Portfolio } from "@lib/db/schema";
import { logger } from "@lib/logger/logger";
import { closePosition, isValidSymbol } from "@services/trading";
import { tool } from "ai";
import { z } from "zod";

export const closePositionTool = (portfolio: Portfolio) =>
  tool({
    description: `
      Close an open position for a specific trading symbol.
      This will cancel all related orders and close the position at market price.
    `,
    inputSchema: z.object({
      symbol: z.string().describe("Trading symbol to close position, e.g., BTCUSDT"),
    }),
    execute: async ({ symbol }): Promise<ToolResult<ClosePositionResponse>> => {
      try {
        if (!portfolio.credentials) {
          return fail("Portfolio credentials not found", "Missing API credentials");
        }

        const result = await withTimeout(
          closePosition(portfolio.credentials as Credentials, symbol),
          getToolTimeoutMs(30 * 1000),
        );

        return ok(
          result,
          `Position closed: ${symbol} (${result.totalClosed} position(s), ${result.cancelledOrders} order(s) cancelled)`,
        );
      } catch (error) {
        logger.error({ error, symbol }, "Failed to close position");
        return fail("Failed to close position", error);
      }
    },
  });
