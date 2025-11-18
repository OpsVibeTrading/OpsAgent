import { logger } from "@lib/logger/logger";

export type AsterTradingConfig = {
  apiKey: string;
  baseURL: string;
};

export type Position = {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  maxNotionalValue: string;
  marginType: string;
  isolatedMargin: string;
  isAutoAddMargin: string;
  positionSide: string;
  notional: string;
  isolatedWallet: string;
  updateTime: number;
};

export type OpenOrder = {
  orderId: number;
  symbol: string;
  status: string;
  clientOrderId: string;
  price: string;
  avgPrice: string;
  origQty: string;
  executedQty: string;
  cumQuote: string;
  timeInForce: string;
  type: string;
  reduceOnly: boolean;
  closePosition: boolean;
  side: string;
  positionSide: string;
  stopPrice: string;
  workingType: string;
  priceProtect: boolean;
  origType: string;
  time: number;
  updateTime: number;
};

export type Trade = {
  symbol: string;
  id: number;
  orderId: number;
  side: string;
  price: string;
  qty: string;
  realizedPnl: string;
  marginAsset: string;
  quoteQty: string;
  commission: string;
  commissionAsset: string;
  time: number;
  positionSide: string;
  maker: boolean;
  buyer: boolean;
};

export type OrderDetails = {
  orderId: number;
  symbol: string;
  status: string;
  side: string;
  type: string;
  stopPrice?: string;
  price?: string;
  origQty?: string;
  executedQty?: string;
  cumQuote?: string;
  timeInForce?: string;
  reduceOnly?: boolean;
  closePosition?: boolean;
};

export type QuickOrderResponse = {
  mainOrder: OrderDetails;
  stopLoss?: OrderDetails;
  takeProfit?: OrderDetails;
};

export type Balance = {
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  availableBalance: string;
};

export type OrderHistory = {
  orderId: number;
  symbol: string;
  status: string;
  clientOrderId: string;
  price: string;
  avgPrice: string;
  origQty: string;
  executedQty: string;
  cumQuote: string;
  timeInForce: string;
  type: string;
  reduceOnly: boolean;
  closePosition: boolean;
  side: string;
  positionSide: string;
  stopPrice: string;
  workingType: string;
  priceProtect: boolean;
  origType: string;
  time: number;
  updateTime: number;
  newChainData: {
    hash: string;
  };
};

export type ClosePositionResponse = {
  cancelledOrders: number;
  closedPositions: Array<{
    positionSide: string;
    quantity: string;
    side: string;
    result: Record<string, unknown>;
  }>;
  totalClosed: number;
};

export type CancelOrderResponse = {
  orderId: number;
  symbol: string;
  status: string;
};

export type Ticker24hr = {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  lastPrice: string;
  lastQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
};

export type PriceTicker = {
  symbol: string;
  price: string;
};

// Binance-style kline tuple
// [
//   openTime, "open", "high", "low", "close", "volume",
//   closeTime, "quoteVolume", trades, "takerBuyBaseVolume", "takerBuyQuoteVolume", "ignore"
// ]
export type Kline = {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteVolume: string;
  trades: number;
  takerBuyBaseVolume: string;
  takerBuyQuoteVolume: string;
  ignore: string;
};

