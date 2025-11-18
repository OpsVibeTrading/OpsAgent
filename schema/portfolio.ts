import z from "zod";

export const createPortfolioSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  avatar: z.string().optional().nullable(),
  credentials: z
    .object({
      apiKey: z.string(),
      apiSecret: z.string(),
      password: z.string().optional(),
      baseUrl: z.string(),
    })
    .optional()
    .nullable(),
  agentData: z.object({
    model: z.string(),
    instruction: z.string(),
  }),
});

export const importApiKeySchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  apiSecret: z.string().optional(),
  password: z.string().optional(),
  baseUrl: z.string(),
});

export const portfolioIdParamSchema = z.object({
  portfolioId: z.coerce.number().int().positive("Invalid portfolio ID"),
});

export const portfolioIdsQuerySchema = z.object({
  portfolioIds: z.string(),
});
export type ImportApiKeyInput = z.infer<typeof importApiKeySchema>;
export type PortfolioIdParam = z.infer<typeof portfolioIdParamSchema>;
export type PortfolioIdsQuery = z.infer<typeof portfolioIdsQuerySchema>;
