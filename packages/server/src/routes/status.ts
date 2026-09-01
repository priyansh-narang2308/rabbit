import { Hono } from "hono";
import { db } from "../db";
import { tasks, runs } from "../db/schema";
import { eq } from "drizzle-orm";
import { Queue } from "bullmq";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
};

const taskQueue = new Queue("agent-tasks", { connection });
const statusRouter = new Hono();

statusRouter.get("/health", async (c) => {
  try {
    db.select().from(tasks).limit(1).all();
    const client: any = await taskQueue.client;
    await client.ping();
    return c.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (err) {
    return c.json(
      { status: "error", error: "Database or Redis unreachable" },
      503,
    );
  }
});

statusRouter.get("/status", async (c) => {
  const queueDepth = await taskQueue.count();
  const activeJobs = await taskQueue.getActiveCount();
  const waitingJobs = await taskQueue.getWaitingCount();

  const allRuns = await db.query.runs.findMany();
  
  const activeRuns = allRuns.filter(r => r.status === "running");
  const completedRuns = allRuns.filter(r => r.status === "completed");
  const failedRuns = allRuns.filter(r => r.status === "failed");
  
  const finishedRunsCount = completedRuns.length + failedRuns.length;
  const successRate = finishedRunsCount > 0 
    ? ((completedRuns.length / finishedRunsCount) * 100).toFixed(1)
    : 0;

  return c.json({
    system: "ok",
    queue: {
      total: queueDepth,
      active: activeJobs,
      waiting: waitingJobs,
    },
    activeSessions: activeRuns.length,
    completedRuns: completedRuns.length,
    totalRuns: allRuns.length,
    successRate: parseFloat(successRate.toString()),
    timestamp: new Date().toISOString(),
  });
});

export { statusRouter };
