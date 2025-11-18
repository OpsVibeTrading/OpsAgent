import { fail, getToolTimeoutMs, ok, type ToolResult, withTimeout } from "@lib/ai/tool/response";
import type { CancelOrderResponse } from "@lib/aster-trading/client";
import type { Credentials, Portfolio } from "@lib/db/schema";
import { logger } from "@lib/logger/logger";
import { createTradingClient, isValidSymbol } from "@services/trading";
import { tool } from "ai";
import { z } from "zod";

export const cancelOrderTool = (portfolio: Portfolio) =>
  tool({
    description: `
      Cancel an order by orderId or cancel all open orders for a symbol or all symbols.
    `,
    inputSchema: z.object({
      orderId: z.string().optional().describe("Order ID to cancel"),
      symbol: z
        .string()
        .optional()
        .describe(
          "If provided without orderId, cancel all open orders for this symbol. If omitted and orderId omitted, cancel all open orders across symbols.",
        ),
    }),
    execute: async ({
      orderId,
      symbol,
    }): Promise<ToolResult<CancelOrderResponse | CancelOrderResponse[]>> => {
      try {
        if (!portfolio.credentials) {
          return fail("Portfolio credentials not found", "Missing API credentials");
        }

        const client = createTradingClient(portfolio.credentials as Credentials);

        if (orderId) {
          const result = await withTimeout(
            client.cancelOrder(orderId, symbol),
            getToolTimeoutMs(30 * 1000),
          );
          return ok(result, `Cancelled order ${orderId}${symbol ? " for " + symbol : ""}`);
        }

        const result = await withTimeout(
          client.cancelAllOrders(symbol),
          getToolTimeoutMs(30 * 1000),
        );
        return ok(
          result,
          `Cancelled ${result.length} open order(s)${symbol ? " for " + symbol : " across all symbols"}`,
        );
      } catch (error) {
        logger.error({ error, orderId, symbol }, "Failed to cancel order(s)");
        return fail("Failed to cancel order(s)", error);
      }
    },
  });
