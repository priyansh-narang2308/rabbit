import { Solari, type BrowserSession } from "@solarisdk/browser";

export interface RecordingOptions {
  pollingIntervalMs?: number;
  maxAttempts?: number;
}

export class RecordingDownloader {
  private solari: Solari;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.SOLARI_API_KEY;
    if (!key) {
      throw new Error(
        "SOLARI_API_KEY is required to initialize RecordingDownloader",
      );
    }
    this.solari = new Solari({ apiKey: key });
  }

  async download(
    session: BrowserSession,
    options: RecordingOptions = {},
  ): Promise<{ data: any[]; sizeBytes: number }> {
    const pollingIntervalMs = options.pollingIntervalMs || 5000;
    const maxAttempts = options.maxAttempts || 12;

    let attempts = 0;
    let recordingUrl: string | undefined = (session as any).recordingUrl;

    while (!recordingUrl && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, pollingIntervalMs));
      const state = ((await this.solari) as any).sessions?.get
        ? await (this.solari as any).sessions.get(session.id)
        : null;
      recordingUrl = state?.recordingUrl;
      attempts++;
    }

    if (!recordingUrl) {
      throw new Error(
        `Failed to retrieve recording URL for session ${session.id} after ${attempts} attempts. Was recording enabled?`,
      );
    }

    console.log(`Downloading recording from ${recordingUrl}`);
    const response = await fetch(recordingUrl);

    if (!response.ok) {
      throw new Error(`Failed to download recording: HTTP ${response.status}`);
    }

    const text = await response.text();
    const sizeBytes = Buffer.byteLength(text, "utf8");

    const data = text
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line));

    return { data, sizeBytes };
  }
}
