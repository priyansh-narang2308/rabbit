import { Hono } from "hono";
import { db } from "../db";
import { tasks } from "../db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { taskQueue } from "../queue/queue";

const demoRouter = new Hono();

const competitorSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  proxyCountry: z.string().min(2).max(2),
});

const launchPricingSchema = z.object({
  subject: z.string().min(1).default("the selected product"),
  competitors: z.array(competitorSchema).min(1).max(5),
  stealthEnabled: z.boolean().optional().default(true),
  captchaEnabled: z.boolean().optional().default(true),
  recordingEnabled: z.boolean().optional().default(true),
  maxSteps: z.number().int().positive().optional().default(80),
  timeoutMs: z.number().int().positive().optional().default(600_000),
});

/**
 * Build a natural-language task description for the pricing-research demo.
 * The description is what the queue worker uses to detect a multi-env task
 * (browse + sandbox keywords) and what the agent follows to browse each
 * competitor before processing the data in a sandbox.
 */
function buildPricingTaskDescription(opts: {
  subject: string;
  competitors: Array<{
    name: string;
    url: string;
    proxyCountry: string;
  }>;
}): string {
  const siteList = opts.competitors
    .map(
      (c, i) =>
        `${i + 1}. ${c.name} at ${c.url} — browse from a proxy in ${c.proxyCountry.toUpperCase()}`,
    )
    .join("\n");

  return [
    `Research competitor pricing for ${opts.subject}.`,
    `Browse the following competitor pricing pages, each from a different geographic region:`,
    siteList,
    `For each competitor, extract plan name, price, and key features.`,
    `Then process all of the collected pricing data in a sandbox environment and generate a structured comparison table covering every competitor. Return the comparison table as the final result.`,
  ].join("\n\n");
}

demoRouter.post("/pricing-research", async (c) => {
  const body = await c.req.json();
  const parsed = launchPricingSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: "Invalid request payload", details: parsed.error },
      400,
    );
  }

  const { competitors, subject, ...agent } = parsed.data;

  const description = buildPricingTaskDescription({ subject, competitors });

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const [newTask] = await db
    .insert(tasks)
    .values({
      id,
      description,
      status: "queued",
      proxyCountry: competitors[0]?.proxyCountry,
      stealthEnabled: agent.stealthEnabled,
      captchaEnabled: agent.captchaEnabled,
      recordingEnabled: agent.recordingEnabled,
      maxSteps: agent.maxSteps,
      timeoutMs: agent.timeoutMs,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Map the competitors onto browser phase indices so the worker's
  // MultiEnvOrchestrator uses a distinct geo-proxy per competitor page.
  const perPhaseProxyCountry: Record<string, string> = {};
  competitors.forEach((comp, i) => {
    perPhaseProxyCountry[String(i)] = comp.proxyCountry;
  });

  try {
    await taskQueue.add("agent-tasks", {
      taskId: id,
      perPhaseProxyCountry: JSON.parse(JSON.stringify(perPhaseProxyCountry)),
    });
  } catch (err: any) {
    await db
      .update(tasks)
      .set({
        status: "failed",
        errorMessage: err.message,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tasks.id, id));
    return c.json(
      { error: "Demo task could not be enqueued", details: err.message },
      500,
    );
  }

  return c.json({ ...newTask, competitors }, 201);
});

// ── Form Autofill Demo ───────────────────────────────────────────────

const formFieldSchema = z.object({
  selector: z.string().min(1),
  label: z.string().min(1),
  value: z.string(),
});

const formStepSchema = z.object({
  name: z.string().min(1),
  url: z.string().optional(),
  fields: z.array(formFieldSchema).min(1),
  submitSelector: z.string().optional(),
});

const launchFormAutofillSchema = z.object({
  formName: z.string().min(1),
  startUrl: z.string().url(),
  steps: z.array(formStepSchema).min(1).max(10),
  proxyCountry: z.string().min(2).max(2).optional().default("us"),
  stealthEnabled: z.boolean().optional().default(true),
  captchaEnabled: z.boolean().optional().default(true),
  recordingEnabled: z.boolean().optional().default(true),
  maxSteps: z.number().int().positive().optional().default(80),
  timeoutMs: z.number().int().positive().optional().default(600_000),
});

