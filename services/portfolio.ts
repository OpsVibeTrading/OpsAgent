import type { OpenOrder } from "@lib/aster-trading/client";
import { createBalanceSnapshot } from "@lib/db/query/balance-snapshot";
import { getPortfolioById, getPortfolios } from "@lib/db/query/portfolio";
import { getTradingSymbols } from "@lib/db/query/symbol";
import { Credentials } from "@lib/db/schema";
import { getActivePositionsWithOrders, getPortfolioBalance } from "@services/trading";

export type CompletedPosition = {
  side: "LONG" | "SHORT";
  entryPrice: number;
  exitPrice: number;
  quantity: number
  pnl: number;
  symbol: string;
  holdingTime: number;
  createdAt: Date;
}
export async function getCompletedPositionByPortfolio(portfolioId: number): Promise<CompletedPosition[]> {
  const { getPortfolioById } = await import("@lib/db/query/portfolio");
  const { getGroupedOrdersByPortfolio } = await import("@lib/db/query/trade-history");

  const pf = await getPortfolioById(portfolioId);
  if (!pf) return [] as CompletedPosition[];

  const groups = await getGroupedOrdersByPortfolio(portfolioId);
  const bySymbol = new Map<string, typeof groups>();
  for (const g of groups) {
    const arr = bySymbol.get(g.symbol) || [];
    arr.push(g);
    bySymbol.set(g.symbol, arr);
  }

  const results: CompletedPosition[] = [];

  for (const [symbol, arr] of bySymbol.entries()) {
    // sort oldest -> newest
    arr.sort((a, b) => b.firstTradeTime.getTime() - a.firstTradeTime.getTime());

    const entries = arr.filter((g) => Math.abs(Number(g.realizedPnl || 0)) < 1e-12).map((g) => ({
      group: g,
      remaining: Number(g.totalQty),
    }));
    const exits = arr.filter((g) => Math.abs(Number(g.realizedPnl || 0)) >= 1e-12).map((g) => ({
      group: g,
      remaining: Number(g.totalQty),
    }));

    let ei = 0; // entry index
    let xi = 0; // exit index

    while (ei < entries.length && xi < exits.length) {
      const e = entries[ei];
      const x = exits[xi];
      if (!e || !x) break;

      const matchQty = Math.min(e.remaining, x.remaining);
      if (!(matchQty > 0)) {
        if (e && e.remaining <= 0) ei++;
        if (x && x.remaining <= 0) xi++;
        continue;
      }

      const entryPx = Number(e.group.avgPrice);
      const exitPx = Number(x.group.avgPrice);
      const exitPnlTotal = Number(x.group.realizedPnl || 0);
      const exitTotalQty = Number(x.group.totalQty) || 1;
      const pnlPortion = (exitPnlTotal * matchQty) / exitTotalQty;

      let side: "LONG" | "SHORT";
      if (exitPx >= entryPx) {
        side = pnlPortion >= 0 ? "LONG" : "SHORT";
      } else {
        side = pnlPortion >= 0 ? "SHORT" : "LONG";
      }

      results.push({
        side,
        entryPrice: entryPx,
        exitPrice: exitPx,
        quantity: matchQty,
        pnl: pnlPortion,
        symbol: symbol,
        holdingTime: x.group.lastTradeTime.getTime() - e.group.firstTradeTime.getTime(),
        createdAt: x.group.lastTradeTime,
      });

      e.remaining -= matchQty;
      x.remaining -= matchQty;
      if (e.remaining <= 0) ei++;
      if (x.remaining <= 0) xi++;
    }
  }

  results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return results.slice(0, 100);
}

export type ActivePosition = {
  side: 'LONG' | 'SHORT';
  symbol: string;
  leverage: number;
  notional: number;
  entryPrice: number;
  exitPlan: {
    target: number;
    stop: number
  },
  unrealizePnl: number;
  createdAt: Date
}
export async function getActivePositionByPortfolio(portfolioId: number): Promise<ActivePosition[]> {
  const { getPortfolioById } = await import("@lib/db/query/portfolio");
  const { getActivePositionsWithOrders } = await import("@services/trading");

  const tradingSymbols = await getTradingSymbols();
  const pf = await getPortfolioById(portfolioId);
  if (!pf || !pf.credentials) return [];

  const raw: Array<any> = [];

  await Promise.all(tradingSymbols.map(async (s) => {
    const positions = await getActivePositionsWithOrders(pf.credentials as any, s.symbol);
    if (positions.length) {
      raw.push(...positions);
    }
  }));
 
  return raw.map((p) => {
    const amt = Number((p as any).positionAmt);
    const mark = Number((p as any).markPrice);
    const lev = Number((p as any).leverage);
    const entry = Number((p as any).entryPrice);
    const unreal = Number((p as any).unRealizedProfit || 0);
    const openOrders: Array<any> = Array.isArray((p as any).openOrders) ? (p as any).openOrders : [];
    // Derive exit plan from open orders
    const tpOrder = openOrders.find((o) => o?.reduceOnly === true && (String(o?.type || "").includes("TAKE_PROFIT_MARKET")));
    const slOrder = openOrders.find((o) => o?.reduceOnly === true && (String(o?.type || "").includes("STOP_MARKET")));

    const target = tpOrder ? Number( tpOrder.stopPrice || 0) : 0;
    const stop = slOrder ? Number(slOrder.stopPrice  || 0) : 0;

      const notional = Math.abs(amt) * mark;
    const side: 'LONG' | 'SHORT' = amt >= 0 ? 'LONG' : 'SHORT';

    return {
      side,
      symbol: (p as any).symbol,
      leverage: lev || 0,
      entryPrice: Number.isFinite(entry) ? entry : 0,
      notional: Number.isFinite(notional) ? notional : 0,
      exitPlan: { target: Number.isFinite(target) ? target : 0, stop: Number.isFinite(stop) ? stop : 0 },
      unrealizePnl: Number.isFinite(unreal) ? unreal : 0,
      createdAt: new Date((p as any).updateTime || Date.now()),
    } satisfies ActivePosition;
  });
}

type BalanceStats = {
  availableBalance: string;
  totalBalance: string;
  totalPnl:string;
}
async function getBalanceStats(portfolioId: number): Promise<BalanceStats | null> {
  const portfolio = await getPortfolioById(portfolioId);
  if (!portfolio || !portfolio.credentials) return null

  const balance = await getPortfolioBalance(portfolio.credentials as Credentials);
  const availableBalance = (balance.availableBalance);
  const activePosition = await getActivePositionByPortfolio(portfolio.id);
  const pnl= activePosition.reduce((acc, p) => acc + (Number(p.unrealizePnl) || 0), 0);
  const lockBalance = activePosition.reduce(
    (acc, p) => acc + (Number(p.notional) || 0) / (Number(p.leverage)  || 1),
    0,
  );
  return {
    availableBalance: (Number(availableBalance)).toString(),
    totalBalance: (Number(availableBalance) + Number(lockBalance) + pnl).toString(),
    totalPnl: pnl.toString(),
  };
}
export async function snapshotPortfolio() {
  const portfolios = await getPortfolios();
  const now = Date.now()
  for (const portfolio of portfolios) {
    const balanceStats = await getBalanceStats(portfolio.id);
    if (!balanceStats) continue;
    await createBalanceSnapshot({
      portfolioId: portfolio.id,
      availableBalance: balanceStats.availableBalance,
      totalBalance: balanceStats.totalBalance,
      totalPnl: balanceStats.totalPnl,
      createdAt: new Date(now)
    });
  }
}

