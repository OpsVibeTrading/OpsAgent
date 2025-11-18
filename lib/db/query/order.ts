import { and, desc, eq } from "drizzle-orm";
import { db } from "../client";
import { orderHistory, type OrderHistory } from "../schema";

export async function getLastAsterOrder(portfolioId: number, symbolText: string): Promise<OrderHistory | null> {
	const rows = await db
		.select()
		.from(orderHistory)
		.where(
			and(
				eq(orderHistory.portfolioId, portfolioId),
				eq(orderHistory.symbol, symbolText),
			),
		)
		.orderBy(desc(orderHistory.time))
		.limit(1);
	if (rows.length === 0) return null;
	return rows[0] ?? null;
}

export async function bulkInsertOrderHistory(
	orders: Omit<OrderHistory, 'id'>[],
) {
	if (orders.length === 0) return 0;
	const inserted = await db.insert(orderHistory).values(orders);
	return (inserted as unknown as { rowCount?: number }).rowCount ?? orders.length;
}