function buildFormAutofillTaskDescription(opts: {
  formName: string;
  startUrl: string;
  steps: Array<{
    name: string;
    url?: string;
    fields: Array<{ selector: string; label: string; value: string }>;
    submitSelector?: string;
  }>;
}): string {
  const stepDescriptions = opts.steps
    .map((step, i) => {
      const fieldList = step.fields
        .map((f) => `  - "${f.label}" → "${f.value}"`)
        .join("\n");
      const submitNote = step.submitSelector
        ? `After filling all fields, click the submit/next button ("${step.submitSelector}").`
        : `After filling all fields, click the submit or next button.`;
      return [
        `Step ${i + 1}: ${step.name}`,
        step.url ? `Navigate to: ${step.url}` : "",
        `Fill the following fields:`,
        fieldList,
        submitNote,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  return [
    `Fill and submit a web form: "${opts.formName}"`,
    ``,
    `Navigate to ${opts.startUrl} and complete the following multi-step form.`,
    `Handle any captchas that appear. Record every field value in the audit trail.`,
    ``,
    stepDescriptions,
    ``,
    `After the final submission, verify that the form was submitted successfully by looking for a confirmation message or page. Report the confirmation text as the final result.`,
  ].join("\n");
}

demoRouter.post("/form-autofill", async (c) => {
  const body = await c.req.json();
  const parsed = launchFormAutofillSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: "Invalid request payload", details: parsed.error },
      400,
    );
  }

  const { formName, startUrl, steps, proxyCountry, ...agent } = parsed.data;

  const description = buildFormAutofillTaskDescription({
    formName,
    startUrl,
    steps,
  });

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const [newTask] = await db
    .insert(tasks)
    .values({
      id,
      description,
      status: "queued",
      proxyCountry,
      stealthEnabled: agent.stealthEnabled,
      captchaEnabled: agent.captchaEnabled,
      recordingEnabled: agent.recordingEnabled,
      maxSteps: agent.maxSteps,
      timeoutMs: agent.timeoutMs,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  try {
    await taskQueue.add("agent-tasks", { taskId: id });
  } catch (err: any) {
    await db
      .update(tasks)
      .set({
        status: "failed",
        errorMessage: err.message,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tasks.id, id));
    return c.json(
      { error: "Demo task could not be enqueued", details: err.message },
      500,
    );
  }

  return c.json({ ...newTask, formName, steps }, 201);
});

// ── Persistent Identity Demo ─────────────────────────────────────────

import { profiles } from "../db/schema";

const launchIdentitySchema = z.object({
  url: z.string().url(),
  username: z.string().min(1),
  password: z.string().min(1),
  stealthEnabled: z.boolean().optional().default(true),
  captchaEnabled: z.boolean().optional().default(true),
  recordingEnabled: z.boolean().optional().default(true),
  maxSteps: z.number().int().positive().optional().default(80),
  timeoutMs: z.number().int().positive().optional().default(600_000),
});

function buildPersistentIdentityTaskDescription(opts: {
  url: string;
  username: string;
  password: string;
  profileId: string;
}): string {
  return [
    `Demonstrate multi-session persistent identity using profile: ${opts.profileId}`,
    ``,
    `Phase 1 (Initial Login Session):`,
    `Navigate to ${opts.url}. Find the login form and authenticate using username: "${opts.username}" and password: "${opts.password}". Wait for the login to succeed and verify you are on the authenticated dashboard or logged-in state. Report success.`,
    ``,
    `Phase 2 (Follow-up Session):`,
    `Navigate to ${opts.url} again. Verify that you are ALREADY logged in (do not enter credentials again). Perform a simple authenticated action (like viewing profile details or adding an item to a cart) to prove the session persisted. Report the final success state.`,
  ].join("\n");
}

demoRouter.post("/persistent-identity", async (c) => {
  const body = await c.req.json();
  const parsed = launchIdentitySchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: "Invalid request payload", details: parsed.error },
      400,
    );
  }

  const { url, username, password, ...agent } = parsed.data;

  // Generate a dedicated profile just for this demo run
  const profileId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(profiles).values({
    id: profileId,
    name: `Demo Profile - ${username}`,
    description: "Temporary profile created for the persistent identity demo",
    createdAt: now,
    updatedAt: now,
  });

  const description = buildPersistentIdentityTaskDescription({
    url,
    username,
    password,
    profileId,
  });

  const taskId = crypto.randomUUID();

  const [newTask] = await db
    .insert(tasks)
    .values({
      id: taskId,
      description,
      status: "queued",
      profileId,
      proxyCountry: "us",
      stealthEnabled: agent.stealthEnabled,
      captchaEnabled: agent.captchaEnabled,
      recordingEnabled: agent.recordingEnabled,
      maxSteps: agent.maxSteps,
      timeoutMs: agent.timeoutMs,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  try {
    await taskQueue.add("agent-tasks", { taskId });
  } catch (err: any) {
    await db
      .update(tasks)
      .set({
        status: "failed",
        errorMessage: err.message,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tasks.id, taskId));
    return c.json(
      { error: "Demo task could not be enqueued", details: err.message },
      500,
    );
  }

  return c.json({ ...newTask, profileId }, 201);
});

export { demoRouter, buildPricingTaskDescription, buildFormAutofillTaskDescription, buildPersistentIdentityTaskDescription };
