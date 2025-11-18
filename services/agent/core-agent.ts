import { systemPrompt } from "@lib/ai/prompt/agent-prompt";
import { llmProvider } from "@lib/ai/providers";
import {
  closePositionTool,
  get24hTickerTool,
  quickLongTool,
  quickShortTool,
} from "@lib/ai/tool/aster";
import { getActivePositionsTool } from "@lib/ai/tool/aster/get-active-positions";
import { getPortfolioBalanceTool } from "@lib/ai/tool/aster/get-portfolio-balance";
import {
  calculateAwesomeOscillator,
  calculateIchimokuCloud,
  calculateRelativeStrengthIndex,
} from "@lib/ai/tool/indicator/momentum-indicator";
import {
  calculateExponentialMovingAverage,
  calculateMovingAverageConvergenceDivergence,
  calculateSimpleMovingAverage,
} from "@lib/ai/tool/indicator/trend-indicator";
import { calculatorTool } from "@lib/ai/tool/math/operator";
import { writeReportTool } from "@lib/ai/tool/report/write-report";
import type { ToolResult } from "@lib/ai/tool/response";
import type { Balance, OpenOrder, Position } from "@lib/aster-trading/client";
import { insertActivity, updateActivity } from "@lib/db/query/activity";
import type { Agent, Credentials, Symbol as DbSymbol, Execution, Portfolio } from "@lib/db/schema";
import { logger } from "@lib/logger/logger";
import { startTelemetry } from "@lib/telemetry";
import { removeUndefined } from "@lib/util";
import { type ModelMessage, stepCountIs, streamText } from "ai";

startTelemetry();

export enum AgentName {
  MAIN_AGENT = "main_agent",
  MARKET_AGENT = "market_agent",
  MONITOR_AGENT = "montior_agent",
  DECISION_AGENT = "decision_agent",
  EXECUTION_AGENT = "execution_agent",
}

function getAgentNameByTool(toolName: string): AgentName {
  switch (toolName) {
    case "get_24h_ticker":
      return AgentName.MARKET_AGENT;
    case "get_usdt_balance":
    case "get_balance":
      return AgentName.DECISION_AGENT;
    case "quick_long":
    case "quick_short":
    case "close_position":
      return AgentName.EXECUTION_AGENT;
    case "add_rule":
      return AgentName.MONITOR_AGENT;
    default:
      if (toolName.startsWith("calculate")) {
        return AgentName.DECISION_AGENT;
      }
      return AgentName.MAIN_AGENT;
  }
}

