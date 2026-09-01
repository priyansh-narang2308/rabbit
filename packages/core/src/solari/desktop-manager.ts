import { SolariClient, Desktop } from "@solarisdk/sdk";

export interface DesktopLaunchOptions {
  template?: string;
  timeoutMs?: number;
}

export class DesktopManager {
  private client: SolariClient;
  private currentDesktop: Desktop | null = null;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.SOLARI_API_KEY;
    if (!key) {
      throw new Error(
        "SOLARI_API_KEY is required to initialize DesktopManager",
      );
    }
    this.client = new SolariClient({ apiKey: key });
  }

  async launchSession(
    options: DesktopLaunchOptions = {},
  ): Promise<{ desktop: Desktop; desktopId: string }> {
    if (this.currentDesktop) {
      throw new Error(
        "A desktop session is already active. Kill it before launching a new one.",
      );
    }

    const template = options.template || "ubuntu-22.04";
    const timeoutMs = options.timeoutMs || 5 * 60_000;

    console.log(`Launching Solari desktop (template: ${template})...`);

    this.currentDesktop = await this.client.desktops.create({
      template,
      timeoutMs,
    });

    const desktopId = this.currentDesktop.id;

    await this.currentDesktop.connect();
    console.log(`Desktop connected successfully. Session ID: ${desktopId}`);

    return {
      desktop: this.currentDesktop,
      desktopId,
    };
  }

  getDesktop(): Desktop {
    if (!this.currentDesktop) {
      throw new Error("No active desktop session.");
    }
    return this.currentDesktop;
  }

  async takeScreenshot(): Promise<Uint8Array> {
    const desktop = this.getDesktop();
    return await desktop.screenshot();
  }

  async mouseClick(
    x: number,
    y: number,
    button: "left" | "right" | "middle" = "left",
  ): Promise<void> {
    const desktop = this.getDesktop();
    // Assuming standard remote input APIs exist on Desktop. If not, we might need a specific SDK input method.
    // Following typical Solari patterns:
    await desktop.mouse.move(x, y);
    await desktop.mouse.click(x, y, { button });
  }

  async keyboardType(text: string): Promise<void> {
    const desktop = this.getDesktop();
    await desktop.keyboard.type(text);
  }

  async getStreamUrl(): Promise<string> {
    const desktop = this.getDesktop();
    // Assuming typical VNC/WebRTC stream URL fetch logic
    return desktop.streamUrl;
  }

  async killSession(): Promise<void> {
    if (this.currentDesktop) {
      const desktopId = this.currentDesktop.id;
      await this.currentDesktop.kill();
      this.currentDesktop = null;
      console.log(`Session ${desktopId} killed.`);
    }
  }

  async cleanup(): Promise<void> {
    await this.killSession();
    console.log("Solari desktop connections closed.");
  }
}