function convertKlinesToKlineArray(input: unknown): Kline[] {
  if (!Array.isArray(input)) return [];

  const result: Kline[] = [];
  for (const item of input) {
    if (Array.isArray(item)) {
      const [
        openTime,
        open,
        high,
        low,
        close,
        volume,
        closeTime,
        quoteVolume,
        trades,
        takerBuyBaseVolume,
        takerBuyQuoteVolume,
        ignore,
      ] = item as unknown[];

      result.push({
        openTime: Number(openTime ?? 0),
        open: String(open ?? "0"),
        high: String(high ?? "0"),
        low: String(low ?? "0"),
        close: String(close ?? "0"),
        volume: String(volume ?? "0"),
        closeTime: Number(closeTime ?? 0),
        quoteVolume: String(quoteVolume ?? "0"),
        trades: Number(trades ?? 0),
        takerBuyBaseVolume: String(takerBuyBaseVolume ?? "0"),
        takerBuyQuoteVolume: String(takerBuyQuoteVolume ?? "0"),
        ignore: String(ignore ?? "0"),
      });
    } else if (item && typeof item === "object") {
      const obj = item as Partial<Kline> & Record<string, unknown>;
      result.push({
        openTime: Number(obj.openTime ?? 0),
        open: String(obj.open ?? "0"),
        high: String(obj.high ?? "0"),
        low: String(obj.low ?? "0"),
        close: String(obj.close ?? "0"),
        volume: String(obj.volume ?? "0"),
        closeTime: Number(obj.closeTime ?? 0),
        quoteVolume: String(obj.quoteVolume ?? "0"),
        trades: Number(obj.trades ?? 0),
        takerBuyBaseVolume: String(obj.takerBuyBaseVolume ?? "0"),
        takerBuyQuoteVolume: String(obj.takerBuyQuoteVolume ?? "0"),
        ignore: String(obj.ignore ?? "0"),
      });
    }
  }
  return result;
}


export class AsterTradingClient {
  private baseURL: string;
  private apiKey: string;

