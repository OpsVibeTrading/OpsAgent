import z from "zod";

export const getAgentParamsSchema = z.object({
  agentId: z.coerce.number().int().positive(),
});
export type GetAgentParams = z.infer<typeof getAgentParamsSchema>;

export const continueAgentBodySchema = z.object({
  userPrompt: z.string().default(""),
});
export type ContinueAgentBody = z.infer<typeof continueAgentBodySchema>;

export const listActivitiesParamsSchema = z.object({
  agentId: z.coerce.number().int().positive(),
});
export type ListActivitiesParams = z.infer<typeof listActivitiesParamsSchema>;

export const listActivitiesQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(10),
  type: z.string().optional(),
  status: z.enum(["pending", "running", "completed", "failed"]).optional(),
  agentName: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});
export type ListActivitiesQuery = z.infer<typeof listActivitiesQuerySchema>;

export const createAgentScheduleBodySchema = z.object({
  everySeconds: z.coerce.number().int().positive().describe("Every seconds to run the agent"),
});
export type CreateAgentScheduleBody = z.infer<typeof createAgentScheduleBodySchema>;

export const deleteAgentScheduleBodySchema = z.object({
  scheduleId: z.coerce.number().int().positive(),
});
export type DeleteAgentScheduleBody = z.infer<typeof deleteAgentScheduleBodySchema>;
