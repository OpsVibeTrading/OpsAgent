import { fail, getToolTimeoutMs, ok, type ToolResult, withTimeout } from "@lib/ai/tool/response";
import { tool } from "ai";
import z from "zod";

export const googleSearch = () =>
  tool({
    description: "Google search using Serper API.",
    inputSchema: z.object({
      query: z.string(),
    }),
    execute: async ({ query }: { query: string }): Promise<ToolResult<any[]>> => {
      try {
        if (!process.env.SERPER_API_KEY) {
          throw new Error("SERPER_API_KEY is not set in environment variables");
        }
        const searchQuery = query;
        const resp = await withTimeout(
          fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: {
              "X-API-KEY": process.env.SERPER_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              q: searchQuery,
              location: "Austin, Texas, United States",
              gl: "us",
              hl: "en",
            }),
          }),
          getToolTimeoutMs(),
        );
        const respData: any = await resp.json();
        const items =
          ((respData?.statusCode === 500 ? [] : respData?.organic) || [])
            .slice(0, 3)
            ?.map(({ snippet, title, link }: { snippet: string; title: string; link: string }) => ({
              snippet,
              title,
              link,
            })) || [];
        return ok(items, "Fetched search results");
      } catch (error) {
        return fail("Error searching Google", error);
      }
    },
  });
