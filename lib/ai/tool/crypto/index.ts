/* eslint-disable @typescript-eslint/no-explicit-any */
import { fail, getToolTimeoutMs, ok, type ToolResult, withTimeout } from "@lib/ai/tool/response";
import { tool } from "ai";
import axios from "axios";
import z from "zod";

const BASE_URL = "https://api.binance.com";
export const getOrderBook = tool({
  description: "Get the order book for a trading pair",
  inputSchema: z.object({
    symbol: z.string().describe("Trading pair symbol, e.g. BTCUSDT"),
    limit: z.number().optional().describe("Order book depth, default 100, max 5000"),
  }),
  execute: async (args: { symbol: string; limit?: number }): Promise<ToolResult<any>> => {
    try {
      const response = await withTimeout(
        axios.get(`${BASE_URL}/api/v3/depth`, {
          params: { symbol: args.symbol, limit: args.limit },
        }),
        getToolTimeoutMs(),
      );
      return ok(response.data, "Fetched order book");
    } catch (error) {
      return fail("Failed to get order book", error);
    }
  },
});

export const getRecentTrades = tool({
  description: "Get recent trades list for a trading pair",
  inputSchema: z.object({
    symbol: z.string().describe("Trading pair symbol, e.g. BTCUSDT"),
    limit: z.number().optional().describe("Number of trades to return, default 500, max 1000"),
  }),
  execute: async (args: { symbol: string; limit?: number }): Promise<ToolResult<any>> => {
    try {
      const response = await withTimeout(
        axios.get(`${BASE_URL}/api/v3/trades`, {
          params: { symbol: args.symbol, limit: args.limit },
        }),
        getToolTimeoutMs(),
      );
      return ok(response.data, "Fetched recent trades");
    } catch (error) {
      return fail("Failed to get recent trades", error);
    }
  },
});

export const getHistoricalTrades = tool({
  description: "Get historical trades for a trading pair",
  inputSchema: z.object({
    symbol: z.string().describe("Trading pair symbol, e.g. BTCUSDT"),
    limit: z.number().optional().describe("Number of trades to return, default 500, max 1000"),
    fromId: z
      .number()
      .optional()
      .describe("Trade ID to start from, default returns the most recent trades"),
  }),
  execute: async (args: {
    symbol: string;
    limit?: number;
    fromId?: number;
  }): Promise<ToolResult<any>> => {
    try {
      const response = await withTimeout(
        axios.get(`${BASE_URL}/api/v3/historicalTrades`, {
          params: { symbol: args.symbol, limit: args.limit, fromId: args.fromId },
          headers: { "X-MBX-APIKEY": process.env.BINANCE_API_KEY || "" },
        }),
        getToolTimeoutMs(),
      );
      return ok(response.data, "Fetched historical trades");
    } catch (error) {
      return fail("Failed to get historical trades", error);
    }
  },
});

export const getAggregateTrades = tool({
  description: "Get aggregate trades for a trading pair",
  inputSchema: z.object({
    symbol: z.string().describe("Trading pair symbol, e.g. BTCUSDT"),
    fromId: z.number().optional().describe("Aggregate trade ID to start from"),
    startTime: z.number().optional().describe("Start timestamp (milliseconds)"),
    endTime: z.number().optional().describe("End timestamp (milliseconds)"),
    limit: z.number().optional().describe("Number of trades to return, default 500, max 1000"),
  }),
  execute: async (args: {
    symbol: string;
    fromId?: number;
    startTime?: number;
    endTime?: number;
    limit?: number;
  }): Promise<ToolResult<any>> => {
    try {
      const response = await withTimeout(
        axios.get(`${BASE_URL}/api/v3/aggTrades`, {
          params: {
            symbol: args.symbol,
            fromId: args.fromId,
            startTime: args.startTime,
            endTime: args.endTime,
            limit: args.limit,
          },
        }),
        getToolTimeoutMs(),
      );
      return ok(response.data, "Fetched aggregate trades");
    } catch (error) {
      return fail("Failed to get aggregate trades", error);
    }
  },
});

