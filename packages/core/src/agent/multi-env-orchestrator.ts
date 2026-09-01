import { BrowserManager } from "../solari/browser-manager";
import { SandboxManager } from "../solari/sandbox-manager";
import { DesktopManager } from "../solari/desktop-manager";
import { AgentOrchestrator } from "./orchestrator";
import { SandboxOrchestrator } from "./sandbox-orchestrator";
import { DesktopOrchestrator } from "./desktop-orchestrator";
import {
  MultiEnvPlanner,
  type MultiEnvPlan,
  type MultiEnvStep,
} from "./multi-env-planner";
import { type LogHandler } from "../audit/trail";

export interface MultiEnvOrchestratorConfig {
  task: string;
  runId: string;
  maxStepsPerPhase?: number;
  onLog: LogHandler;
  onPhaseStart?: (phase: number, step: MultiEnvStep) => void;
  onPhaseComplete?: (phase: number, step: MultiEnvStep, result: string) => void;
  browserLaunchOptions?: {
    profileId?: string;
    proxyCountry?: string;
    stealth?: boolean;
    captcha?: boolean;
    recording?: boolean;
  };
  /**
   * Optional per-browser-phase proxy countries, indexed by phase number.
   * When set for a given phase, that browser phase overrides the shared
   * `browserLaunchOptions.proxyCountry` with its own geo-proxy. This enables
   * multi-geo scenarios (e.g. browsing the same market from different countries).
   */
  perPhaseProxyCountry?: Record<number, string>;
}

export interface MultiEnvResult {
  plan: MultiEnvPlan;
  phaseResults: Array<{
    phase: number;
    environment: string;
    objective: string;
    result: string;
    durationMs: number;
  }>;
  finalResult: string;
}

export class MultiEnvOrchestrator {
  private config: MultiEnvOrchestratorConfig;
  private planner: MultiEnvPlanner;

  constructor(config: MultiEnvOrchestratorConfig) {
    this.config = config;
    this.planner = new MultiEnvPlanner();
  }

  async run(): Promise<MultiEnvResult> {
    const plan = await this.planner.plan(this.config.task);

    if (!plan.steps.length) {
      throw new Error("Multi-environment planner returned zero steps.");
    }

    const phaseResults: MultiEnvResult["phaseResults"] = [];
    let previousResult = "";

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      const phaseStart = Date.now();

      this.config.onPhaseStart?.(i, step);

      const enrichedObjective =
        step.dependsOnData && previousResult
          ? `${step.objective}\n\nData from previous phase:\n${previousResult}`
          : step.objective;

      let result: string;

      switch (step.environment) {
        case "browser":
          result = await this.runBrowserPhase(enrichedObjective, i);
          break;
        case "sandbox":
          result = await this.runSandboxPhase(enrichedObjective, i);
          break;
        case "desktop":
          result = await this.runDesktopPhase(enrichedObjective, i);
          break;
        default:
          throw new Error(`Unknown environment: ${step.environment}`);
      }

      const phaseDuration = Date.now() - phaseStart;

      phaseResults.push({
        phase: i,
        environment: step.environment,
        objective: step.objective,
        result,
        durationMs: phaseDuration,
      });

      previousResult = result;
      this.config.onPhaseComplete?.(i, step, result);
    }

    return {
      plan,
      phaseResults,
      finalResult: previousResult,
    };
  }

  private async runBrowserPhase(
    objective: string,
    phaseIndex: number,
  ): Promise<string> {
    const browserManager = new BrowserManager();

    try {
      const { browser } = await browserManager.launchSession({
        profileId: this.config.browserLaunchOptions?.profileId,
        proxyCountry:
          this.config.perPhaseProxyCountry?.[phaseIndex] ??
          this.config.browserLaunchOptions?.proxyCountry,
        stealth: this.config.browserLaunchOptions?.stealth ?? true,
        captcha: this.config.browserLaunchOptions?.captcha ?? true,
        recording: this.config.browserLaunchOptions?.recording ?? true,
      });

      const page = await browser.newPage();

      const orchestrator = new AgentOrchestrator(page as any, {
        task: objective,
        runId: `${this.config.runId}-phase-${phaseIndex}`,
        maxSteps: this.config.maxStepsPerPhase || 30,
        onLog: this.config.onLog,
      });

      return await orchestrator.run();
    } finally {
      await browserManager.cleanup();
    }
  }

  private async runSandboxPhase(
    objective: string,
    phaseIndex: number,
  ): Promise<string> {
    const sandboxManager = new SandboxManager();

    try {
      await sandboxManager.launchSession({
        timeoutMs: 300000,
      });

      const orchestrator = new SandboxOrchestrator(sandboxManager, {
        task: objective,
        runId: `${this.config.runId}-phase-${phaseIndex}`,
        maxSteps: this.config.maxStepsPerPhase || 30,
        onLog: this.config.onLog,
      });

      return await orchestrator.run();
    } finally {
      await sandboxManager.cleanup();
    }
  }

  private async runDesktopPhase(
    objective: string,
    phaseIndex: number,
  ): Promise<string> {
    const desktopManager = new DesktopManager();

    try {
      await desktopManager.launchSession({
        timeoutMs: 300000,
      });

      const orchestrator = new DesktopOrchestrator(desktopManager, {
        task: objective,
        runId: `${this.config.runId}-phase-${phaseIndex}`,
        maxSteps: this.config.maxStepsPerPhase || 30,
        onLog: this.config.onLog,
      });

      return await orchestrator.run();
    } finally {
      await desktopManager.cleanup();
    }
  }
}
