import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { Redis } from "ioredis";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
};

export const eventsRouter = new Hono();

eventsRouter.get("/:taskId", (c) => {
  const { taskId } = c.req.param();

  return streamSSE(c, async (stream: any) => {
    const sub = new Redis(connection);
    const channel = `task-events:${taskId}`;

    sub.subscribe(channel, (err) => {
      if (err) {
        console.error("Redis Subscribe Error:", err);
      }
    });

    sub.on("message", (ch, message) => {
      if (ch === channel) {
        stream.writeSSE({
          data: message,
          event: "step",
        });
      }
    });

    c.req.raw.signal.addEventListener("abort", () => {
      sub.disconnect();
    });

    while (!c.req.raw.signal.aborted) {
      await stream.writeSSE({ data: "ping", event: "ping" });
      await stream.sleep(15000);
    }
  });
});
