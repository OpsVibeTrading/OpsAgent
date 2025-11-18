import { fail, getToolTimeoutMs, ok, type ToolResult, withTimeout } from "@lib/ai/tool/response";
import type { Credentials } from "@lib/db/schema";
import { getKlines } from "@services/trading";
import { tool } from "ai";
import { awesomeOscillator, ichimokuCloud, relativeStrengthIndex } from "indicatorts";
import { z } from "zod";

const baseSchema = {
  symbol: z.string().describe("Trading pair, e.g., 'BTCUSDT'"),
  timeframe: z.string().default("1h").describe("Timeframe, e.g., '1m', '1h', '1d'"),
  limit: z.number().default(100).describe("Number of OHLCV data points to fetch"),
};

export const calculateAwesomeOscillator = (credentials: Credentials) => tool({
  description: "Calculate the Awesome Oscillator (AO) using Binance OHLCV data",
  inputSchema: z.object({
    ...baseSchema,
    fastPeriod: z.number().default(5).describe("Fast period for AO"),
    slowPeriod: z.number().default(34).describe("Slow period for AO"),
  }),
  execute: async ({
    symbol,
    timeframe,
    fastPeriod,
    slowPeriod,
    limit,
  }: {
    symbol: string;
    timeframe: string;
    fastPeriod: number;
    slowPeriod: number;
    limit: number;
  }): Promise<ToolResult<any>> => {
    try {
      const asset = await withTimeout(
        getKlines(credentials, { symbol, timeframe, limit }),
        getToolTimeoutMs(10 * 1000),
      );
      const result = awesomeOscillator(asset.map((kline) => Number(kline.high)), asset.map((kline) => Number(kline.low)), {
        fast: fastPeriod,
        slow: slowPeriod,
      });
      return ok(result, "Calculated Awesome Oscillator");
    } catch (error) {
      return fail("Failed to calculate Awesome Oscillator", error);
    }
  },
});

export const calculateIchimokuCloud = (credentials: Credentials) => tool({
  description: "Calculate the Ichimoku Cloud using Binance OHLCV data",
  inputSchema: z.object({
    ...baseSchema,
    conversionPeriod: z.number().default(9).describe("Conversion line period"),
    basePeriod: z.number().default(26).describe("Base line period"),
    spanPeriod: z.number().default(52).describe("Leading span period"),
  }),
  execute: async ({
    symbol,
    timeframe,
    conversionPeriod,
    basePeriod,
    spanPeriod,
    limit,
  }: {
    symbol: string;
    timeframe: string;
    conversionPeriod: number;
    basePeriod: number;
    spanPeriod: number;
    limit: number;
  }): Promise<ToolResult<any>> => {
    try {
      const asset = await withTimeout(
        getKlines(credentials, { symbol, timeframe, limit }),
        getToolTimeoutMs(10 * 1000),
      );
      const ichimokuResult = ichimokuCloud(asset.map((kline) => Number(kline.high)), asset.map((kline) => Number(kline.low)), asset.map((kline) => Number(kline.close)), {
        short: conversionPeriod,
        medium: basePeriod,
        long: spanPeriod,
      });


      return ok(ichimokuResult, "Calculated Ichimoku Cloud");
    } catch (error) {
      return fail("Failed to calculate Ichimoku Cloud", error);
    }
  },
});

export const calculateRelativeStrengthIndex = (credentials: Credentials) =>  
  tool({
  description: "Calculate the Relative Strength Index (RSI) using Binance OHLCV data",
  inputSchema: z.object({
    ...baseSchema,
    period: z.number().default(14).describe("Period length for RSI"),
  }),
  execute: async ({ symbol, timeframe, period, limit }): Promise<ToolResult<any>> => {
    try {
      const asset = await withTimeout(
        getKlines(credentials, { symbol, timeframe, limit }),
        getToolTimeoutMs(10 * 1000),
      );
      const result = relativeStrengthIndex(asset.map((kline) => Number(kline.close)), { period });
      return ok(result, "Calculated RSI");
    } catch (error) {
    return fail("Failed to calculate RSI", error);
  }
}});





