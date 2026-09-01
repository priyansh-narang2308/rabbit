import { Worker } from "bullmq";
import { db } from "../db";
import { tasks, runs, auditEntries } from "../db/schema";
import { eq } from "drizzle-orm";
import { StorageManager } from "../storage";
import {
  BrowserManager,
  AgentOrchestrator,
  defaultConfig,
  RecordingDownloader,
} from "@rabbit/core";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
};

export const taskWorker = new Worker(
  "agent-tasks",
  async (job) => {
    const { taskId } = job.data;

    const taskRecord = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!taskRecord) {
      throw new Error(`Task ${taskId} not found`);
    }

    const runId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(runs).values({
      id: runId,
      taskId,
      status: "running",
      createdAt: now,
    });

    await db
      .update(tasks)
      .set({ status: "running", startedAt: now })
      .where(eq(tasks.id, taskId));

    const browserManager = new BrowserManager();
    let solariSessionId: string | undefined;

    try {
      const { browser, sessionId } = await browserManager.launchSession({
        profileId: taskRecord.profileId || undefined,
        proxyCountry: taskRecord.proxyCountry || undefined,
        stealth: taskRecord.stealthEnabled ?? true,
        captcha: taskRecord.captchaEnabled ?? true,
        recording: taskRecord.recordingEnabled ?? true,
      });
      solariSessionId = sessionId;

      await db.update(runs).set({ solariSessionId }).where(eq(runs.id, runId));

      const page = await browser.newPage();

      const orchestrator = new AgentOrchestrator(page as any, {
        task: taskRecord.description,
        runId,
        maxSteps: taskRecord.maxSteps || defaultConfig.agent.maxSteps,
        onLog: async (entry: any) => {
          let screenshotPath;
          if (entry.screenshotBase64) {
            screenshotPath = await StorageManager.saveScreenshot(
              runId,
              entry.stepIndex,
              entry.screenshotBase64,
            );
          }

          await db.insert(auditEntries).values({
            id: entry.id,
            runId,
            stepIndex: entry.stepIndex,
            actionType: entry.actionType,
            target: entry.target,
            value: entry.value,
            reasoning: entry.reasoning,
            screenshotPath,
            url: entry.url,
            success: entry.success,
            errorMessage: entry.errorMessage,
            durationMs: entry.durationMs,
            timestamp: entry.timestamp,
          });
        },
      });

      const result = await orchestrator.run();

      const endNow = new Date().toISOString();
      await db
        .update(runs)
        .set({ status: "completed", result, completedAt: endNow })
        .where(eq(runs.id, runId));
      await db
        .update(tasks)
        .set({ status: "completed", result, completedAt: endNow })
        .where(eq(tasks.id, taskId));
    } catch (err: any) {
      const endNow = new Date().toISOString();
      await db
        .update(runs)
        .set({
          status: "failed",
          errorMessage: err.message,
          completedAt: endNow,
        })
        .where(eq(runs.id, runId));
      await db
        .update(tasks)
        .set({
          status: "failed",
          errorMessage: err.message,
          completedAt: endNow,
        })
        .where(eq(tasks.id, taskId));
    } finally {
      await browserManager.cleanup();

      if (solariSessionId && taskRecord.recordingEnabled) {
        try {
          const downloader = new RecordingDownloader();
          // Type cast to any since we just need the ID to satisfy our downloader logic
          const { data } = await downloader.download({
            id: solariSessionId,
          } as any);
          await StorageManager.saveRecording(runId, solariSessionId, data);
        } catch (downloadErr) {
          console.error("Failed to download recording:", downloadErr);
        }
      }
    }
  },
  { connection },
);

taskWorker.on("completed", (job) => {
  console.log(
    `Task ${job.data.taskId} (Job ${job.id}) completed successfully.`,
  );
});

taskWorker.on("failed", (job, err) => {
  console.error(`Task ${job?.data.taskId} (Job ${job?.id}) failed:`, err);
});
