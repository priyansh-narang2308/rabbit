import { MultiEnvOrchestrator } from "../agent/multi-env-orchestrator";
import { type LogHandler } from "../audit/trail";

export interface PersistentIdentityConfig {
  /** The target URL to log into. */
  url: string;
  /** Username or email for the login. */
  username: string;
  /** Password for the login. */
  password: string;
  /** The specific Solari profile ID to use across sessions. */
  profileId: string;
}

export interface PersistentIdentityResult {
  plan: any;
  phaseResults: Array<{
    phase: number;
    environment: string;
    objective: string;
    result: string;
    durationMs: number;
  }>;
  finalResult: string;
}

function buildTask(config: PersistentIdentityConfig): string {
  return [
    `Demonstrate persistent identity workflow using profile: ${config.profileId}`,
    ``,
    `Phase 1 (Initial Login Session):`,
    `Navigate to ${config.url}. Find the login form and authenticate using username: "${config.username}" and password: "${config.password}". Wait for the login to succeed and verify you are on the authenticated dashboard or logged-in state. Report success.`,
    ``,
    `Phase 2 (Follow-up Session):`,
    `Navigate to ${config.url} again. Verify that you are ALREADY logged in (do not enter credentials again). Perform a simple authenticated action (like viewing profile details or adding an item to a cart) to prove the session persisted. Report the final success state.`,
  ].join("\n");
}

/**
 * PersistentIdentityDemo orchestrates a two-phase browser task using the
 * same Solari profile ID. In Phase 1, the agent logs in. The browser closes,
 * and Solari saves the cookie/localstorage state. In Phase 2, a NEW browser
 * session is launched with the same profile ID, and the agent verifies it
 * is still logged in without providing credentials.
 */
export class PersistentIdentityDemo {
  private config: PersistentIdentityConfig;

  constructor(config: PersistentIdentityConfig) {
    if (!config.profileId) {
      throw new Error("PersistentIdentityDemo requires a profileId.");
    }
    this.config = config;
  }

  getTaskDescription(): string {
    return buildTask(this.config);
  }

  async run(options: {
    runId: string;
    onLog: LogHandler;
    stealth?: boolean;
    captcha?: boolean;
    recording?: boolean;
    maxStepsPerPhase?: number;
  }): Promise<PersistentIdentityResult> {
    const orchestrator = new MultiEnvOrchestrator({
      task: buildTask(this.config),
      runId: options.runId,
      maxStepsPerPhase: options.maxStepsPerPhase || 30,
      onLog: options.onLog,
      browserLaunchOptions: {
        profileId: this.config.profileId,
        stealth: options.stealth ?? true,
        captcha: options.captcha ?? true,
        recording: options.recording ?? true,
      },
    });

    const result = await orchestrator.run();

    return {
      plan: result.plan,
      phaseResults: result.phaseResults,
      finalResult: result.finalResult,
    };
  }
}
