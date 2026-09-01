import { SandboxManager } from "../solari/sandbox-manager";
import type { SandboxAction } from "./sandbox-planner";

export interface SandboxExecutorResult {
  success: boolean;
  action: SandboxAction;
  screenshotBase64: string; // Will just be empty string since it's a CLI
  url: string; // The preview URL if applicable, or "sandbox://cli"
  durationMs: number;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  error?: string;
}

export class SandboxExecutor {
  private sandboxManager: SandboxManager;

  constructor(sandboxManager: SandboxManager) {
    this.sandboxManager = sandboxManager;
  }

  async execute(action: SandboxAction): Promise<SandboxExecutorResult> {
    const start = Date.now();
    let success = true;
    let error: string | undefined;
    let stdout = "";
    let stderr = "";
    let exitCode = 0;

    try {
      switch (action.type) {
        case "run_command":
          const res = await this.sandboxManager.runCommand(
            action.command,
            action.args,
          );
          stdout = res.stdout;
          stderr = res.stderr;
          exitCode = res.exitCode;
          success = exitCode === 0;
          break;

        case "done":
        case "error":
          break;

        default:
          success = false;
          // @ts-ignore
          error = `Unsupported action type: ${action.type}`;
      }
    } catch (err: any) {
      success = false;
      error = err.message;
    }

    const durationMs = Date.now() - start;

    return {
      success,
      action,
      screenshotBase64: "", // CLI doesn't have screenshots
      url: "sandbox://cli",
      durationMs,
      stdout,
      stderr,
      exitCode,
      error,
    };
  }
}
