import { z } from "zod";

export const SandboxActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("run_command"),
    command: z.string(),
    args: z.array(z.string()).default([]),
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

export type SandboxAction = z.infer<typeof SandboxActionSchema>;

export interface SandboxPlannerContext {
  task: string;
  history: Array<{ action: SandboxAction; stdout: string; stderr: string; exitCode: number }>;
  stepIndex: number;
  maxSteps: number;
}

export interface SandboxPlannerConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
}

const SYSTEM_PROMPT = `You are Rabbit, an AI agent that controls a secure Linux Sandbox VM to complete tasks.
You do NOT have a browser or desktop UI. You can only run shell commands.

You receive:
- The user's task objective
- Your action history (commands run, and their stdout/stderr output)

You must respond with a single JSON action. Available actions:
- run_command: Run a shell command in the sandbox. Use this to write files (e.g. echo "code" > script.py), run scripts (python3 script.py), curl APIs, start servers, or parse data.
- done: The task is complete. Include the final result/answer.
- error: Something went wrong and you cannot recover.

Rules:
1. Always include "reasoning" explaining WHY you chose this action.
2. If you need to write a script, use standard bash tools like \`cat << 'EOF' > script.py\` or \`echo\`.
3. To start a server, run it in the foreground or background depending on your needs. Wait! The Sandbox orchestrator waits for commands to exit, so if you start a long-running server, append \`&\` to run it in the background!
4. Respond with ONLY valid JSON. No markdown, no explanation outside the JSON.`;

function buildUserPrompt(ctx: SandboxPlannerContext): string {
  const historyStr =
    ctx.history.length > 0
      ? ctx.history
          .map(
            (h, i) =>
              `Step ${i + 1}: ${h.action.type}${
                h.action.type === "run_command"
                  ? ` → \`${h.action.command} ${h.action.args.join(" ")}\``
                  : ""
              } | Reasoning: ${h.action.reasoning}
Exit Code: ${h.exitCode}
STDOUT:
${h.stdout.slice(-1000)}
STDERR:
${h.stderr.slice(-1000)}`
          )
          .join("\n\n")
      : "No actions taken yet.";

  return `TASK: ${ctx.task}

STEP: ${ctx.stepIndex}/${ctx.maxSteps}

ACTION HISTORY (with command outputs):
${historyStr}

Decide the next action based on the command outputs. Respond with ONLY a JSON object.`;
}

export class SandboxPlanner {
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private maxTokens: number;

  constructor(config: SandboxPlannerConfig = {}) {
    const key = config.apiKey || process.env.OPENROUTER_API_KEY || "ollama";
    this.apiKey = key;
    this.model = config.model || "gemma4:e2b";
    this.baseUrl = config.baseUrl || "http://127.0.0.1:11434/v1";
    this.maxTokens = config.maxTokens || 1024;
  }

  async plan(ctx: SandboxPlannerContext): Promise<SandboxAction> {
    const userPrompt = buildUserPrompt(ctx);

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
    return SandboxActionSchema.parse(parsed);
  }
}
