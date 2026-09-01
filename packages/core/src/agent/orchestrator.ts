import type { Page } from "playwright-core";
import { Planner, type Action } from "./planner";
import { Executor } from "./executor";
import { Evaluator } from "./evaluator";
import { AuditLogger, type LogHandler } from "../audit/trail";

export interface OrchestratorConfig {
  task: string;
  runId: string;
  maxSteps?: number;
  onLog: LogHandler;
}

export class AgentOrchestrator {
  private page: Page;
  private config: OrchestratorConfig;

  private planner: Planner;
  private executor: Executor;
  private evaluator: Evaluator;
  private logger: AuditLogger;

  private history: Action[] = [];

  constructor(page: Page, config: OrchestratorConfig) {
    this.page = page;
    this.config = config;

    this.planner = new Planner();
    this.executor = new Executor(page);
    this.evaluator = new Evaluator();
    this.logger = new AuditLogger(config.runId, config.onLog);
  }

  async run(): Promise<string> {
    const maxSteps = this.config.maxSteps || 50;

    for (let stepIndex = 0; stepIndex < maxSteps; stepIndex++) {
      const domSnapshot = await this.executor.getDOM();

      const screenshotBuffer = await this.page
        .screenshot({ type: "png" })
        .catch(() => Buffer.from(""));
      const screenshotBase64 = Buffer.from(screenshotBuffer).toString("base64");

      const action = await this.planner.plan({
        task: this.config.task,
        currentUrl: this.page.url(),
        screenshotBase64,
        domSnapshot,
        history: this.history,
        stepIndex,
        maxSteps,
      });

      this.history.push(action);

      const execResult = await this.executor.execute(action);
      const evalResult = await this.evaluator.evaluate(action, execResult);

      await this.logger.logStep(stepIndex, action, execResult, evalResult);

      if (action.type === "done") {
        return action.result;
      }

      if (action.type === "error") {
        throw new Error(`Agent halted with error: ${action.message}`);
      }

      if (!evalResult.success) {
        console.warn(
          `Step ${stepIndex} verification failed: ${evalResult.reasoning}`,
        );
      }
    }

    throw new Error(
      `Task exceeded maximum steps (${maxSteps}) without completion.`,
    );
  }
}
