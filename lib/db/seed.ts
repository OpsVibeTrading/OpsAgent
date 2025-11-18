import { config } from "dotenv";

// Load env from be/.env, then fall back to repo root .env
config({ path: ".env" });
if (!process.env.DATABASE_URL) {
  config({ path: "../.env" });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }

  // Import DB-dependent modules after env is loaded
  const { createPortfolio } = await import("./query/portfolio");
  const { createAgent } = await import("./query/agent");
  const { createBalanceSnapshot } = await import("./query/balance-snapshot");

  // 1) Create a mock portfolio
  const portfolio = await createPortfolio({
    name: "gpt-4.1-mini",
    description: "Seeded demo portfolio for development",
    avatar: "gpt-4.1-mini.png",
  });

  if (!portfolio) {
    throw new Error("Failed to create portfolio");
  }
  // Note: instruction/configuration can be expanded later; passing null by default
  await createAgent({ portfolioId: portfolio.id, instruction: "", model: "gpt" });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("❌ Seed failed", err);
  process.exit(1);
});
