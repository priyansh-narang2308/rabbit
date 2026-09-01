import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// Profiles — Persistent agent identities backed by Solari browser profiles.
//
// A profile stores cookies + localStorage server-side. Attach it with
// `profileId` and the browser starts already logged in.
// ─────────────────────────────────────────────────────────────────────────────

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(), // UUID
  name: text("name").notNull(), // Human-readable label
  solariProfileId: text("solari_profile_id"), // Solari's remote profile ID
  description: text("description"), // What this identity is for
  sessionCount: integer("session_count").default(0), // How many times used
  lastUsedAt: text("last_used_at"), // ISO timestamp
  createdAt: text("created_at").notNull(), // ISO timestamp
  updatedAt: text("updated_at").notNull(), // ISO timestamp
});

// ─────────────────────────────────────────────────────────────────────────────
// Tasks — User-submitted agent objectives.
//
// A task is a natural language instruction like "Book the cheapest flight
// from SFO to JFK next Friday on United." Each task can have multiple runs
// (retries, re-executions).
// ─────────────────────────────────────────────────────────────────────────────

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(), // UUID
  description: text("description").notNull(), // Natural language task
  status: text("status", {
    enum: ["queued", "running", "completed", "failed", "cancelled"],
  })
    .notNull()
    .default("queued"),

  // Solari configuration for this task
  profileId: text("profile_id").references(() => profiles.id), // Agent identity
  proxyCountry: text("proxy_country").default("us"), // Residential proxy geo
  stealthEnabled: integer("stealth_enabled", { mode: "boolean" }).default(true),
  captchaEnabled: integer("captcha_enabled", { mode: "boolean" }).default(true),
  recordingEnabled: integer("recording_enabled", { mode: "boolean" }).default(
    true,
  ),

  // Agent configuration
  maxSteps: integer("max_steps").default(50),
  timeoutMs: integer("timeout_ms").default(300000), // 5 minutes default

  // Results
  result: text("result"), // Final agent output (JSON)
  errorMessage: text("error_message"), // If failed, why

  // Timestamps
  createdAt: text("created_at").notNull(), // ISO timestamp
  updatedAt: text("updated_at").notNull(), // ISO timestamp
  startedAt: text("started_at"), // When execution began
  completedAt: text("completed_at"), // When execution finished
});

// ─────────────────────────────────────────────────────────────────────────────
// Runs — Individual execution attempts of a task.
//
// A task may be retried or re-executed, producing multiple runs. Each run
// maps to exactly one Solari browser session (and its recording).
// ─────────────────────────────────────────────────────────────────────────────

export const runs = sqliteTable("runs", {
  id: text("id").primaryKey(), // UUID
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),

  status: text("status", {
    enum: ["running", "completed", "failed", "cancelled"],
  })
    .notNull()
    .default("running"),

  // Solari session tracking
  solariSessionId: text("solari_session_id"), // Solari's session ID
  solariEnvironment: text("solari_environment", {
    // Which Solari primitive
    enum: ["browser", "desktop", "sandbox"],
  }).default("browser"),

  // Execution metrics
  totalSteps: integer("total_steps").default(0), // How many actions taken
  currentUrl: text("current_url"), // Last URL the agent was on
  durationMs: integer("duration_ms"), // Total execution time

  // Results
  result: text("result"), // Final output (JSON)
  errorMessage: text("error_message"),

  // Timestamps
  createdAt: text("created_at").notNull(),
  completedAt: text("completed_at"),
});

// ─────────────────────────────────────────────────────────────────────────────
// Audit Entries — Every single action the agent performed.
//
// This is the core of Rabbit's value proposition. Each row is one atomic
// agent action: a click, a navigation, a keystroke, an evaluation. Together
// they form the immutable, replayable audit trail.
// ─────────────────────────────────────────────────────────────────────────────

export const auditEntries = sqliteTable("audit_entries", {
  id: text("id").primaryKey(), // UUID
  runId: text("run_id")
    .notNull()
    .references(() => runs.id, { onDelete: "cascade" }),
  stepIndex: integer("step_index").notNull(), // Ordered step number

  // What the agent did
  actionType: text("action_type", {
    enum: [
      "navigate", // page.goto(url)
      "click", // page.click(selector)
      "type", // page.fill(selector, value)
      "scroll", // page.scroll
      "evaluate", // page.evaluate(script)
      "screenshot", // page.screenshot()
      "wait", // explicit wait / sleep
      "extract", // data extraction from page
      "captcha", // captcha was detected and solved
      "error", // something went wrong
      "done", // agent decided task is complete
    ],
  }).notNull(),

  // Action details
  target: text("target"), // CSS selector or URL
  value: text("value"), // Input value or extracted data
  reasoning: text("reasoning"), // LLM's explanation for this action

  // Evidence
  screenshotPath: text("screenshot_path"), // Path to screenshot file
  url: text("url"), // Page URL at time of action
  domSnapshotHash: text("dom_snapshot_hash"), // Hash of DOM state

  // Outcome
  success: integer("success", { mode: "boolean" }), // Did the action succeed?
  errorMessage: text("error_message"), // If failed, why
  durationMs: integer("duration_ms"), // How long this step took

  // Timestamp
  timestamp: text("timestamp").notNull(), // ISO timestamp
});

// ─────────────────────────────────────────────────────────────────────────────
// Recordings — Solari session recordings (rrweb replays).
//
// Each recording is an rrweb NDJSON capture of everything the agent did in
// the browser — DOM-level fidelity, not a video. This is the proof.
// ─────────────────────────────────────────────────────────────────────────────

export const recordings = sqliteTable("recordings", {
  id: text("id").primaryKey(), // UUID
  runId: text("run_id")
    .notNull()
    .references(() => runs.id, { onDelete: "cascade" }),

  // Solari recording data
  solariSessionId: text("solari_session_id").notNull(), // Source session
  replayUrl: text("replay_url"), // Solari-hosted replay URL
  localPath: text("local_path"), // Local NDJSON file path

  // Metadata
  sizeBytes: integer("size_bytes"), // Recording file size
  eventCount: integer("event_count"), // Number of rrweb events
  durationMs: integer("duration_ms"), // Recording duration

  // Processing status
  status: text("status", {
    enum: ["pending", "downloading", "processing", "ready", "failed"],
  })
    .notNull()
    .default("pending"),

  // Timestamps
  createdAt: text("created_at").notNull(),
  processedAt: text("processed_at"),
});

// ─────────────────────────────────────────────────────────────────────────────
// Relations — Drizzle relational queries.
// ─────────────────────────────────────────────────────────────────────────────

export const profilesRelations = relations(profiles, ({ many }) => ({
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [tasks.profileId],
    references: [profiles.id],
  }),
  runs: many(runs),
}));

export const runsRelations = relations(runs, ({ one, many }) => ({
  task: one(tasks, {
    fields: [runs.taskId],
    references: [tasks.id],
  }),
  auditEntries: many(auditEntries),
  recording: one(recordings),
}));

export const auditEntriesRelations = relations(auditEntries, ({ one }) => ({
  run: one(runs, {
    fields: [auditEntries.runId],
    references: [runs.id],
  }),
}));

export const recordingsRelations = relations(recordings, ({ one }) => ({
  run: one(runs, {
    fields: [recordings.runId],
    references: [runs.id],
  }),
}));
