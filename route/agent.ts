import { getActivitiesByFilter } from "@lib/db/query/activity";
import { getAgentById } from "@lib/db/query/agent";
import { getPortfolios } from "@lib/db/query/portfolio";
import { NotFoundException } from "@lib/response/exception";
import { sendSuccess } from "@lib/response/response";
import {
  continueAgentBodySchema,
  createAgentScheduleBodySchema,
  getAgentParamsSchema,
  listActivitiesParamsSchema,
  listActivitiesQuerySchema,
} from "@schema/agent";
import {
  bootstrapAgent,
  continueAgent,
  createAgentSchedule,
  deleteAgentSchedule,
  getAgentSchedule,
  getAgentsStats,
  listAgents,
} from "@services/agent";
import express from "express";
import { validateRequest } from "@/lib/request/validate";
import { adminMiddleware } from "@/middleware";
import { redis } from "@lib/redis/client";

const router = express.Router();

const handleGetAgent = async (req: express.Request, res: express.Response) => {
  const { params } = validateRequest({ params: getAgentParamsSchema }, req);
  const agent = await getAgentById(params.agentId);
  return sendSuccess(res, "Agent fetched successfully", agent);
};

const handleContinueAgent = async (req: express.Request, res: express.Response) => {
  const { params, body } = validateRequest(
    { params: getAgentParamsSchema, body: continueAgentBodySchema },
    req,
  );

  await continueAgent(params.agentId, body.userPrompt);
  return sendSuccess(res, "Agent continued successfully");
};

const handleBootstrapAgent = async (req: express.Request, res: express.Response) => {
  const { params } = validateRequest({ params: getAgentParamsSchema }, req);

  await bootstrapAgent(params.agentId);
  return sendSuccess(res, "Agent bootstrapped successfully");
};

const handleAgentStats = async (_: express.Request, res: express.Response) => {
  const cacheKey = `agent:stats`;
  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    return sendSuccess(res, "Activities fetched successfully", JSON.parse(cachedData));
  }
  const result = await getAgentsStats();
  if(result.length){
    await redis.set(cacheKey, JSON.stringify(result), "EX", 10);
  }
  return sendSuccess(res, "Activities fetched successfully", result);
};

const handleListAgents = async (_: express.Request, res: express.Response) => {
  const agents = await listAgents();
  return sendSuccess(res, "Agents fetched successfully", agents);
};

const handleCreateAgentSchedule = async (req: express.Request, res: express.Response) => {
  const { params, body } = validateRequest(
    { params: getAgentParamsSchema, body: createAgentScheduleBodySchema },
    req,
  );

  const schedule = await createAgentSchedule(params.agentId, body.everySeconds);
  return sendSuccess(res, "Agent schedule created successfully", schedule);
};

const handleDeleteAgentSchedule = async (req: express.Request, res: express.Response) => {
  const { params } = validateRequest({ params: getAgentParamsSchema }, req);

  await deleteAgentSchedule(params.agentId);
  return sendSuccess(res, "Agent schedule deleted successfully");
};

const handleGetAgentSchedule = async (req: express.Request, res: express.Response) => {
  const { params } = validateRequest({ params: getAgentParamsSchema }, req);

  const schedule = await getAgentSchedule(params.agentId);
  return sendSuccess(res, "Agent schedule fetched successfully", schedule);
};

const handleGetAgentActivities = async (req: express.Request, res: express.Response) => {
  const { params, query } = validateRequest(
    { params: listActivitiesParamsSchema, query: listActivitiesQuerySchema },
    req,
  );

  const agent = await getAgentById(params.agentId);
  if (!agent) {
    throw new NotFoundException("Agent not found");
  }

  const result = await getActivitiesByFilter({
    agentId: params.agentId,
    type: query.type,
    status: query.status,
    agentName: query.agentName,
    order: query.order,
    pagination: { page: query.page, pageSize: query.pageSize },
  });

  return sendSuccess(res, "Activities fetched successfully", result);
};

function extractReport(content: unknown): string | null {
  if (content != null && typeof content === "object" && "input" in content) {
    const input = (content as { input?: unknown }).input;
    if (input != null && typeof input === "object" && "report" in input) {
      const report = (input as { report?: unknown }).report;
      return typeof report === "string" ? report : null;
    }
  }
  return null;
}

const handleGetAgentReport = async (req: express.Request, res: express.Response) => {
  const { params, query } = validateRequest(
    { params: listActivitiesParamsSchema, query: listActivitiesQuerySchema },
    req,
  );

  const agent = await getAgentById(params.agentId);
  if (!agent) {
    throw new NotFoundException("Agent not found");
  }

  const result = await getActivitiesByFilter({
    agentId: params.agentId,
    type: "tool_write_report",
    order: query.order,
    pagination: { page: query.page, pageSize: query.pageSize },
  });

  const mapped = {
    ...result,
    items: result.items.map((item) => ({
      ...item,
      content: extractReport(item.content),
      metadata: undefined,
      status: undefined,
      agentName: undefined,
    })),
  };

  return sendSuccess(res, "Reports fetched successfully", mapped);
};

const handleGetAllActivities = async (_req: express.Request, res: express.Response) => {
  const cacheKey = `agent:activities`;
  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    return sendSuccess(res, "Activities fetched successfully", JSON.parse(cachedData));
  }
  const portfolios = await getPortfolios();
  const portfolioById = new Map(portfolios.map((p) => [p.id, p]));
  const result = await getActivitiesByFilter({
    order: "desc",
    type: "tool_write_report",
    pagination: { page: 1, pageSize: 30 },
  });
  result.items = result.items
    .filter((r) => {
      if (r.agentId == null) return true;
      const p = portfolioById.get(r.agentId);
      return !p || p.isVisible === true;
    })
    .map((r) => {
      if (r.agentId == null) return r;
      const p = portfolioById.get(r.agentId);
      return p ? { ...r, name: p.name } : r;
    });
  if(result.items.length){
    await redis.set(cacheKey, JSON.stringify(result), "EX", 10);
  }
  return sendSuccess(res, "Activities fetched successfully", result);
};

// Public routes
router.get("/", handleListAgents);
router.get("/stats", handleAgentStats);
router.get("/activities", handleGetAllActivities);
router.get("/:agentId", handleGetAgent);
router.get("/:agentId/activities", handleGetAgentActivities);
router.get("/:agentId/reports", handleGetAgentReport);
// Admin routes
router.post("/:agentId/bootstrap", adminMiddleware, handleBootstrapAgent);
router.post("/:agentId/schedule", adminMiddleware, handleCreateAgentSchedule);
router.delete("/:agentId/schedule", adminMiddleware, handleDeleteAgentSchedule);
router.get("/:agentId/schedule", adminMiddleware, handleGetAgentSchedule);
router.post("/:agentId/continue", adminMiddleware, handleContinueAgent);
export default router;
