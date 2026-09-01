import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { db } from "./db";
import { tasks } from "./db/schema";
import { tasksRouter } from "./routes/tasks";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

app.onError((err, c) => {
  console.error("HTTP Error:", err);
  return c.json({ error: err.message || "Internal Server Error" }, 500);
});

app.route("/api/tasks", tasksRouter);

app.get("/health", async (c) => {
  db.select().from(tasks).limit(1).all();
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
console.log(`Rabbit Server running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
