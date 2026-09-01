import { z } from "zod";
const SandboxActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("run_command"),
    command: z.string(),
  }),
  z.object({
    type: z.literal("error"),
    message: z.string(),
  }),
]);

const fallback = {
  type: "error",
  message: `Model returned no valid action. Raw: foo`,
};

console.log(fallback);
try {
  SandboxActionSchema.parse(fallback);
  console.log("Success!");
} catch (e) {
  console.log("Error:", JSON.stringify(e.errors, null, 2));
}
