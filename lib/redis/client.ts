import { logger } from "@lib/logger/logger";
import * as dotenv from "dotenv";
import IORedis from "ioredis";

dotenv.config();

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null, // required for BullMQ
  connectTimeout: 10000, // optional tuning
});

// Connection events
connection.on("connect", () => logger.info("Redis Client Connected"));
connection.on("ready", () => logger.info("Redis Client Ready"));
connection.on("reconnecting", () => logger.warn("Redis Client Reconnecting"));
connection.on("error", (err) => logger.error({ err }, "Redis Client Error"));

// Export
export const redis = connection;
export default connection;
