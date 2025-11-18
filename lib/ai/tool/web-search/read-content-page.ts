import { fail, getToolTimeoutMs, ok, type ToolResult, withTimeout } from "@lib/ai/tool/response";
import { tool } from "ai";
import axios from "axios";
import z from "zod";

export const readPageContent = () =>
  tool({
    description:
      "Read and return the first 20,000 characters of a web page's content using Serper's scrape API. This tool is used to read the content of a web page and return the first 20,000 characters of the content.",
    inputSchema: z.object({
      url: z.string(),
    }),
    execute: async ({ url }): Promise<ToolResult<{ text: string }>> => {
      try {
        if (!process.env.SERPER_API_KEY) {
          throw new Error("SERPER_API_KEY is not set in environment variables");
        }
        const res = await withTimeout(
          axios.post(
            "https://scrape.serper.dev",
            { url },
            {
              headers: {
                "X-API-KEY": process.env.SERPER_API_KEY,
                "Content-Type": "application/json",
              },
            },
          ),
          getToolTimeoutMs(),
        );
        const text = res?.data?.text?.slice(0, 20000) || "";
        return ok({ text }, "Fetched page content");
      } catch (error) {
        return fail("Failed to fetch page content", error);
      }
    },
  });