export const getKlines = tool({
  description: "Get candlestick (kline) data",
  inputSchema: z.object({
    symbol: z.string().describe("Trading pair symbol, e.g. BTCUSDT"),
    interval: z
      .string()
      .describe(
        "K-line interval, e.g. 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M",
      ),
    startTime: z.number().optional().describe("Start timestamp (milliseconds)"),
    endTime: z.number().optional().describe("End timestamp (milliseconds)"),
    timeZone: z.string().optional().describe("Time zone, default UTC"),
    limit: z.number().optional().describe("Number of K-lines to return, default 500, max 1000"),
  }),
  execute: async (args: {
    symbol: string;
    interval: string;
    startTime?: number;
    endTime?: number;
    timeZone?: string;
    limit?: number;
  }): Promise<ToolResult<any>> => {
    try {
      const response = await withTimeout(
        axios.get(`${BASE_URL}/api/v3/klines`, {
          params: {
            symbol: args.symbol,
            interval: args.interval,
            startTime: args.startTime,
            endTime: args.endTime,
            timeZone: args.timeZone,
            limit: args.limit,
          },
        }),
        getToolTimeoutMs(),
      );
      return ok(response.data, "Fetched K-lines");
    } catch (error) {
      return fail("Failed to get K-line data", error);
    }
  },
});

export const getUiKlines = tool({
  description: "Get UI candlestick (kline) data",
  inputSchema: z.object({
    symbol: z.string().describe("Trading pair symbol, e.g. BTCUSDT"),
    interval: z
      .string()
      .describe(
        "K-line interval, e.g. 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M",
      ),
    startTime: z.number().optional().describe("Start timestamp (milliseconds)"),
    endTime: z.number().optional().describe("End timestamp (milliseconds)"),
    timeZone: z.string().optional().describe("Time zone, default UTC"),
    limit: z.number().optional().describe("Number of K-lines to return, default 500, max 1000"),
  }),
  execute: async (args: {
    symbol: string;
    interval: string;
    startTime?: number;
    endTime?: number;
    timeZone?: string;
    limit?: number;
  }): Promise<ToolResult<any>> => {
    try {
      const response = await withTimeout(
        axios.get(`${BASE_URL}/api/v3/uiKlines`, {
          params: {
            symbol: args.symbol,
            interval: args.interval,
            startTime: args.startTime,
            endTime: args.endTime,
            timeZone: args.timeZone,
            limit: args.limit,
          },
        }),
        getToolTimeoutMs(),
      );
      return ok(response.data, "Fetched UI K-lines");
    } catch (error) {
      return fail("Failed to get UI K-line data", error);
    }
  },
});

export const getAvgPrice = tool({
  description: "Get current average price for a trading pair",
  inputSchema: z.object({
    symbol: z.string().describe("Trading pair symbol, e.g. BTCUSDT"),
  }),
  execute: async (args: { symbol: string }): Promise<ToolResult<any>> => {
    try {
      const response = await withTimeout(
        axios.get(`${BASE_URL}/api/v3/avgPrice`, { params: { symbol: args.symbol } }),
        getToolTimeoutMs(),
      );
      return ok(response.data, "Fetched average price");
    } catch (error) {
      return fail("Failed to get average price", error);
    }
  },
});

export const get24hrTicker = tool({
  description: "Get 24hr price change statistics",
  inputSchema: z.object({
    symbol: z.string().optional().describe("Trading pair symbol, e.g. BTCUSDT"),
    symbols: z.array(z.string()).optional().describe("Array of multiple trading pair symbols"),
  }),
  execute: async (args: { symbol?: string; symbols?: string[] }): Promise<ToolResult<any>> => {
    try {
      let params: Record<string, unknown> = {};
      if (args.symbol) params = { symbol: args.symbol };
      else if (args.symbols) params = { symbols: JSON.stringify(args.symbols) };
      const response = await withTimeout(
        axios.get(`${BASE_URL}/api/v3/ticker/24hr`, { params }),
        getToolTimeoutMs(),
      );
      return ok(response.data, "Fetched 24hr ticker");
    } catch (error) {
      return fail("Failed to get 24hr price statistics", error);
    }
  },
});

export const getTradingDayTicker = tool({
  description: "Get trading day ticker statistics",
  inputSchema: z.object({
    symbol: z.string().optional().describe("Trading pair symbol, e.g. BTCUSDT"),
    symbols: z.array(z.string()).optional().describe("Array of multiple trading pair symbols"),
    timeZone: z.number().optional().describe("Time zone, default 0"),
    type: z.enum(["FULL", "MINI"]).optional().describe("Return data type, FULL or MINI"),
  }),
  execute: async (args: {
    symbol?: string;
    symbols?: string[];
    timeZone?: number;
    type?: "FULL" | "MINI";
  }): Promise<ToolResult<any>> => {
    try {
      const params: Record<string, unknown> = {};
      if (args.symbol) params.symbol = args.symbol;
      else if (args.symbols) params.symbols = JSON.stringify(args.symbols);
      if (args.timeZone !== undefined) params.timeZone = args.timeZone;
      if (args.type) params.type = args.type;

      const response = await withTimeout(
        axios.get(`${BASE_URL}/api/v3/ticker/tradingDay`, { params }),
        getToolTimeoutMs(),
      );
      return ok(response.data, "Fetched trading day ticker");
    } catch (error) {
      return fail("Failed to get trading day ticker", error);
    }
  },
});

