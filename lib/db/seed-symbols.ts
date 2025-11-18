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
	const { db } = await import("./client");
	const { symbol } = await import("./schema");

	const seedSymbols: Array<{
		symbol: string;
		name: string;
		logo: string;
		canTrade: boolean;
	}> = [

		{
			symbol: "ASTERUSDT",
			name: "Aster",
			logo: "https://static.astherus.finance/image/admin_mgs_image_upload/20251010/a8f8478b-2326-4795-81fe-5ab6c897bd1c.png",
			canTrade: true,
		},
		{
			symbol: "BTCUSDT",
			name: "Bitcoin",
			logo: "https://static.astherus.finance/image/admin_mgs_image_upload/20251010/1d7eca3f-2cc2-4d20-b39e-e93e104efc38.png",
			canTrade: true,
		},
		{
			symbol: "ETHUSDT",
			name: "Ethereum",
			logo: "https://static.astherus.finance/image/admin_mgs_image_upload/20251010/29537d4d-7a9e-4074-baed-60ba2b9a40ce.png",
			canTrade: true,
		},
		{
			symbol: "BNBUSDT",
			name: "BNB",
			logo: "https://static.astherus.finance/image/admin_mgs_image_upload/20251010/f706a383-bae0-473e-9890-b90a938fcadc.png",
			canTrade: true,
		},
		{
			symbol: "SOLUSDT",
			name: "Solana",
			logo: "https://static.astherus.finance/image/admin_mgs_image_upload/20251010/11b9ec37-f382-479e-957b-f3f5333eba2c.png",
			canTrade: true,
		},
		{
			symbol: "XRPUSDT",
			name: "XRP",
			logo: "https://static.astherus.finance/image/admin_mgs_image_upload/20251010/68ba997a-6cfc-4534-a162-adc75f68fa35.png",
			canTrade: true,
		},
		{
			symbol: "HYPEUSDT",
			name: "Hyperliquid",
			logo: "https://static.astherus.finance/image/admin_mgs_image_upload/20251010/2fc24ddb-5039-4ca4-8792-d806ecb6f7cc.png",
			canTrade: true,
		},
		{
			symbol: "1000SHIBUSDT",
			name: "Shiba Inu",
			logo: "https://static.astherus.finance/image/admin_mgs_image_upload/20251010/660eea70-bb75-4c87-9cd1-a7e5f169eb4c.png",
			canTrade: true,
		},
		{
			symbol: "TRXUSDT",
			name: "TRON",
			logo: "https://static.astherus.finance/image/admin_mgs_image_upload/20251010/b08ee031-7803-4450-a191-3c79f663946d.png",
			canTrade: true,
		},
		{
			symbol: "DOGE",
			name: "DOGEUSDT",
			logo: "https://static.astherus.finance/image/admin_mgs_image_upload/20251010/3569c143-dd69-4535-a44c-eff941f2c31d.png",
			canTrade: true,
		},
		{
			symbol: "1000PEPEUSDT",
			name: "1000PEPEUSDT",
			logo: "https://static.astherus.finance/image/admin_mgs_image_upload/20251010/025f02d8-bd29-4ae9-b50d-6cc3517052dd.png",
			canTrade: true,
		},
		{
			symbol: "BUSDT",
			name: "BUSDT",
			logo: "https://static.astherus.finance/image/admin_mgs_image_upload/20251010/ce58993c-4d13-4101-8cb1-95abc7024db1.png",
			canTrade: true,
		},
		{
			symbol: "TURTLEUSDT",
			name: "Turtle",
			logo: "https://static.astherus.finance/image/admin_mgs_image_upload/20251022/8ffe7df1-a15d-4f0f-a017-2bd9ccb7e8fc.png",
			canTrade: true,
		},
		{
			symbol: "APRUSDT",
			name: "Arbitrum",
			logo: "https://static.astherus.finance/image/admin_mgs_image_upload/20251023/8bf8b2f4-8230-4976-be03-bd89741d6da0.png",
			canTrade: true,
		},
		{
			symbol: "LABUSDT",
			name: "Cosmos",
			logo: "https://static.astherus.finance/image/admin_mgs_image_upload/20251017/d7f673dc-715d-4d81-8906-0c180f471b6e.png",
			canTrade: true,
		}
		
	];

	// Read existing symbols to avoid duplicates (no unique constraint defined in schema)
	const existing = await db.select({ s: symbol.symbol }).from(symbol);
	const existingSet = new Set(existing.map((r) => r.s));

	const toInsert = seedSymbols.filter((s) => !existingSet.has(s.symbol));

	if (toInsert.length === 0) {
		// eslint-disable-next-line no-console
		console.log("✅ Symbols already seeded. No new rows to insert.");
		return;
	}

	await db.insert(symbol).values(toInsert);

	// eslint-disable-next-line no-console
	console.log(`✅ Inserted ${toInsert.length} symbols`);
}

main().catch((err) => {
	// eslint-disable-next-line no-console
	console.error("❌ Seed symbols failed", err);
	process.exit(1);
});
