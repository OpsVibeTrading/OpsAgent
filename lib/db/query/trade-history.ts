import type { Trade } from "@lib/aster-trading/client";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../client";
import { tradeHistory, type TradeHistory } from "../schema";

export async function getLastTradeHistory(portfolioId: number) {
	return db
		.select()
		.from(tradeHistory)
		.where(eq(tradeHistory.portfolioId, portfolioId))
		.orderBy(desc(tradeHistory.time))
		.limit(1);
}

export async function bulkInsertTradeHistory(
	portfolioId: number,
	trades: Trade[],
) {
	if (trades.length === 0) return 0;

	const rows = trades.map((t) => ({
		portfolioId,
		asterTradeId: t.id.toString(),
		orderId: t.orderId.toString(),
		symbol: t.symbol,
		side: t.side,
		price: t.price,
		qty: t.qty,
		realizedPnl: t.realizedPnl,
		marginAsset: t.marginAsset,
		quoteQty: t.quoteQty,
		commission: t.commission,
		commissionAsset: t.commissionAsset,
		time: new Date(t.time),
		positionSide: t.positionSide,
		buyer: t.buyer,
		maker: t.maker,
	}));

	const inserted = await db.insert(tradeHistory).values(rows);
	return (inserted as unknown as { rowCount?: number }).rowCount ?? rows.length;
}

export async function getLastAsterTrade(
	portfolioId: number,
	symbolText: string,
): Promise<TradeHistory | null> {
	const rows = await db
		.select()
		.from(tradeHistory)
		.where(
			and(
				eq(tradeHistory.portfolioId, portfolioId),
				eq(tradeHistory.symbol, symbolText),
			),
		)
		.orderBy(desc(tradeHistory.asterTradeId))
		.limit(1);
	if (rows.length === 0) return null;
	return rows[0] ?? null;
}

export type GroupedOrder = {
	orderId: string;
	symbol: string;
	firstTradeTime: Date;
	lastTradeTime: Date;
	side: string;
	totalQty: string;
	avgPrice: string;
	realizedPnl: string;
	trades: Array<{
		id: number;
		asterTradeId: string;
		price: string;
		qty: string;
		commission: string;
		commissionAsset: string;
		time: Date;
		maker: boolean;
		buyer: boolean;
		positionSide: string;
	}>;
};

export async function getGroupedOrdersByPortfolio(
	portfolioId: number,
	symbol?: string,
): Promise<GroupedOrder[]> {
	const rows = await db
		.select()
		.from(tradeHistory)
		.where(
			symbol
				? and(
						eq(tradeHistory.portfolioId, portfolioId),
						eq(tradeHistory.symbol, symbol),
					)
				: eq(tradeHistory.portfolioId, portfolioId),
		)
		.orderBy(desc(tradeHistory.time))
		.limit(5000);

	// 2) Group trades by orderId (fallback to asterTradeId if orderId null)
	const byOrder: Map<string, GroupedOrder> = new Map();
	for (const t of rows) {
		const key = (t.orderId ?? t.asterTradeId) as string;
		const existing = byOrder.get(key);
		if (!existing) {
			byOrder.set(key, {
				orderId: key,
				symbol: t.symbol,
				firstTradeTime: t.time,
				lastTradeTime: t.time,
				side: t.side === "BUY" ? "SHORT" : "LONG",
				totalQty: String(t.qty),
				avgPrice: String(t.price),
				realizedPnl: String(t.realizedPnl),
				trades: [
					{
						id: t.id,
						asterTradeId: t.asterTradeId,
						price: String(t.price),
						qty: String(t.qty),
						commission: String(t.commission),
						commissionAsset: t.commissionAsset,
						time: t.time,
						maker: t.maker,
						buyer: t.buyer,
						positionSide: t.positionSide,
					},
				],
			});
		} else {
			// update aggregate
			existing.lastTradeTime =
				t.time > existing.lastTradeTime ? t.time : existing.lastTradeTime;
			existing.firstTradeTime =
				t.time < existing.firstTradeTime ? t.time : existing.firstTradeTime;
			existing.trades.push({
				id: t.id,
				asterTradeId: t.asterTradeId,
				price: String(t.price),
				qty: String(t.qty),
				commission: String(t.commission),
				commissionAsset: t.commissionAsset,
				time: t.time,
				maker: t.maker,
				buyer: t.buyer,
				positionSide: t.positionSide,
			});
			// recompute total qty and avg price naive (qty as number)
			const totalQty = existing.trades.reduce(
				(sum, tr) => sum + Number(tr.qty),
				0,
			);
			const totalPxQty = existing.trades.reduce(
				(sum, tr) => sum + Number(tr.qty) * Number(tr.price),
				0,
			);
			existing.totalQty = String(totalQty);
			existing.avgPrice =
				totalQty > 0 ? String(totalPxQty / totalQty) : existing.avgPrice;
			// sum pnl
			const totalPnl =
				(Number(existing.realizedPnl) || 0) + Number(t.realizedPnl);
			existing.realizedPnl = String(totalPnl);
		}
	}

	// 3) Sort groups by lastTradeTime desc and take first 100
	const grouped = Array.from(byOrder.values())
		.sort((a, b) => b.lastTradeTime.getTime() - a.lastTradeTime.getTime())
	return grouped;
}
