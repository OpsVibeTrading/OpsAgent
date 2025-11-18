import { fail, getToolTimeoutMs, ok, type ToolResult, withTimeout } from "@lib/ai/tool/response";
import type { Credentials, Portfolio } from "@lib/db/schema";
import { getPortfolioBalance } from "@services/trading";
import { tool } from "ai";
import { z } from "zod";

export const getPortfolioBalanceTool = (portfolio: Portfolio) =>
  tool({
    description: `Get the current USDT balance of your portfolio.`,
    inputSchema: z.object({}),
    execute: async (): Promise<ToolResult<string>> => {
      try {
        if (!portfolio.credentials) {
          return fail("Portfolio credentials not found", "Missing API credentials");
        }

        const result = await withTimeout(
          getPortfolioBalance(portfolio.credentials as Credentials),
          getToolTimeoutMs(3 * 60 * 1000),
        );

        return ok(result.totalWalletBalance, `Portfolio balance fetched successfully`);
      } catch (error) {
        return fail("Failed to get portfolio balance", error);
      }
    },
  });
