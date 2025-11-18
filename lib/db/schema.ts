/* eslint-disable @typescript-eslint/no-explicit-any */

import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  integer,
  json,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const portfolio = pgTable("portfolio", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  avatar: text("avatar"),
  pnl: text("pnl").notNull().default("0"),
  credentials: jsonb("credentials"),
  balanceFloor: integer("balanceFloor"),
  maxLeverage: integer("maxLeverage"),
  isVisible: boolean("isVisible").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  deletedAt: timestamp("deletedAt"),
});
export type Portfolio = InferSelectModel<typeof portfolio>;
export type Credentials = {
  apiKey: string;
  apiSecret: string;
  password?: string;
  baseUrl: string;
};

export const balanceSnapshot = pgTable("balance_snapshot", {
  id: serial("id").primaryKey(),
  portfolioId: integer("portfolioId")
    .references(() => portfolio.id)
    .notNull(),
  availableBalance: text("availableBalance").notNull(),
  totalBalance: text("totalBalance").notNull(),
  totalPnl: text("totalPnl").notNull(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type BalanceSnapshot = InferSelectModel<typeof balanceSnapshot>;

export const agent = pgTable("agent", {
  id: serial("id").primaryKey(),
  configuration: json("configuration"),
  instruction: text("instruction").notNull(),
  model: text("model"),
  color: text("color"),
  portfolioId: integer("portfolioId")
    .references(() => portfolio.id)
    .notNull(),
  status: text("status", {
    enum: ["not_started", "running", "idle", "paused"],
  }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Agent = InferSelectModel<typeof agent>;

export type Alert = {
  chanel: "telegram" | "email";
  chatId: string;
  isEnable: boolean;
};
export type Configuration = {
  alerts: Alert[];
  allowTrade: boolean;
};

export type TradeStatus = "not_started" | "running" | "idle" | "paused";

export const activity = pgTable("activity", {
  id: serial("id").primaryKey(),
  agentId: integer("agentId").references(() => agent.id),
  type: text("type").notNull(),
  content: json("content"),
  metadata: json("metadata"),
  status: text("status", {
    enum: ["pending", "running", "completed", "failed"],
  }).notNull(),
  agentName: text("agentName"),
  executionId: integer("executionId").references(() => execution.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Activity = InferSelectModel<typeof activity>;
export type ActivityStatus = "pending" | "running" | "completed" | "failed";

export const execution = pgTable("execution", {
  id: serial("id").primaryKey(),
  trigger: json("trigger"),
  status: text("status", {
    enum: ["new", "running", "completed", "failed"],
  }).notNull(),
  agentId: integer("agentId").references(() => agent.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Execution = InferSelectModel<typeof execution>;
export type ExecutionStatus = "new" | "running" | "completed" | "failed";
export type ExecutionTrigger = {
  source: "manual" | "match_rule";
  metadata: Record<string, any>;
};

export const agentMemory = pgTable("agent_memory", {
  id: serial("id").primaryKey(),
  agentId: integer("agentId")
    .references(() => agent.id)
    .notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type AgentMemory = InferSelectModel<typeof agentMemory>;

export const activitySummary = pgTable("activity_summary", {
  id: serial("id").primaryKey(),
  agentId: integer("agentId").references(() => agent.id),
  toActivityId: integer("toActivityId").references(() => activity.id),
  summary: text("summary").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type ActivitySummary = InferSelectModel<typeof activitySummary>;

export const symbol = pgTable("symbol", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  logo: text("logo").notNull(),
  canTrade: boolean("canTrade").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Symbol = InferSelectModel<typeof symbol>;

export const tradeHistory = pgTable("trade_history", {
  id: serial("id").primaryKey(),
  portfolioId: integer("portfolioId")
    .references(() => portfolio.id)
    .notNull(),
  asterTradeId: text("asterTradeId").notNull(),
  orderId: text("orderId"),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(),
  price: numeric("price").notNull(),
  qty: numeric("qty").notNull(),
  realizedPnl: numeric("realizedPnl").notNull(),
  marginAsset: text("marginAsset").notNull(),
  quoteQty: numeric("quoteQty").notNull(),
  commission: numeric("commission").notNull(),
  commissionAsset: text("commissionAsset").notNull(),
  time: timestamp("time").notNull(),
  positionSide: text("positionSide").notNull(),
  buyer: boolean("buyer").notNull(),
  maker: boolean("maker").notNull(),
});
export type TradeHistory = InferSelectModel<typeof tradeHistory>;

export const orderHistory = pgTable("order_history", {
  id: serial("id").primaryKey(),
  portfolioId: integer("portfolioId")
    .references(() => portfolio.id)
    .notNull(),
  orderId: text("orderId").notNull(),
  symbol: text("symbol").notNull(),
  status: text("status", { enum: ["FILLED", "CANCELED", "NEW", "EXPIRED"] }).notNull(),
  clientOrderId: text("clientOrderId").notNull(),
  avgPrice: numeric("avgPrice").notNull(),
  side: text("side", { enum: ["BUY", "SELL"] }).notNull(),
  origQty: numeric("origQty").notNull(),
  executedQty: numeric("executedQty").notNull(),
  cumQuote: numeric("cumQuote").notNull(),
  timeInForce: text("timeInForce").notNull(),
  type: text("type", {
    enum: ["MARKET", "STOP_MARKET", "TAKE_PROFIT_MARKET", "STOP_LIMIT"],
  }).notNull(),
  reduceOnly: boolean("reduceOnly").notNull(),
  closePosition: boolean("closePosition").notNull(),
  stopPrice: numeric("stopPrice").notNull(),
  workingType: text("workingType").notNull(),
  priceProtect: boolean("priceProtect").notNull(),
  origType: text("origType").notNull(),
  time: timestamp("time").notNull(),
  updateTime: timestamp("updateTime").notNull(),
  newChainData: json("newChainData"),
});
export type OrderHistory = InferSelectModel<typeof orderHistory>;
