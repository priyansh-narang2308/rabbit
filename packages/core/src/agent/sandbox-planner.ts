import { z } from "zod";
import { groqChat, parseAction } from "../llm/groq";

export const SandboxActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("run_command"),
    command: z.string(),
    args: z.array(z.string()).default([]),
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
    this.apiKey = config.apiKey || process.env.GROQ_API_KEY || "";
    this.model = config.model || "";
    this.baseUrl = config.baseUrl || "";
    this.maxTokens = config.maxTokens || 1024;
  }

  async plan(ctx: SandboxPlannerContext): Promise<SandboxAction> {
    const userPrompt = buildUserPrompt(ctx);

    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ];

    const content = await groqChat({
      messages,
      apiKey: this.apiKey,
      model: this.model || undefined,
      maxTokens: this.maxTokens,
      temperature: 0.1,
    });

    const parsed = parseAction<Partial<SandboxAction>>(
      content,
      ["run_command", "done", "error"],
    );
    return SandboxActionSchema.parse(parsed);
  }
}
