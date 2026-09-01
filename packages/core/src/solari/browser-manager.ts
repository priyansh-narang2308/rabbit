import { Solari, BrowserSession } from "@solarisdk/browser";

export interface BrowserLaunchOptions {
  profileId?: string;
  proxyCountry?: string;
  stealth?: boolean;
  captcha?: boolean;
  recording?: boolean;
}

export class BrowserManager {
  private solari: Solari;
  private currentBrowser: BrowserSession | null = null;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.SOLARI_API_KEY;
    if (!key) {
      throw new Error(
        "SOLARI_API_KEY is required to initialize BrowserManager",
      );
    }

    this.solari = new Solari({ apiKey: key });
  }

  async launchSession(
    options: BrowserLaunchOptions = {},
  ): Promise<{ browser: BrowserSession; sessionId: string }> {
    if (this.currentBrowser) {
      throw new Error(
        "A browser session is already active. Close it before launching a new one.",
      );
    }

    const launchConfig: Record<string, any> = {
      recording: options.recording ?? true,
      stealth: options.stealth ?? true,
      captcha: options.captcha ?? true,
    };

    if (options.proxyCountry) {
      launchConfig.proxy = { country: options.proxyCountry };
    }

    if (options.profileId) {
      launchConfig.profileId = options.profileId;
    }

    console.log(
      "Launching Solari browser with config:",
      JSON.stringify(launchConfig),
    );

    this.currentBrowser = await this.solari.launch(launchConfig);
    const sessionId = this.currentBrowser.id;

    console.log(`🐰 Browser launched successfully. Session ID: ${sessionId}`);

    return {
      browser: this.currentBrowser,
      sessionId,
    };
  }

  getBrowser(): BrowserSession {
    if (!this.currentBrowser) {
      throw new Error("No active browser session.");
    }
    return this.currentBrowser;
  }

  async closeSession(): Promise<void> {
    if (this.currentBrowser) {
      const sessionId = this.currentBrowser.id;
      console.log(`🐰 Closing Solari browser session ${sessionId}...`);
      await this.currentBrowser.close();
      this.currentBrowser = null;
      console.log(`Session ${sessionId} closed.`);
    }
  }

  async cleanup(): Promise<void> {
    await this.closeSession();
    await this.solari.close();
    console.log("Solari client connections closed.");
  }

  getClient(): Solari {
    return this.solari;
  }
}
