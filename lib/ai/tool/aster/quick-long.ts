import {
  fail,
  getToolTimeoutMs,
  ok,
  type ToolResult,
  withTimeout,
} from "@lib/ai/tool/response";
import type { QuickOrderResponse } from "@lib/aster-trading/client";
import type { Credentials, Portfolio } from "@lib/db/schema";
import { logger } from "@lib/logger/logger";
import {
  closePosition,
  getPortfolioBalance,
  isValidSymbol,
  placeQuickLong,
} from "@services/trading";
import { tool } from "ai";
import { z } from "zod";

export const quickLongTool = (portfolio: Portfolio) =>
  tool({
    description: `
      Place a quick LONG position with automatic stop-loss and take-profit.
      This will open a leveraged long position on the specified symbol with risk management.
    `,
    inputSchema: z.object({
      symbol: z.string().describe("Trading symbol, e.g., BTCUSDT"),
      usdtValue: z.number().describe("Position size in USDT, e.g., 100"),
      stopLossPercent: z
        .number()
        .describe(
          "Stop loss percentage, e.g., 40 means 40% loss. Should be >40%"
        ),
      takeProfitPercent: z
        .number()
        .describe(
          "Take profit percentage, e.g., 40 means 40% profit. Should be >40%"
        ),
      leverage: z.number().describe("Leverage multiplier"),
    }),
    execute: async ({
      symbol,
      usdtValue,
      stopLossPercent,
      takeProfitPercent,
      leverage,
    }): Promise<ToolResult<QuickOrderResponse>> => {
      try {
        if (!symbol || !isValidSymbol(symbol)) {
          return fail("Invalid symbol", "Symbol is not valid");
        }

        if (!portfolio.credentials) {
          return fail(
            "Portfolio credentials not found",
            "Missing API credentials"
          );
        }
        const balance = await getPortfolioBalance(
          portfolio.credentials as Credentials
        );
        if (
          Number.parseFloat(balance.availableBalance) - usdtValue <
          (portfolio.balanceFloor || 0)
        ) {
          return fail(
            `Ensure the portfolio balance always remains above: ${portfolio.balanceFloor}`
          );
        }

        const result = await withTimeout(
          placeQuickLong(portfolio.credentials as Credentials, {
            symbol,
            usdtValue,
            stopLossPercent,
            takeProfitPercent,
            leverage,
          }),
          getToolTimeoutMs(30 * 1000)
        );

        if (!result.stopLoss?.orderId || !result.takeProfit?.orderId) {
          await closePosition(portfolio.credentials as Credentials, symbol);
          return fail(
            `Created order: ${JSON.stringify(
              result
            )} but failed to create stop loss or take profit. Auto closed position: ${symbol}`
          );
        }

        return ok(
          result,
          `LONG position opened: ${symbol} with ${usdtValue} USDT at ${leverage}x leverage`
        );
      } catch (error) {
        logger.error(
          { error, symbol, usdtValue },
          "Failed to place quick long order"
        );
        return fail("Failed to place quick long order", error);
      }
    },
  });
