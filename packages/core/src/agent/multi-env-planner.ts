import { z } from "zod";

export const MultiEnvStepSchema = z.object({
  environment: z.enum(["browser", "sandbox", "desktop"]),
  objective: z.string(),
  reasoning: z.string(),
  dependsOnData: z.string().optional(),
});

export type MultiEnvStep = z.infer<typeof MultiEnvStepSchema>;

export const MultiEnvPlanSchema = z.object({
  steps: z.array(MultiEnvStepSchema),
});

export type MultiEnvPlan = z.infer<typeof MultiEnvPlanSchema>;

export interface MultiEnvPlannerConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
}

const SYSTEM_PROMPT = `You are Rabbit, an AI task planner. You decompose complex tasks into an ordered list of sub-tasks, each assigned to a specific environment.

Available environments:
- browser: For web scraping, form filling, navigating websites, interacting with web apps. Best when you need to browse the internet.
- sandbox: For running code, data processing, parsing, calculations, generating files. Best when you need to compute or transform data.
- desktop: For GUI applications like spreadsheets, PDF editors, or legacy desktop apps. Best when you need a full desktop OS with apps.

Rules:
1. Break the task into the MINIMUM number of sub-steps needed.
2. Each step must specify which environment to use.
3. If a later step needs data from an earlier step, set "dependsOnData" to describe what data it needs (the orchestrator will pass it forward).
4. Respond with ONLY valid JSON matching this schema: { "steps": [{ "environment": "browser"|"sandbox"|"desktop", "objective": "...", "reasoning": "...", "dependsOnData": "..." }] }`;

function buildUserPrompt(task: string): string {
  return `TASK: ${task}

Break this task into ordered sub-steps, each assigned to the correct environment. Respond with ONLY a JSON object.`;
}

export class MultiEnvPlanner {
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private maxTokens: number;

  constructor(config: MultiEnvPlannerConfig = {}) {
    const key = config.apiKey || process.env.OPENROUTER_API_KEY;
    if (!key) {
      throw new Error(
        "OPENROUTER_API_KEY is required to initialize MultiEnvPlanner",
      );
    }
    this.apiKey = key;
    this.model = config.model || "meta-llama/llama-3.1-8b-instruct:free";
    this.baseUrl = config.baseUrl || "https://openrouter.ai/api/v1";
    this.maxTokens = config.maxTokens || 2048;
  }

  async plan(task: string): Promise<MultiEnvPlan> {
    const userPrompt = buildUserPrompt(task);

    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
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
        response_format: { type: "json_object" },
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

    const parsed = JSON.parse(content);
    return MultiEnvPlanSchema.parse(parsed);
  }
}
