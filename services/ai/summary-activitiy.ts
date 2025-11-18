import { prompt, systemPrompt } from "@lib/ai/prompt/summary-activity-prompt";
import { openrouter } from "@lib/ai/providers";
import type { Activity } from "@lib/db/schema";
import { startTelemetry } from "@lib/telemetry";
import { generateText } from "ai";

startTelemetry();

export async function summarizeActivities(activities: Activity[]): Promise<string> {
  if (activities.length === 0) {
    return "";
  }

  const { text } = await generateText({
    experimental_telemetry: { isEnabled: true },
    model: openrouter("openai/gpt-5-mini", {
      reasoning: {
        enabled: true,
        effort: "low",
      },
    }),
    system: systemPrompt(),
    prompt: prompt({ activities }),
  });

  return text;
}
