import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "rabbit-server",
    timestamp: new Date().toISOString(),
  });
});

const port = 3001;
console.log(`Rabbit server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
