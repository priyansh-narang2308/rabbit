import { Hono } from "hono";
import { db } from "../db";
import { runs } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { ReplayManager } from "../storage/replay-url";

const runsRouter = new Hono();

runsRouter.get("/", async (c) => {
  const allRuns = await db.query.runs.findMany({
    orderBy: [desc(runs.createdAt)],
    with: {
      task: true,
    },
  });
  return c.json(allRuns);
});

runsRouter.get("/:id", async (c) => {
  const { id } = c.req.param();
  const run = await db.query.runs.findFirst({
    where: eq(runs.id, id),
    with: {
      task: true,
      recording: true,
      auditEntries: {
        orderBy: (entries, { asc }) => [asc(entries.stepIndex)],
      },
    },
  });

  if (!run) {
    return c.json({ error: "Run not found" }, 404);
  }

  return c.json(run);
});

runsRouter.get("/:id/replay", async (c) => {
  const { id } = c.req.param();
  try {
    const replayData = await ReplayManager.getReplayData(id);
    return c.json({ data: replayData });
  } catch (error: any) {
    return c.json(
      { error: "Failed to retrieve replay data", details: error.message },
      404,
    );
  }
});

export { runsRouter };
