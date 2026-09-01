import { z } from "zod";
export const ActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("navigate"),
    url: z.string(),
  }),
  z.object({
    type: z.literal("error"),
    message: z.string(),
  }),
]);

try {
  ActionSchema.parse({ foo: "bar" });
} catch (e) {
  console.log("missing type:", JSON.stringify(e.errors, null, 2));
}

try {
  ActionSchema.parse(null);
} catch (e) {
  console.log("null:", JSON.stringify(e.errors, null, 2));
}
