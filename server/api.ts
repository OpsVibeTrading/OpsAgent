import { logger } from "@lib/logger/logger";
import dotenv from "dotenv";
import express from "express";
import { handleError, setupMiddleware } from "@/middleware";
import agentRouter from "@/route/agent";
import marketRouter from "@/route/market";
import portfolioRouter from "@/route/portfolio";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

setupMiddleware(app);

app.get("/", (_req: express.Request, res: express.Response) => {
  res.json({
    message: "Welcome to the API!",
    version: "1.0.0",
    status: "running",
  });
});

app.get("/health", (_req: express.Request, res: express.Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/v1/agent", agentRouter);
app.use("/api/v1/portfolio", portfolioRouter);
app.use("/api/v1/market", marketRouter);

app.use("/*splat", (req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

app.use(handleError);

app.listen(PORT, () => {
  logger.info({ port: PORT }, `🚀 Server is running on http://localhost:${PORT}`);
});

export default app;
