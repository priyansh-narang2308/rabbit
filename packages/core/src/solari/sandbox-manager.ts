/**
 * Rabbit — Solari Sandbox Manager
 *
 * Manages the lifecycle of Solari headless Linux microVMs (Sandboxes).
 * Agents use sandboxes to execute code (e.g., Python scripts for data processing)
 * safely isolated from our infrastructure, or to host temporary web servers
 * that can be exposed via port previews.
 */

import { SolariClient, Sandbox } from "@solarisdk/sdk";

export interface SandboxLaunchOptions {
  template?: string; // e.g., "base", "default"
  timeoutMs?: number; // Rolling idle window
}

export class SandboxManager {
  private client: SolariClient;
  private currentSandbox: Sandbox | null = null;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.SOLARI_API_KEY;
    if (!key) {
      throw new Error(
        "SOLARI_API_KEY is required to initialize SandboxManager",
      );
    }

    // SolariClient manages sandboxes, desktops, and sessions.
    this.client = new SolariClient({ apiKey: key });
  }

  /**
   * Creates and connects to a new Sandbox microVM.
   */
  async launchSession(
    options: SandboxLaunchOptions = {},
  ): Promise<{ sandbox: Sandbox; sandboxId: string }> {
    if (this.currentSandbox) {
      throw new Error(
        "A sandbox session is already active. Kill it before launching a new one.",
      );
    }

    const template = options.template || "base";
    // 5 minute default rolling window
    const timeoutMs = options.timeoutMs || 5 * 60_000;

    console.log(`🐰 Launching Solari sandbox (template: ${template})...`);

    this.currentSandbox = await this.client.sandboxes.create({
      template,
      timeoutMs,
    });

    const sandboxId = this.currentSandbox.id;

    // We must connect to establish the control channel for commands/files.
    await this.currentSandbox.connect();
    console.log(`🐰 Sandbox connected successfully. Session ID: ${sandboxId}`);

    return {
      sandbox: this.currentSandbox,
      sandboxId,
    };
  }

  /**
   * Returns the currently active sandbox, or throws if none exists.
   */
  getSandbox(): Sandbox {
    if (!this.currentSandbox) {
      throw new Error("No active sandbox session.");
    }
    return this.currentSandbox;
  }

  /**
   * Run a command inside the sandbox.
   * Note: commands are NOT shell-interpreted by default. To use pipes or
   * redirection, run `sh` with `-c`.
   */
  async runCommand(
    command: string,
    args: string[] = [],
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const sandbox = this.getSandbox();
    return await sandbox.commands.run(command, { args });
  }

  /**
   * Expose a port running inside the sandbox to the public internet.
   */
  async getPreviewUrl(port: number): Promise<string> {
    const sandbox = this.getSandbox();
    const result = await sandbox.previewUrl(port);
    return result.url;
  }

  /**
   * Destroys the current sandbox VM.
   * `kill()` completely ends the VM (unlike `close()` which only drops the local channel).
   */
  async killSession(): Promise<void> {
    if (this.currentSandbox) {
      const sandboxId = this.currentSandbox.id;
      await this.currentSandbox.kill();
      this.currentSandbox = null;
      console.log(`Session ${sandboxId} killed.`);
    }
  }

  /**
   * Full cleanup before process exit.
   */
  async cleanup(): Promise<void> {
    await this.killSession();
    console.log("Solari sandbox connections closed.");
  }
}
