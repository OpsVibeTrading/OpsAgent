import { logger } from "@lib/logger/logger";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

config({
  path: ".env",
});

const runMigrate = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }

  const connection = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(connection);

  logger.info("⏳ Running migrations...");

  const start = Date.now();
  await migrate(db, { migrationsFolder: "./lib/db/migrations" });
  const end = Date.now();

  logger.info({ duration: end - start }, "✅ Migrations completed");
  process.exit(0);
};

runMigrate().catch((err) => {
  logger.error({ err }, "❌ Migration failed");
  process.exit(1);
});
