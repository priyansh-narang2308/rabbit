import { db } from "../db";
import { recordings } from "../db/schema";
import { eq } from "drizzle-orm";
import fs from "node:fs/promises";

export class ReplayManager {
  static async getReplayData(runId: string): Promise<any[]> {
    const record = await db.query.recordings.findFirst({
      where: eq(recordings.runId, runId),
    });

    if (!record) {
      throw new Error(`No recording found for run ${runId}`);
    }

    if (record.localPath) {
      try {
        const content = await fs.readFile(record.localPath, "utf8");
        return content
          .split("\n")
          .filter(Boolean)
          .map((l) => JSON.parse(l));
      } catch (err) {
        console.warn(`Failed to read local replay data:`, err);
      }
    }

    if (record.replayUrl) {
      console.log(`Falling back to hosted replay URL: ${record.replayUrl}`);
      const res = await fetch(record.replayUrl);
      if (!res.ok) {
        throw new Error("Remote replay expired or unavailable");
      }
      const text = await res.text();
      return text
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l));
    }

    throw new Error("Recording exists but no data source available");
  }
}
