import { DesktopManager } from "../solari/desktop-manager";
import { DesktopPlanner, type DesktopAction } from "./desktop-planner";
import { DesktopExecutor } from "./desktop-executor";
import { AuditLogger, type LogHandler } from "../audit/trail";

export interface DesktopOrchestratorConfig {
  task: string;
  runId: string;
  maxSteps?: number;
  onLog: LogHandler;
}

export class DesktopOrchestrator {
  private desktopManager: DesktopManager;
  private config: DesktopOrchestratorConfig;

  private planner: DesktopPlanner;
  private executor: DesktopExecutor;
  private logger: AuditLogger;

  private history: DesktopAction[] = [];

  constructor(
    desktopManager: DesktopManager,
    config: DesktopOrchestratorConfig,
  ) {
    this.desktopManager = desktopManager;
    this.config = config;

    this.planner = new DesktopPlanner();
    this.executor = new DesktopExecutor(desktopManager);
    this.logger = new AuditLogger(config.runId, config.onLog);
  }

  async run(): Promise<string> {
    const maxSteps = this.config.maxSteps || 50;
    let consecutiveFailures = 0;

    for (let stepIndex = 0; stepIndex < maxSteps; stepIndex++) {
      // 1. Take screenshot from desktop
      const screenshotBuffer = await this.desktopManager
        .takeScreenshot()
        .catch(() => new Uint8Array());
      const screenshotBase64 = Buffer.from(screenshotBuffer).toString("base64");

      // 2. Plan next action based on visual state
      const action = await this.planner.plan({
        task: this.config.task,
        screenshotBase64,
        history: this.history,
        stepIndex,
        maxSteps,
      });

      this.history.push(action);

      // 3. Execute
      const execResult = await this.executor.execute(action);

      // 4. Log
      // Map DesktopAction to standard Action for the AuditLogger
      let standardAction: any;
      if (action.type === "click") {
        standardAction = {
          type: "click",
          selector: `(${action.x}, ${action.y})`,
          reasoning: action.reasoning,
        };
      } else if (action.type === "type") {
        standardAction = {
          type: "type",
          selector: "Desktop Focus",
          value: action.text,
          reasoning: action.reasoning,
        };
      } else {
        standardAction = action;
      }

      await this.logger.logStep(stepIndex, standardAction, execResult, {
        success: true,
        reasoning: "Visual confirmation assumed",
      });

      if (action.type === "done") {
        return action.result;
      }

      if (action.type === "error") {
        throw new Error(`Desktop Agent halted with error: ${action.message}`);
      }

      if (!execResult.success) {
        consecutiveFailures++;
        const failReason = execResult.error;

        console.warn(
          `Desktop Step ${stepIndex} failed (${consecutiveFailures}/3): ${failReason}`,
        );

        if (consecutiveFailures >= 3) {
          throw new Error(
            `Desktop Task aborted after 3 consecutive failures. Last error: ${failReason}`,
          );
        }

        this.history[this.history.length - 1].reasoning +=
          ` [FAILED: ${failReason}]`;
      } else {
        consecutiveFailures = 0;
      }

      // Add a small pause to let the desktop UI settle before taking the next screenshot
      if (action.type !== "wait") {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    throw new Error(
      `Desktop Task exceeded maximum steps (${maxSteps}) without completion.`,
    );
  }
}
