import { Hono } from "hono";
import { db } from "../db";
import { profiles } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const profilesRouter = new Hono();

const createProfileSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

profilesRouter.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createProfileSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: "Invalid payload", details: parsed.error },
      400,
    );
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const [newProfile] = await db
    .insert(profiles)
    .values({
      id,
      name: parsed.data.name,
      description: parsed.data.description,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return c.json(newProfile, 201);
});

profilesRouter.get("/", async (c) => {
  const allProfiles = await db.query.profiles.findMany({
    orderBy: [desc(profiles.createdAt)],
  });
  return c.json(allProfiles);
});

profilesRouter.get("/:id", async (c) => {
  const { id } = c.req.param();
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, id),
  });

  if (!profile) {
    return c.json({ error: "Profile not found" }, 404);
  }

  return c.json(profile);
});

profilesRouter.delete("/:id", async (c) => {
  const { id } = c.req.param();
  const result = await db
    .delete(profiles)
    .where(eq(profiles.id, id))
    .returning();

  if (result.length === 0) {
    return c.json({ error: "Profile not found" }, 404);
  }

  return c.json({ success: true, deletedId: id });
});

export { profilesRouter };