export const getPrice = tool({
  description: "Get latest price for a symbol or symbols, format like: BTC/USDT",
  inputSchema: z.object({
    symbols: z
      .array(z.string())
      .describe("Array of multiple trading pair symbols, format like: [BTC/USDT]"),
  }),
  execute: async (args: { symbols: string[] }): Promise<ToolResult<any>> => {
    try {
      let params: Record<string, unknown> = {};
      if (args.symbols.some((s) => !s.includes("/"))) {
        return fail("Invalid symbol format, must be like: BTC/USDT");
      }
      const binanceSymbols = args.symbols
        .filter((s) => s !== "USDT" && s !== "USDT/USDT")
        .map((s) => s.replace("/", ""));
      params = { symbols: JSON.stringify(binanceSymbols) };
      const response = await withTimeout(
        axios.get(`${BASE_URL}/api/v3/ticker/price`, { params }),
        getToolTimeoutMs(),
      );

      // handle maping symbol
      const result: Record<string, number | string>[] = [];
      response.data.forEach((item: { symbol: string; price: number }) => {
        if (item.symbol === "USDT/USDT" || item.symbol === "USDT") {
          result.push({
            symbol: item.symbol,
            price: 1,
          });
          return;
        }

        args.symbols.forEach((s) => {
          const convertedSymbol = s.replace("/", "");
          if (convertedSymbol === item.symbol) {
            result.push({
              symbol: s,
              price: item.price as number,
            });
            return;
          }
        });
      });
      return ok(result, "Fetched price ticker");
    } catch (error) {
      return fail("Failed to get price ticker", error);
    }
  },
});

export const getBookTicker = tool({
  description: "Get best price/qty on the order book for a symbol or symbols",
  inputSchema: z.object({
    symbol: z.string().optional().describe("Trading pair symbol, e.g. BTCUSDT"),
    symbols: z.array(z.string()).optional().describe("Array of multiple trading pair symbols"),
  }),
  execute: async (args: { symbol?: string; symbols?: string[] }): Promise<ToolResult<any>> => {
    try {
      let params: Record<string, unknown> = {};
      if (args.symbol) params = { symbol: args.symbol };
      else if (args.symbols) params = { symbols: JSON.stringify(args.symbols) };
      const response = await withTimeout(
        axios.get(`${BASE_URL}/api/v3/ticker/bookTicker`, { params }),
        getToolTimeoutMs(),
      );
      return ok(response.data, "Fetched book ticker");
    } catch (error) {
      return fail("Failed to get order book ticker", error);
    }
  },
});

export const getRollingWindowTicker = tool({
  description: "Get rolling window price change statistics",
  inputSchema: z.object({
    symbol: z.string().optional().describe("Trading pair symbol, e.g. BTCUSDT"),
    symbols: z.array(z.string()).optional().describe("Array of multiple trading pair symbols"),
    windowSize: z.string().optional().describe("Window size, e.g. 1m, 4h, 1d"),
    type: z.enum(["FULL", "MINI"]).optional().describe("Return data type, FULL or MINI"),
  }),
  execute: async (args: {
    symbol?: string;
    symbols?: string[];
    windowSize?: string;
    type?: "FULL" | "MINI";
  }): Promise<ToolResult<any>> => {
    try {
      const params: Record<string, unknown> = {};
      if (args.symbol) params.symbol = args.symbol;
      else if (args.symbols) params.symbols = JSON.stringify(args.symbols);
      if (args.windowSize) params.windowSize = args.windowSize;
      if (args.type) params.type = args.type;
      const response = await withTimeout(
        axios.get(`${BASE_URL}/api/v3/ticker`, { params }),
        getToolTimeoutMs(),
      );
      return ok(response.data, "Fetched rolling window ticker");
    } catch (error) {
      return fail("Failed to get rolling window price statistics", error);
    }
  },
});
