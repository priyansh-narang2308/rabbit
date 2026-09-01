import { Hono } from "hono";
import { db } from "../db";
import { tasks } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const tasksRouter = new Hono();

const createTaskSchema = z.object({
  description: z.string().min(1),
  profileId: z.string().optional(),
  proxyCountry: z.string().optional(),
  stealthEnabled: z.boolean().optional().default(true),
  captchaEnabled: z.boolean().optional().default(true),
  recordingEnabled: z.boolean().optional().default(true),
  maxSteps: z.number().int().positive().optional().default(50),
  timeoutMs: z.number().int().positive().optional().default(300_000),
});

tasksRouter.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createTaskSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: "Invalid request payload", details: parsed.error },
      400,
    );
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const [newTask] = await db
    .insert(tasks)
    .values({
      id,
      description: parsed.data.description,
      status: "queued",
      profileId: parsed.data.profileId,
      proxyCountry: parsed.data.proxyCountry,
      stealthEnabled: parsed.data.stealthEnabled,
      captchaEnabled: parsed.data.captchaEnabled,
      recordingEnabled: parsed.data.recordingEnabled,
      maxSteps: parsed.data.maxSteps,
      timeoutMs: parsed.data.timeoutMs,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return c.json(newTask, 201);
});

tasksRouter.get("/", async (c) => {
  const allTasks = await db.query.tasks.findMany({
    orderBy: [desc(tasks.createdAt)],
  });
  return c.json(allTasks);
});

tasksRouter.get("/:id", async (c) => {
  const { id } = c.req.param();
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, id),
    with: {
      runs: {
        orderBy: (runs, { desc }) => [desc(runs.createdAt)],
      },
    },
  });

  if (!task) {
    return c.json({ error: "Task not found" }, 404);
  }

  return c.json(task);
});

tasksRouter.delete("/:id", async (c) => {
  const { id } = c.req.param();
  const result = await db.delete(tasks).where(eq(tasks.id, id)).returning();

  if (result.length === 0) {
    return c.json({ error: "Task not found" }, 404);
  }

  return c.json({ success: true, deletedId: id });
});

export { tasksRouter };