export async function runMainAgentStream(
  portfolio: Portfolio,
  agent: Agent,
  activitiesSummary: string | null,
  execution: Execution,
  portfolioBalance: Balance,
  positionsWithOrders: Array<Position & { openOrders: OpenOrder[] }>,
  tradableSymbols: DbSymbol[],
) {
  if (!agent.model) {
    throw new Error("Agent model is required");
  }
  const model = llmProvider.languageModel(agent.model);
  if (!model) {
    throw new Error(`Model ${agent.model} not found`);
  }
  const agentName = AgentName.MAIN_AGENT;
  const agentId: number = agent.id;
  const triggerMetadata = {
    messageHistory: false,
  };
  const messages: ModelMessage[] = [
    {
      role: "user",
      content: `
      <SYSTEM_MESSAGE>
        You were triggered by the system. 
        Current time is: ${new Date().toISOString()}
        Your previous work  was:
        <PREVIOUS_ACTIVITY_SUMMARY>
        ${activitiesSummary}
        </PREVIOUS_ACTIVITY_SUMMARY>

        <CURRENT_CONTEXT>
          <PORTFOLIO_BALANCE>
          ${JSON.stringify(portfolioBalance.availableBalance)} USDT
          </PORTFOLIO_BALANCE>

          <ACTIVE_POSITIONS_WITH_ORDERS>
          ${JSON.stringify(positionsWithOrders, null)}
          </ACTIVE_POSITIONS_WITH_ORDERS>
          <TRADABLE_SYMBOLS>
          ${JSON.stringify(tradableSymbols, null)}
          </TRADABLE_SYMBOLS>
        </CURRENT_CONTEXT>
      </SYSTEM_MESSAGE>`,
    },
  ];

  const result = streamText({
    experimental_telemetry: { isEnabled: true },
    model: model,
    system: systemPrompt({ agent, portfolio }),
    messages: removeUndefined(messages),
    stopWhen: stepCountIs(50),
    tools: {
      // Math
      calculator: calculatorTool,

      // Portfolio
      get_active_positions: getActivePositionsTool(portfolio),
      get_portfolio_balance: getPortfolioBalanceTool(portfolio),

      // Indicator
      calculateAwesomeOscillator: calculateAwesomeOscillator(portfolio.credentials as Credentials),
      calculateIchimokuCloud: calculateIchimokuCloud(portfolio.credentials as Credentials),
      calculateRelativeStrengthIndex: calculateRelativeStrengthIndex(
        portfolio.credentials as Credentials,
      ),
      calculateExponentialMovingAverage: calculateExponentialMovingAverage(
        portfolio.credentials as Credentials,
      ),
      calculateMovingAverageConvergenceDivergence: calculateMovingAverageConvergenceDivergence(
        portfolio.credentials as Credentials,
      ),
      calculateSimpleMovingAverage: calculateSimpleMovingAverage(
        portfolio.credentials as Credentials,
      ),

      // Futures trading
      quick_long: quickLongTool(portfolio),
      quick_short: quickShortTool(portfolio),
      close_position: closePositionTool(portfolio),
      get_24h_ticker: get24hTickerTool,
      write_report: writeReportTool,
    },
    toolChoice: "auto",
  });

  // Track state for activities
  let previousTextContent = "";
  let currentTextContent = "";
  let currentTextActivityId: number | null = null;
  let previousReasoningContent = "";
  let currentReasoningContent = "";
  let currentReasoningActivityId: number | null = null;
  const toolActivityMap = new Map<string, number>();
  const MIN_CONTENT_UPDATE_LENGTH = 20;

  for await (const chunk of result.fullStream) {
    switch (chunk.type) {
      // --- TEXT HANDLING ---
      case "text-start": {
        // Create a new text activity when text streaming starts
        const textActivity = await insertActivity({
          agentId,
          type: "text",
          agentName,
          status: "running",
          content: "",
          executionId: execution.id,
        });
        if (textActivity) {
          currentTextActivityId = textActivity.id;
        }
        currentTextContent = "";
        previousTextContent = "";
        break;
      }

      case "text-delta": {
        currentTextContent += chunk.text;
        if (currentTextContent.length - previousTextContent.length >= MIN_CONTENT_UPDATE_LENGTH) {
          previousTextContent = currentTextContent;
          if (currentTextActivityId) {
            await updateActivity(currentTextActivityId, {
              content: currentTextContent,
              status: "running",
            });
          }
        }
        break;
      }

      case "text-end": {
        // Mark the text activity as completed
        if (currentTextActivityId) {
          await updateActivity(currentTextActivityId, {
            content: currentTextContent,
            status: "completed",
            metadata: {
              triggerMetadata,
            },
          });
          currentTextActivityId = null;
        }
        break;
      }

      // --- REASONING HANDLING ---
      case "reasoning-start": {
        const reasoningActivity = await insertActivity({
          agentId,
          type: "reasoning",
          agentName,
          status: "running",
          content: "",
          executionId: execution.id,
        });
        if (reasoningActivity) {
          currentReasoningActivityId = reasoningActivity.id;
        }
        currentReasoningContent = "";
        previousReasoningContent = "";
        break;
      }
      case "reasoning-delta": {
        currentReasoningContent += chunk.text;
        if (
          currentReasoningContent.length - previousReasoningContent.length >=
          MIN_CONTENT_UPDATE_LENGTH
        ) {
          previousReasoningContent = currentReasoningContent;
          if (currentReasoningActivityId) {
            await updateActivity(currentReasoningActivityId, {
              content: currentReasoningContent,
              status: "running",
            });
          }
        }
        break;
      }
      case "reasoning-end": {
        // Mark the reasoning activity as completed
        if (currentReasoningActivityId) {
          await updateActivity(currentReasoningActivityId, {
            content: currentReasoningContent,
            status: "completed",
            metadata: {
              triggerMetadata,
            },
          });
          currentReasoningActivityId = null;
        }
        break;
      }

      case "tool-call": {
        const toolType = `tool_${chunk.toolName}`;
        const toolActivity = await insertActivity({
          agentId,
          type: toolType,
          agentName: getAgentNameByTool(chunk.toolName),
          status: "running",
          content: {
            input: chunk.input,
            toolCallId: chunk.toolCallId,
          },
          metadata: {
            toolName: chunk.toolName,
            toolCallId: chunk.toolCallId,
          },
          executionId: execution.id,
        });
        if (toolActivity) {
          toolActivityMap.set(chunk.toolCallId, toolActivity.id);
        }
        break;
      }

      case "tool-result": {
        const activityId = toolActivityMap.get(chunk.toolCallId);
        const toolInput = chunk.input;
        const toolResult = chunk.output as ToolResult;

        if (toolResult.success) {
          if (activityId) {
            await updateActivity(activityId, {
              status: "completed",
              content: {
                input: toolInput,
                output: toolResult,
              },
              metadata: {
                toolName: chunk.toolName,
                toolCallId: chunk.toolCallId,
                triggerMetadata,
              },
            });
          } else {
            const toolType = `tool_${chunk.toolName}`;
            await insertActivity({
              agentId,
              type: toolType,
              agentName: getAgentNameByTool(chunk.toolName),
              status: "completed",
              content: {
                input: toolInput,
                output: toolResult,
              },
              metadata: {
                toolName: chunk.toolName,
                toolCallId: chunk.toolCallId,
                triggerMetadata,
              },
              executionId: execution.id,
            });
          }
        } else {
          if (activityId) {
            await updateActivity(activityId, {
              status: "failed",
              content: {
                input: toolInput,
                output: toolResult,
              },
            });
          } else {
            const toolType = `tool_${chunk.toolName}`;
            await insertActivity({
              agentId,
              type: toolType,
              agentName: getAgentNameByTool(chunk.toolName),
              status: "failed",
              content: {
                input: toolInput,
                output: toolResult,
              },
              metadata: {
                toolName: chunk.toolName,
                toolCallId: chunk.toolCallId,
              },
              executionId: execution.id,
            });
          }
        }

        toolActivityMap.delete(chunk.toolCallId);
        break;
      }

      case "tool-error": {
        // Handle tool errors using toolCallId
        const activityId = toolActivityMap.get(chunk.toolCallId);
        if (activityId) {
          await updateActivity(activityId, {
            status: "failed",
            content: {
              error: chunk.error,
              toolName: chunk.toolName,
              input: chunk.input,
            },
          });
          toolActivityMap.delete(chunk.toolCallId);
        }
        break;
      }

      case "error": {
        // Handle stream errors
        logger.error({ error: chunk.error }, "Stream error");

        // Update current text activity if it exists
        if (currentTextActivityId) {
          await updateActivity(currentTextActivityId, {
            status: "failed",
            content: {
              error: chunk.error,
              partialText: currentTextContent,
              metadata: {
                triggerMetadata,
              },
            },
          });
        }

        // Update current reasoning activity if it exists
        if (currentReasoningActivityId) {
          await updateActivity(currentReasoningActivityId, {
            status: "failed",
            content: {
              error: chunk.error,
              partialText: currentReasoningContent,
              metadata: {
                triggerMetadata,
              },
            },
          });
        }

        // Update all pending tool activities if they exist
        for (const [, activityId] of toolActivityMap.entries()) {
          await updateActivity(activityId, {
            status: "failed",
            content: {
              error: chunk.error,
              metadata: {
                triggerMetadata,
              },
            },
          });
        }
        toolActivityMap.clear();
        break;
      }

      case "finish": {
        // Ensure any running activities are marked as completed
        if (currentTextActivityId) {
          await updateActivity(currentTextActivityId, {
            content: currentTextContent,
            status: "completed",
            metadata: {
              triggerMetadata,
            },
          });
        }
        if (currentReasoningActivityId) {
          await updateActivity(currentReasoningActivityId, {
            content: currentReasoningContent,
            status: "completed",
            metadata: {
              triggerMetadata,
            },
          });
        }
        // Complete any remaining tool activities
        for (const [, activityId] of toolActivityMap.entries()) {
          await updateActivity(activityId, {
            status: "completed",
            metadata: {
              triggerMetadata,
            },
          });
        }
        toolActivityMap.clear();
        break;
      }

      // Other chunk types are ignored
      default:
        break;
    }
  }

  await result.response;
  return;
}
