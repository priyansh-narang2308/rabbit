import { z } from "zod";
export const ActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("navigate"),
    url: z.string(),
    reasoning: z.string().default(""),
  }),
  z.object({
    type: z.literal("done"),
    result: z.string(),
    reasoning: z.string().default(""),
  }),
  z.object({
    type: z.literal("error"),
    message: z.string(),
    reasoning: z.string().default(""),
  }),
]);

try {
  ActionSchema.parse({ type: "navigate" });
} catch (e) {
  console.log("navigate:", JSON.stringify(e.errors, null, 2));
}

try {
  ActionSchema.parse({ type: "error", message: "foo" });
  console.log("error valid: success");
} catch (e) {
  console.log("error valid:", JSON.stringify(e.errors, null, 2));
}

try {
  ActionSchema.parse({ type: "error" });
} catch (e) {
  console.log("error missing field:", JSON.stringify(e.errors, null, 2));
}
