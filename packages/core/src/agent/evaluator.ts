import { z } from "zod";
import type { Action } from "./planner";
import type { ExecutorResult } from "./executor";
import { groqChat, parseJsonObject } from "../llm/groq";

export const EvaluationSchema = z.object({
  success: z.boolean(),
  reasoning: z.string().default(""),
});

export type Evaluation = z.infer<typeof EvaluationSchema>;

export interface EvaluatorConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export class Evaluator {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: EvaluatorConfig = {}) {
    this.apiKey = config.apiKey || process.env.GROQ_API_KEY || "";
    this.model = config.model || "";
    this.baseUrl = config.baseUrl || "";
  }

  async evaluate(action: Action, result: ExecutorResult): Promise<Evaluation> {
    if (!result.success) {
      return {
        success: false,
        reasoning: `Execution failed at browser level: ${result.error}`,
      };
    }

    if (action.type === "done" || action.type === "error" || action.type === "wait") {
      return { success: true, reasoning: "No visual verification needed." };
    }

    const systemPrompt = `You are verifying if an AI agent's action succeeded.
You are given the action the agent attempted, and a screenshot of the browser AFTER the action.
Determine if the action appears to have succeeded.

Respond with ONLY valid JSON:
{
  "success": boolean,
  "reasoning": "why"
}`;

    const userPrompt = `Attempted Action: ${JSON.stringify(action)}
Current URL: ${result.url}`;

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${result.screenshotBase64}`,
            },
          },
          { type: "text", text: userPrompt },
        ],
      },
    ];

    const content = await groqChat({
      messages,
      apiKey: this.apiKey,
      model: this.model || undefined,
      maxTokens: 500,
      temperature: 0.0,
      vision: true,
    });

    const parsed = parseJsonObject<Evaluation>(content);
    return EvaluationSchema.parse(parsed);
  }
}
