import { z } from "zod";

export const DesktopActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("click"),
    x: z.number(),
    y: z.number(),
    button: z.enum(["left", "right", "middle"]).default("left"),
    reasoning: z.string(),
  }),
  z.object({
    type: z.literal("type"),
    text: z.string(),
    reasoning: z.string(),
  }),
  z.object({
    type: z.literal("wait"),
    ms: z.number(),
    reasoning: z.string(),
  }),
  z.object({
    type: z.literal("done"),
    result: z.string(),
    reasoning: z.string(),
  }),
  z.object({
    type: z.literal("error"),
    message: z.string(),
    reasoning: z.string(),
  }),
]);

export type DesktopAction = z.infer<typeof DesktopActionSchema>;

export interface DesktopPlannerContext {
  task: string;
  screenshotBase64: string;
  history: DesktopAction[];
  stepIndex: number;
  maxSteps: number;
}

export interface DesktopPlannerConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
}

const SYSTEM_PROMPT = `You are Rabbit, an AI agent that controls a Desktop VM to complete tasks.
You do NOT have access to a browser DOM. You can only see the screen and interact via mouse coordinates and keyboard input.

You receive:
- The user's task objective
- A screenshot of the current desktop (as an image)
- Your action history so far

You must respond with a single JSON action. Available actions:
- click: Click at specific (x, y) coordinates.
- type: Type text. Make sure to click the input field first!
- wait: Wait for a specified number of milliseconds (e.g., if an app is loading).
- done: The task is complete. Include the final result/answer.
- error: Something went wrong and you cannot recover.

Rules:
1. Always include "reasoning" explaining WHY you chose this action.
2. For clicks, accurately estimate the (x, y) coordinates based on the screenshot.
3. Never type text without clicking an input area first.
4. If the screen is loading, use "wait".
5. Respond with ONLY valid JSON. No markdown, no explanation outside the JSON.`;

function buildUserPrompt(ctx: DesktopPlannerContext): string {
  const historyStr =
    ctx.history.length > 0
      ? ctx.history
          .map(
            (a, i) =>
              `Step ${i + 1}: ${a.type}${a.type === "click" ? ` → (${a.x}, ${a.y})` : ""}${a.type === "type" ? ` → "${a.text}"` : ""} | ${a.reasoning}`,
          )
          .join("\n")
      : "No actions taken yet.";

  return `TASK: ${ctx.task}

STEP: ${ctx.stepIndex}/${ctx.maxSteps}

ACTION HISTORY:
${historyStr}

Decide the next action based on the visual screenshot. Respond with ONLY a JSON object.`;
}

export class DesktopPlanner {
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private maxTokens: number;

  constructor(config: DesktopPlannerConfig = {}) {
    const key = config.apiKey || process.env.OPENROUTER_API_KEY || "ollama";
    this.apiKey = key;
    this.model = config.model || "qwen3.5:2b";
    this.baseUrl = config.baseUrl || "http://127.0.0.1:11434/v1";
    this.maxTokens = config.maxTokens || 1024;
  }

  async plan(ctx: DesktopPlannerContext): Promise<DesktopAction> {
    const userPrompt = buildUserPrompt(ctx);

    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${ctx.screenshotBase64}`,
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
        max_tokens: this.maxTokens,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `OpenRouter API error (${response.status}): ${errorBody}`,
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in LLM response");
    }

    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const cleanContent = jsonMatch ? jsonMatch[1] : content.trim();
    const parsed = JSON.parse(cleanContent);
    return DesktopActionSchema.parse(parsed);
  }
}
