import { eq } from "drizzle-orm";
import { db } from "../client";
import { type Symbol as DbSymbol, symbol } from "../schema";

export async function getTradingSymbols(): Promise<DbSymbol[]> {
  return db.select().from(symbol).where(eq(symbol.canTrade, true));
}
