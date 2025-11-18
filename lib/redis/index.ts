// Export Redis client and utilities
// export { connectRedis, redis } from "./client";
// export { default as client } from "./client";

// Utility function for generating cache keys
export function generateCacheKey(...parts: (string | number)[]): string {
  return parts.filter((a) => a !== "" && !!a).join(":");
}

export const CACHE_KEY = {
  portfolioList(userId: number): string {
    return generateCacheKey("portfolio", "list", userId);
  },
  portfolioTemplate(): string {
    return generateCacheKey("portfolio", "template");
  },

  cryptoTokenList(exchange: "binance" | "okx"): string {
    return generateCacheKey("crypto", "token", "list", exchange);
  },
  cryptoTokenPrice(symbol: string, exchange: "binance" | "okx"): string {
    return generateCacheKey("crypto", "token", "price", symbol, exchange);
  },
  cryptoTokenHistory(symbol: string, exchange: "binance" | "okx"): string {
    return generateCacheKey("crypto", "token", "history", symbol, exchange);
  },
  cryptoTokenInfo(exchange: "binance" | "okx", symbol: string): string {
    return generateCacheKey("crypto", "token", "info", exchange, symbol);
  },

  // order

  orderByPortfolioId(portfolioId: number): string {
    return generateCacheKey("order", portfolioId);
  },

  // transaction
  transactionsByPortfolioId(portfolioId: number): string {
    return generateCacheKey("transaction", portfolioId);
  },

  // Rule
  rules(): string {
    return generateCacheKey("rules");
  },
  marketRule(symbol: string, exchange: string): string {
    return generateCacheKey("rule", "market", symbol, exchange);
  },

  // Market
  tradingSymbolsWithTicker(): string {
    return generateCacheKey("market", "symbols", "ticker");
  },
};
