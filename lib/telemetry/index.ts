import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseExporter } from "langfuse-vercel";

const langfuseExporter = new LangfuseExporter({
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  baseUrl: process.env.LANGFUSE_HOST,
});

const sdk = new NodeSDK({
  traceExporter: langfuseExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

let started = false;
export function startTelemetry(): void {
  if (started) return;
  try {
    void (sdk as unknown as { start: () => unknown }).start();
  } catch {}
  started = true;
}

startTelemetry();

export default sdk;
