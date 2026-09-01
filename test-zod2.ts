import { z } from "zod";

const SandboxActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("run_command"),
    command: z.string(),
  }),
  z.object({
    type: z.literal("done"),
    result: z.string(),
  }),
  z.object({
    type: z.literal("error"),
    message: z.string(),
  }),
]);

try {
  SandboxActionSchema.parse({ type: "error", reasoning: "I failed." });
} catch (e) {
  console.log("error:", e.errors);
}
