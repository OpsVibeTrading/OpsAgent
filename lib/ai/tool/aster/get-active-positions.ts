import { fail, getToolTimeoutMs, ok, type ToolResult, withTimeout } from "@lib/ai/tool/response";
import type { Position as AsterPosition, OpenOrder } from "@lib/aster-trading";
import type { Credentials, Portfolio } from "@lib/db/schema";
import { getActivePositionsWithOrders } from "@services/trading";
import { tool } from "ai";
import { z } from "zod";

export const getActivePositionsTool = (portfolio: Portfolio) =>
  tool({
    description: `Get active positions of your current portfolio. You should use this tool after create or close an order for double check.`,
    inputSchema: z.object({}),
    execute: async (): Promise<ToolResult<Array<AsterPosition & { openOrders: OpenOrder[] }>>> => {
      try {
        if (!portfolio.credentials) {
          return fail("Portfolio credentials not found", "Missing API credentials");
        }

        const result = await withTimeout(
          getActivePositionsWithOrders(portfolio.credentials as Credentials),
          getToolTimeoutMs(3 * 60 * 1000),
        );

        return ok(result, `Active positions fetched successfully`);
      } catch (error) {
        return fail("Failed to get active positions", error);
      }
    },
  });
