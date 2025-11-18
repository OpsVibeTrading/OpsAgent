import { getLastActitivy } from "@lib/db/query/activity";
import {
  getAgentById,
  getAgentByPortfolioId,
  listAgents as listAgentsDB,
  setAgentStatus,
  tryBootstrapAgentToIdle,
} from "@lib/db/query/agent";
import { getPortfolioById, getPortfolios } from "@lib/db/query/portfolio";
import type { ActivityStatus } from "@lib/db/schema";
import { NotFoundException } from "@lib/response/exception";
import { runAgentQueue } from "@/queue/job/runAgent";
import { QueueNames } from "@/queue/types";

export async function continueAgent(agentId: number, userPrompt?: string) {
  const portfolio = await getPortfolioById(agentId);
  if (!portfolio) {
    throw new NotFoundException("Portfolio not found");
  }

  const agent = await getAgentById(agentId);
  if (!agent) {
    throw new NotFoundException("Agent not found");
  }

  try {
    await runAgentQueue.add(
      QueueNames.RUN_AGENT,
      {
        agentId,
        userPrompt,
        event: {
          source: "manual",
          metadata: {
            userPrompt,
          },
        },
      },
      {
        jobId: `run-agent-${agentId}`,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  } catch {
    await setAgentStatus(agentId, "idle");
  }

  return;
}

export async function bootstrapAgent(agentId: number) {
  const portfolio = await getPortfolioById(agentId);
  if (!portfolio) {
    throw new NotFoundException("Portfolio not found");
  }

  const agent = await getAgentById(agentId);
  if (!agent) {
    throw new NotFoundException("Agent not found");
  }

  if (!(await tryBootstrapAgentToIdle(agentId))) {
    throw new Error("Agent can only be bootstrapped from not_started status");
  }

  return;
}

type ListActivitiesParams = {
  page?: number;
  pageSize?: number;
  type?: string;
  status?: ActivityStatus;
  agentName?: string;
  order?: "asc" | "desc";
};

type AgentStats = {
  portfolio: {
    id: number;
    name: string;
    logo: string;
  };
  latest: {
    msg: string;
    createdAt: Date;
  };
  detail: {
    pnl: number;
    winRate: number;
    totalTrades: number;
    avgHoldTime: number;
    sharpeRatio: number;
  };
};
export async function getAgentsStats(): Promise<AgentStats[]> {
  const portfolios = await getPortfolios();
  const agentStats: AgentStats[] = [];

  for (const portfolio of portfolios) {
    const agent = await getAgentByPortfolioId(portfolio.id);
    if (!agent) {
      continue;
    }
    const activities = await getLastActitivy(agent.id, "text");

    if (activities) {
      agentStats.push({
        portfolio: {
          id: portfolio.id,
          name: portfolio.name,
          logo: portfolio.avatar || "",
        },
        latest: {
          msg: activities.content as string,
          createdAt: activities.createdAt,
        },
        detail: {
          pnl: 0,
          winRate: 0,
          totalTrades: 0,
          avgHoldTime: 0,
          sharpeRatio: 0,
        },
      });
    }
  }
  return agentStats.sort((a, b) => b.latest.createdAt.getTime() - a.latest.createdAt.getTime());
}

export async function listAgents() {
  const agents = await listAgentsDB();
  return agents;
}

export async function createAgentSchedule(agentId: number, everySeconds: number) {
  const agent = await getAgentById(agentId);
  if (!agent) {
    throw new NotFoundException("Agent not found");
  }

  await runAgentQueue.upsertJobScheduler(
    `run-agent-scheduled-${agentId}`,
    {
      every: everySeconds * 1000,
      immediately: true,
    },
    {
      data: {
        agentId,
        event: {
          source: "match_rule",
          metadata: { reason: `scheduled: every ${everySeconds} seconds` },
        },
      },
      opts: {
        removeOnFail: true,
        removeOnComplete: true,
      },
    },
  );

  return await runAgentQueue.getJobScheduler(`run-agent-scheduled-${agentId}`);
}

export async function deleteAgentSchedule(agentId: number) {
  const agent = await getAgentById(agentId);
  if (!agent) {
    throw new NotFoundException("Agent not found");
  }

  const schedulerId = `run-agent-scheduled-${agentId}`;

  const removed = await runAgentQueue.removeJobScheduler(schedulerId);
  if (!removed) {
    console.warn(`Scheduler ${schedulerId} did not exist or could not be removed`);
  }
  return removed;
}

export async function getAgentSchedule(agentId: number) {
  const agent = await getAgentById(agentId);
  if (!agent) {
    throw new NotFoundException("Agent not found");
  }

  return await runAgentQueue.getJobScheduler(`run-agent-scheduled-${agentId}`);
}
