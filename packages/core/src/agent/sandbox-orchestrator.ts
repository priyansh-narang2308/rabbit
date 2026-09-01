import { SandboxManager } from "../solari/sandbox-manager";
import { SandboxPlanner, type SandboxAction } from "./sandbox-planner";
import { SandboxExecutor } from "./sandbox-executor";
import { AuditLogger, type LogHandler } from "../audit/trail";

export interface SandboxOrchestratorConfig {
  task: string;
  runId: string;
  maxSteps?: number;
  onLog: LogHandler;
}

export class SandboxOrchestrator {
  private sandboxManager: SandboxManager;
  private config: SandboxOrchestratorConfig;

  private planner: SandboxPlanner;
  private executor: SandboxExecutor;
  private logger: AuditLogger;

  private history: Array<{ action: SandboxAction; stdout: string; stderr: string; exitCode: number }> = [];

  constructor(sandboxManager: SandboxManager, config: SandboxOrchestratorConfig) {
    this.sandboxManager = sandboxManager;
    this.config = config;

    this.planner = new SandboxPlanner();
    this.executor = new SandboxExecutor(sandboxManager);
    this.logger = new AuditLogger(config.runId, config.onLog);
  }

  async run(): Promise<string> {
    const maxSteps = this.config.maxSteps || 50;
    let consecutiveFailures = 0;

    for (let stepIndex = 0; stepIndex < maxSteps; stepIndex++) {
      // 1. Plan next action based on command history
      const action = await this.planner.plan({
        task: this.config.task,
        history: this.history,
        stepIndex,
        maxSteps,
      });

      // 2. Execute
      const execResult = await this.executor.execute(action);

      // Save to history for the planner
      this.history.push({
        action,
        stdout: execResult.stdout || "",
        stderr: execResult.stderr || "",
        exitCode: execResult.exitCode || 0,
      });

      // 3. Log
      // Map SandboxAction to standard Action for the AuditLogger
      let standardAction: any;
      if (action.type === "run_command") {
         standardAction = { type: "evaluate", script: `${action.command} ${action.args.join(" ")}`, reasoning: action.reasoning };
      } else {
         standardAction = action;
      }

      await this.logger.logStep(stepIndex, standardAction, execResult, { success: true, reasoning: "CLI execution assumed valid" });

      if (action.type === "done") {
        return action.result;
      }

      if (action.type === "error") {
        throw new Error(`Sandbox Agent halted with error: ${action.message}`);
      }

      if (!execResult.success) {
        consecutiveFailures++;
        const failReason = execResult.error || execResult.stderr;
        
        console.warn(`Sandbox Step ${stepIndex} failed (${consecutiveFailures}/3): ${failReason}`);
        
        if (consecutiveFailures >= 3) {
          throw new Error(`Sandbox Task aborted after 3 consecutive failures. Last error: ${failReason}`);
        }

        this.history[this.history.length - 1].action.reasoning += ` [FAILED: ${failReason}]`;
      } else {
        consecutiveFailures = 0;
      }
    }

    throw new Error(
      `Sandbox Task exceeded maximum steps (${maxSteps}) without completion.`,
    );
  }
}
