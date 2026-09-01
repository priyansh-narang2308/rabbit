import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";

export const errorHandler = async (err: Error, c: Context) => {
  console.error(`[Error] ${c.req.method} ${c.req.url} - ${err.message}`);

  if (err instanceof HTTPException) {
    return c.json(
      {
        error: err.message,
        status: err.status,
      },
      err.status,
    );
  }

  if (err instanceof ZodError) {
    return c.json(
      {
        error: "Validation Error",
        details: err.format(),
      },
      400,
    );
  }

  if (
    err.message.toLowerCase().includes("solari") ||
    err.name === "SolariApiError"
  ) {
    const isRateLimit = err.message.toLowerCase().includes("rate limit") || err.message.includes("429");
    return c.json(
      {
        error: "Upstream Solari Error",
        details: err.message,
      },
      isRateLimit ? 429 : 502,
    );
  }

  return c.json(
    {
      error: "Internal Server Error",
      details: process.env.NODE_ENV === "development" ? err.stack : undefined,
    },
    500,
  );
};
