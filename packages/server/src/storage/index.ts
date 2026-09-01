import fs from "node:fs/promises";
import path from "node:path";
import { db } from "../db";
import { recordings } from "../db/schema";
import { eq } from "drizzle-orm";

const DATA_DIR = path.join(process.cwd(), "data");
const SCREENSHOTS_DIR = path.join(DATA_DIR, "screenshots");
const RECORDINGS_DIR = path.join(DATA_DIR, "recordings");

export class StorageManager {
  static async init() {
    await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
    await fs.mkdir(RECORDINGS_DIR, { recursive: true });
  }

  static async saveScreenshot(
    runId: string,
    stepIndex: number,
    base64Data: string,
  ): Promise<string> {
    const runDir = path.join(SCREENSHOTS_DIR, runId);
    await fs.mkdir(runDir, { recursive: true });

    const buffer = Buffer.from(base64Data, "base64");
    const filePath = path.join(runDir, `${stepIndex}.png`);
    await fs.writeFile(filePath, buffer);

    // Return relative path for web serving (e.g. /data/screenshots/runId/1.png)
    return `/data/screenshots/${runId}/${stepIndex}.png`;
  }

  static async saveRecording(
    runId: string,
    solariSessionId: string,
    ndjsonData: any[],
  ): Promise<string> {
    const filePath = path.join(RECORDINGS_DIR, `${runId}.ndjson`);
    const content = ndjsonData.map((e) => JSON.stringify(e)).join("\n");
    const sizeBytes = Buffer.byteLength(content, "utf8");

    await fs.writeFile(filePath, content, "utf8");

    // Persist to DB
    await db.insert(recordings).values({
      id: crypto.randomUUID(),
      runId,
      solariSessionId,
      localPath: filePath,
      sizeBytes,
      eventCount: ndjsonData.length,
      status: "ready",
      createdAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
    });

    return filePath;
  }
}
