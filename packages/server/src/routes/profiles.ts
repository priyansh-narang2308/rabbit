import { Hono } from "hono";
import { db } from "../db";
import { profiles } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

import { ProfileManager } from "@rabbit/core";

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

  try {
    // 1. Create the remote profile in Solari first
    const profileManager = new ProfileManager();
    const solariProfile = await profileManager.createProfile();

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // 2. Save mapping to local database
    const [newProfile] = await db
      .insert(profiles)
      .values({
        id,
        name: parsed.data.name,
        description: parsed.data.description,
        solariProfileId: solariProfile.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return c.json(newProfile, 201);
  } catch (error: any) {
    return c.json({ error: "Failed to create remote profile", details: error.message }, 500);
  }
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
  
  // 1. Get the profile to find the solariProfileId
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, id),
  });

  if (!profile) {
    return c.json({ error: "Profile not found" }, 404);
  }

  try {
    // 2. Delete the remote profile if it exists
    if (profile.solariProfileId) {
      const profileManager = new ProfileManager();
      await profileManager.deleteProfile(profile.solariProfileId);
    }
    
    // 3. Delete from our database
    await db.delete(profiles).where(eq(profiles.id, id));

    return c.json({ success: true, deletedId: id });
  } catch (error: any) {
    return c.json({ error: "Failed to delete remote profile", details: error.message }, 500);
  }
});

export { profilesRouter };
