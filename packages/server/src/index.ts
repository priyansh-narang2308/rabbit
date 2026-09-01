import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { db } from "./db";
import { tasks } from "./db/schema";
import { tasksRouter } from "./routes/tasks";
import { runsRouter } from "./routes/runs";
import { profilesRouter } from "./routes/profiles";
import { demoRouter } from "./routes/demo";
import { eventsRouter } from "./queue/events";
import { statusRouter } from "./routes/status";
import { errorHandler } from "./middleware/error-handler";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

app.onError(errorHandler);

app.route("/api/tasks", tasksRouter);
app.route("/api/runs", runsRouter);
app.route("/api/profiles", profilesRouter);
app.route("/api/demo", demoRouter);
app.route("/api/events", eventsRouter);
app.route("/api", statusRouter);

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
console.log(`Rabbit Server running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
