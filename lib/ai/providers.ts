import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { customProvider } from "ai";

export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const llmProvider = customProvider({
  languageModels: {
    gpt: openrouter("openai/gpt-5-mini", {
      reasoning: {
        enabled: true,
        effort: "high",
      },
    }),
    gemini: openrouter("google/gemini-2.5-flash", {
      reasoning: {
        enabled: true,
        effort: "high",
      },
    }),
    grok: openrouter("x-ai/grok-4-fast", {
      reasoning: {
        enabled: true,
        effort: "high",
      },
    }),
    claude: openrouter("anthropic/claude-haiku-4.5", {
      reasoning: {
        enabled: true,
        effort: "high",
      },
    }),
    deepseek: openrouter("deepseek/deepseek-v3.1-terminus:exacto", {
      reasoning: {
        enabled: true,
        effort: "high",
      },
    }),
    qwen: openrouter("qwen/qwen3-next-80b-a3b-thinking", {
      reasoning: {
        enabled: true,
        effort: "high",
      },
    }),
  },
});
