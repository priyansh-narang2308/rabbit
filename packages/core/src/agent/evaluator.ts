import { z } from "zod";
import type { Action } from "./planner";
import type { ExecutorResult } from "./executor";

export const EvaluationSchema = z.object({
  success: z.boolean(),
  reasoning: z.string(),
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
    const key = config.apiKey || process.env.OPENROUTER_API_KEY;
    if (!key) {
      throw new Error("OPENROUTER_API_KEY is required to initialize Evaluator");
    }
    this.apiKey = key;
    this.model = config.model || "meta-llama/llama-3.2-90b-vision-instruct:free";
    this.baseUrl = config.baseUrl || "https://openrouter.ai/api/v1";
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

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/priyansh-narang2308/rabbit",
        "X-Title": "Rabbit",
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: 512,
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${await response.text()}`);
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    
    return EvaluationSchema.parse(parsed);
  }
}
