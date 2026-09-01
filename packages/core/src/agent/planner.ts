import { z } from "zod";
import { groqChat, parseAction } from "../llm/groq";

export const ActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("navigate"),
    url: z.string(),
    reasoning: z.string().default(""),
  }),
  z.object({
    type: z.literal("click"),
    selector: z.string(),
    reasoning: z.string().default(""),
  }),
  z.object({
    type: z.literal("type"),
    selector: z.string(),
    value: z.string(),
    reasoning: z.string().default(""),
  }),
  z.object({
    type: z.literal("scroll"),
    direction: z.enum(["up", "down"]),
    reasoning: z.string().default(""),
  }),
  z.object({
    type: z.literal("evaluate"),
    script: z.string(),
    reasoning: z.string().default(""),
  }),
  z.object({
    type: z.literal("wait"),
    ms: z.number(),
    reasoning: z.string().default(""),
  }),
  z.object({
    type: z.literal("extract"),
    selector: z.string(),
    reasoning: z.string().default(""),
  }),
  z.object({
    type: z.literal("done"),
    result: z.string(),
    reasoning: z.string().default(""),
  }),
  z.object({
    type: z.literal("error"),
    message: z.string(),
    reasoning: z.string().default(""),
  }),
]);

export type Action = z.infer<typeof ActionSchema>;

export interface PlannerContext {
  task: string;
  currentUrl: string;
  screenshotBase64: string;
  domSnapshot: string;
  history: Action[];
  stepIndex: number;
  maxSteps: number;
}

export interface PlannerConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
}

const SYSTEM_PROMPT = `You are Rabbit, an AI agent that controls a web browser to complete tasks.

You receive:
- The user's task objective
- A screenshot of the current page (as an image)
- A simplified DOM snapshot of the current page
- Your action history so far

You must respond with a single JSON action. Available actions:
- navigate: Go to a URL. Use when you need to visit a new page.
- click: Click an element by CSS selector. Use for buttons, links, inputs.
- type: Type text into an input by CSS selector. Always click/focus first if needed.
- scroll: Scroll the page up or down. Use when content is below the fold.
- evaluate: Run arbitrary JavaScript on the page. Use sparingly, for complex extractions.
- wait: Wait for a specified number of milliseconds. Use after actions that trigger loading.
- extract: Extract text content from an element by CSS selector.
- done: The task is complete. Include the final result/answer.
- error: Something went wrong and you cannot recover.

Rules:
1. Always include "reasoning" explaining WHY you chose this action.
2. Use precise CSS selectors. Prefer [data-*], #id, then .class selectors.
3. If a page is loading, use "wait" with a reasonable ms value.
4. If you've been stuck for 3+ steps, try a different approach.
5. Never repeat the exact same action twice in a row.
6. When the task is fully done, use "done" immediately.

Respond with ONLY valid JSON. No markdown, no explanation outside the JSON.`;

function buildUserPrompt(ctx: PlannerContext): string {
  const historyStr =
    ctx.history.length > 0
      ? ctx.history
          .map(
            (a, i) =>
              `Step ${i + 1}: ${a.type}${a.type === "click" ? ` → ${a.selector}` : ""}${a.type === "navigate" ? ` → ${a.url}` : ""}${a.type === "type" ? ` → ${a.selector} = "${a.value}"` : ""} | ${a.reasoning}`,
          )
          .join("\n")
      : "No actions taken yet.";

  return `TASK: ${ctx.task}

CURRENT URL: ${ctx.currentUrl}
STEP: ${ctx.stepIndex}/${ctx.maxSteps}

ACTION HISTORY:
${historyStr}

DOM SNAPSHOT (simplified):
${ctx.domSnapshot.slice(0, 8000)}

Decide the next action. Respond with ONLY a JSON object.`;
}

export class Planner {
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private maxTokens: number;

  constructor(config: PlannerConfig = {}) {
    this.apiKey = config.apiKey || process.env.GROQ_API_KEY || "";
    this.model = config.model || "";
    this.baseUrl = config.baseUrl || "";
    this.maxTokens = config.maxTokens || 1024;
  }

  async plan(ctx: PlannerContext): Promise<Action> {
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

    const content = await groqChat({
      messages,
      apiKey: this.apiKey,
      model: this.model || undefined,
      maxTokens: this.maxTokens,
      temperature: 0.1,
      vision: true,
    });

    const parsed = parseAction<Partial<Action>>(content);
    try {
      return ActionSchema.parse(parsed);
    } catch (e: any) {
      return {
        type: "error",
        message: `Schema validation failed: ${e.message}. Raw output: ${JSON.stringify(parsed)}`,
        reasoning: "The model returned an invalid action structure.",
      };
    }
  }
}
