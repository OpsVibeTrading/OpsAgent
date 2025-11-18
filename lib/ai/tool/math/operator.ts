import { fail, getToolTimeoutMs, ok, type ToolResult, withTimeout } from "@lib/ai/tool/response";
import { to8PrecisionDown } from "@lib/util";
import { tool } from "ai";
import { z } from "zod";

export const calculatorTool = tool({
  description:
    "A simple calculator for basic arithmetic operations to calculate amount to buy or sell following the strategic, the result will be rounded to 8 decimal places",
  inputSchema: z.object({
    operation: z.enum(["add", "subtract", "multiply", "divide"]),
    a: z.number(),
    b: z.number(),
  }),
  execute: async ({ operation, a, b }): Promise<ToolResult<{ result: number }>> => {
    try {
      const result = await withTimeout(
        Promise.resolve().then(() => {
          switch (operation) {
            case "add": {
              const sum = a + b;
              return to8PrecisionDown(sum);
            }
            case "subtract": {
              const diff = a - b;
              return to8PrecisionDown(diff);
            }
            case "multiply": {
              const product = a * b;
              return to8PrecisionDown(product);
            }
            case "divide": {
              if (b === 0) throw new Error("Division by zero");
              const quotient = a / b;
              return to8PrecisionDown(quotient);
            }
            default: {
              throw new Error("Invalid operation");
            }
          }
        }),
        getToolTimeoutMs(),
      );
      return ok({ result }, "Calculated successfully");
    } catch (error) {
      return fail("Calculation failed", error);
    }
  },
});