  constructor(config: AsterTradingConfig) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL 
  }

  private async request<T>(
    path: string,
    options: RequestInit & { params?: Record<string, string | number | undefined> } = {},
  ): Promise<T> {
    const { params, ...fetchOptions } = options;

    // Build URL with query params
    let url = `${this.baseURL}${path}`;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      }
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    const headers: Record<string, string> = {
      "X-API-Key": this.apiKey,
      "Content-Type": "application/json",
      accept: "application/json",
      ...((fetchOptions.headers as Record<string, string>) || {}),
    };

    logger.debug({ url, method: options.method || "GET" }, "Aster Trading API request");

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      const data = (await response.json()) as T;

      logger.debug({ status: response.status, data }, "Aster Trading API response");

      if (!response.ok) {
        logger.error({ status: response.status, data }, "Aster Trading API error response");
        throw new Error(`Aster Trading API error: ${response.status} - ${JSON.stringify(data)}`);
      }

      return data;
    } catch (error) {
      logger.error({ error, url }, "Aster Trading API request failed");
      throw error;
    }
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<Balance> {
    const response = await this.request<{
      success: boolean;
      data: Balance;
      timestamp: number;
    }>("/aster/portfolio/value");
    return response.data;
  }

  /**
   * Get all positions (optionally filter by symbol)
   */
  async getPositions(symbol?: string): Promise<Position[]> {
    const response = await this.request<{
      success: boolean;
      data: Position[];
      timestamp: number;
    }>("/aster/positions", {
      params: symbol ? { symbol } : undefined,
    });
    return response.data;
  }


  async getOrderHistory(params: {
    symbol?: string;
    startTime?: number;
    endTime?: number;
    fromId?: number;
    limit?: number;
  }): Promise<OrderHistory[]> {
    const response = await this.request<{
      success: boolean;
      data: OrderHistory[];
      timestamp: number;
    }>("/aster/history/orders", {
      params: params,
    });
    return response.data;
  }
  /**
   * Get all open orders (optionally filter by symbol)
   */
  async getOpenOrders(symbol?: string): Promise<OpenOrder[]> {
    const response = await this.request<{
      success: boolean;
      data: OpenOrder[];
      timestamp: number;
    }>("/aster/orders/open", {
      params: symbol ? { symbol } : undefined,
    });
    return response.data;
  }

  /**
   * Place a quick LONG position with auto SL/TP
   */
  async quickLong(params: {
    symbol: string;
    usdtValue: number;
    stopLossPercent?: number;
    takeProfitPercent?: number;
    leverage?: number;
  }): Promise<QuickOrderResponse> {
    const response = await this.request<{
      success: boolean;
      data: QuickOrderResponse;
      timestamp: number;
    }>("/aster/orders/quick-long", {
      method: "POST",
      body: JSON.stringify({
        symbol: params.symbol,
        usdtValue: params.usdtValue,
        stopLossPercent: params.stopLossPercent || 15,
        takeProfitPercent: params.takeProfitPercent || 15,
        leverage: params.leverage || 10,
      }),
    });
    return response.data;
  }

  /**
   * Place a quick SHORT position with auto SL/TP
   */
  async quickShort(params: {
    symbol: string;
    usdtValue: number;
    stopLossPercent?: number;
    takeProfitPercent?: number;
    leverage?: number;
  }): Promise<QuickOrderResponse> {
    const response = await this.request<{
      success: boolean;
      data: QuickOrderResponse;
      timestamp: number;
    }>("/aster/orders/quick-short", {
      method: "POST",
      body: JSON.stringify({
        symbol: params.symbol,
        usdtValue: params.usdtValue,
        stopLossPercent: params.stopLossPercent || 15,
        takeProfitPercent: params.takeProfitPercent || 15,
        leverage: params.leverage || 10,
      }),
    });
    return response.data;
  }

  /**
   * Close position for a specific symbol
   */
  async closePosition(symbol: string): Promise<ClosePositionResponse> {
    const response = await this.request<{
      success: boolean;
      data: ClosePositionResponse;
      timestamp: number;
    }>("/aster/positions/close-simple", {
      method: "POST",
      body: JSON.stringify({ symbol }),
    });
    return response.data;
  }

  /**
   * Get trade history
   */
  async getTradeHistory(params: {
    symbol: string;
    startTime?: number;
    endTime?: number;
    fromId?: number;
    limit?: number;
  }): Promise<Trade[]> {
    const response = await this.request<{
      success: boolean;
      data: Trade[];
      timestamp: number;
    }>("/aster/history/trades", {
      params: {
        symbol: params.symbol,
        startTime: params.startTime,
        endTime: params.endTime,
        fromId: params.fromId,
        limit: params.limit || 500,
      },
    });
    return response.data;
  }

  /**
   * Cancel an order by orderId
   */
  async cancelOrder(orderId: string, symbol?: string): Promise<CancelOrderResponse> {
    const response = await this.request<{
      success: boolean;
      data: CancelOrderResponse;
      timestamp: number;
    }>(`/aster/orders/${orderId}`, {
      method: "DELETE",
      params: symbol ? { symbol } : undefined,
    });
    return response.data;
  }

  /**
   * Cancel all open orders (optionally filter by symbol)
   */
  async cancelAllOrders(symbol?: string): Promise<CancelOrderResponse[]> {
    const response = await this.request<{
      success: boolean;
      data: CancelOrderResponse[];
      timestamp: number;
    }>("/aster/orders", {
      method: "DELETE",
      params: symbol ? { symbol } : undefined,
    });
    return response.data;
  }

  /**
   * Get all trading symbols
   */
  async getTradingSymbols(): Promise<string[]> {
    const response = await this.request<{
      success: boolean;
      data: string[];
      timestamp: number;
    }>("/aster/market/symbols");
    return response.data;
  }

  /**
   * Get 24hr ticker price change statistics
   */
  async get24hrTicker(symbol?: string): Promise<Ticker24hr | Ticker24hr[]> {
    const response = await this.request<{
      success: boolean;
      data: Ticker24hr | Ticker24hr[];
      timestamp: number;
    }>("/aster/ticker/24hr", {
      params: symbol ? { symbol } : undefined,
    });
    return response.data;
  }

  /**
   * Get current price for symbol(s)
   */
  async getPriceTicker(symbol?: string): Promise<PriceTicker | PriceTicker[]> {
    const response = await this.request<{
      success: boolean;
      data: PriceTicker | PriceTicker[];
      timestamp: number;
    }>("/aster/ticker/price", {
      params: symbol ? { symbol } : undefined,
    });
    return response.data;
  }

  /**
   * Get klines (candlesticks)
   */
  async getKlines(params: {
    symbol: string;
    interval: string;
    startTime?: number;
    endTime?: number;
    limit?: number;
  }): Promise<Kline[]> {
    const response = await this.request<{
      success: boolean;
      data: unknown;
      timestamp: number;
    }>("/aster/klines", {
      params,
    });

    return convertKlinesToKlineArray(response.data);
  }
}

/**
 * Create an Aster Trading client instance
 */
export function createAsterTradingClient(config: AsterTradingConfig): AsterTradingClient {
  return new AsterTradingClient(config);
}
