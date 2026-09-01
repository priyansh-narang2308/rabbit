import { Queue } from "bullmq";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
};

export const taskQueue = new Queue("agent-tasks", { connection });

export async function enqueueTask(taskId: string): Promise<void> {
  await taskQueue.add("agent-tasks", { taskId });
}
