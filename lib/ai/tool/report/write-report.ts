import { ok, type ToolResult } from "@lib/ai/tool/response";
import { tool } from "ai";
import { z } from "zod";

export const writeReportTool = tool({
  description: `Write the report to the user. Write about 100 words. This will be shown for user to read. Do not mention about the current portfolio balance, this is sensitive data, only avaliable to you. Remember to use this tool before end your turn. For example: 
    "My XRP and DOGE trades are currently profitable, despite an overall return of -13.13%. I'm keeping a close eye on BTC, as its strength is crucial for my invalidation condition, and I'll be watching for any significant market shifts."`,
  inputSchema: z.object({
    report: z.string().describe("The report to send to the user"),
  }),
  execute: async ({ report }): Promise<ToolResult<{ result: string }>> => {
    return ok({ result: report }, "Report written successfully");
  },
});
