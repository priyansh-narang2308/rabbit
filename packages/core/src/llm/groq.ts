/**
 * Shared Groq API helper for Rabbit agent models.
 *
 * All planners/evaluators send their requests through this module so we have a
 * single place to enforce:
 *   - Groq-compatible model IDs and endpoint
 *   - Disabling Qwen-style tool-calling / reasoning so models emit JSON content
 *   - Robust JSON extraction from message.content, reasoning, and tool_calls
 */

export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

// Vision-capable model (browser screenshot + DOM)
const VISION_MODEL = "qwen/qwen3.8-27b";
// Text-only model for the sandbox / multi-env planners (cheaper + faster)
const TEXT_MODEL = "openai/gpt-oss-120b";

export interface GroqRequest {
  /** OpenAI-style chat messages. */
  messages: any[];
  /** Groq model ID. Defaults based on whether vision is used. */
  model?: string;
  /** API key. Defaults to GROQ_API_KEY env or the shared dev key. */
  apiKey?: string;
  /** Maximum completion tokens. */
  maxTokens?: number;
  /** Temperature. */
  temperature?: number;
  /** Whether the request includes image parts (use vision model default). */
  vision?: boolean;
}

export function resolveGroqKey(apiKey?: string): string {
  return (
    apiKey ||
    process.env.GROQ_API_KEY ||
    process.env.GROQ_KEY ||
    "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"
  );
}

function resolveModel(model: string | undefined, vision: boolean): string {
  if (model) return model;
  return vision ? VISION_MODEL : TEXT_MODEL;
}

/**
 * Call the Groq chat completions endpoint and return the raw content string.
 * If the model returned content inside `reasoning` or `tool_calls`, that is
 * recovered here before JSON parsing.
 */
export async function groqChat(opts: GroqRequest): Promise<string> {
  const apiKey = resolveGroqKey(opts.apiKey);
  const model = resolveModel(opts.model, opts.vision ?? false);

  const body: Record<string, any> = {
    model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.1,
  };
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;

  // Disable tool-calling / reasoning so the model emits direct JSON answers.
  // Groq models differ in what `reasoning_effort` values they accept:
  //   - openai/gpt-oss-*      : accepts low|medium|high (medium default)
  //   - qwen/qwen3.6-27b      : accepts none|low|medium|high
  //   - qwen/qwen3.8-27b      : ONLY accepts low|medium|high (default is none)
  // We only send the field when the value is valid for the model.
  const isQwen38 = /^qwen\/qwen3\.8/i.test(model);
  const isGptOss = model.startsWith("openai/gpt-oss");
  if (isGptOss) {
    body.reasoning_effort = "low";
    // GPT-OSS is fully OpenAI-compatible and reliably honors response_format.
    body.tools = [];
    body.tool_choice = "none";
  } else if (!isQwen38) {
    // qwen3.6 accepts "none"; qwen3.8 defaults to none so we skip the field.
    body.reasoning_effort = "none";
  }

  // Ask the model for structured JSON. NOTE: some Groq models ignore this and
  // call tools anyway; we recover those below.
  body.response_format = { type: "json_object" };

  const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/priyansh-narang2308/rabbit",
      "X-Title": "Rabbit",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return extractGroqContent(data);
}

/**
 * Extract the best-available text from a Groq chat completion response.
 * Handles:
 *   - normal `message.content`
 *   - `message.reasoning` (Qwen3 reasoning content)
 *   - `message.tool_calls` -> the tool call's JSON arguments
 *   - messages with all-null content
 */
function extractGroqContent(data: any): string {
  const message = data.choices?.[0]?.message;
  if (!message) {
    throw new Error(
      `No message in Groq response. Full response: ${JSON.stringify(data.choices ?? data)}`,
    );
  }

  if (typeof message.content === "string" && message.content.trim()) {
    return message.content;
  }

  if (Array.isArray(message.content)) {
    const text = message.content
      .filter((c: any) => c?.type === "text")
      .map((c: any) => c?.text)
      .filter(Boolean)
      .join("\n");
    if (text.trim()) return text;
  }

  if (typeof message.reasoning === "string" && message.reasoning.trim()) {
    return message.reasoning;
  }

  if (Array.isArray(message.tool_calls) && message.tool_calls.length) {
    const args = message.tool_calls
      .map((t: any) => t?.function?.arguments)
      .filter(Boolean)
      .join("\n");
    if (args.trim()) return args;
  }

  throw new Error(
    `No extractable content in Groq response. Full message: ${JSON.stringify(message)}`,
  );
}

/** Strip markdown fences and return possible JSON containing the given key. */
export function extractJson(content: string, requiredKey?: string): string {
  // Strip fenced code blocks.
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const trimmed = (fenced ? fenced[1] : content).trim();

  // Try to find the outermost JSON object.
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return trimmed;
}

/** Parse a JSON string into an object, ignoring surrounding prose. */
export function parseJsonObject<T = any>(content: string, requiredKey?: string): T {
  const candidate = extractJson(content, requiredKey);
  return JSON.parse(candidate) as T;
}

/**
 * Recursively search a value for the first object whose data has a `type` that
 * matches a known browser action. Some models wrap their action (e.g. inside a
 * reasoning object or an array), which the strict discriminated-union schema
 * rejects. This lets us recover the real action from the noise.
 */
const KNOWN_ACTION_TYPES = [
  "navigate",
  "click",
  "type",
  "scroll",
  "evaluate",
  "wait",
  "extract",
  "done",
  "error",
];

function findActionObject(value: any, types: readonly string[], depth = 0): any {
  if (depth > 6 || value == null) return undefined;
  if (typeof value !== "object") return undefined;

  // If this object already looks like an action, return it.
  if (typeof value.type === "string" && types.includes(value.type)) {
    return value;
  }

  // Some models use `action` (or `actionType`, `name`) as the discriminator
  // key instead of `type`, e.g. {"action":"navigate","url":...}. Normalize it.
  const key = value.action ?? value.actionType ?? value.name;
  if (typeof key === "string" && types.includes(key)) {
    return { ...value, type: key };
  }

  for (const k of Object.keys(value)) {
    const child = value[k];
    const found = findActionObject(child, types, depth + 1);
    if (found) return found;
  }
  return undefined;
}

/**
 * Parse an LLM response into an action, recovering from models that wrap their
 * action in reasoning objects, arrays, extra fields, or use a discriminator
 * key other than `type`. `knownTypes` defaults to the browser action set.
 */
export function parseAction<T = any>(
  content: string,
  knownTypes: readonly string[] = KNOWN_ACTION_TYPES,
): T {
  let parsed: any;
  try {
    parsed = JSON.parse(extractJson(content));
  } catch {
    // Not parseable JSON; let the caller surface an error action.
    return { type: "error", message: `Unparseable model output: ${content}` } as T;
  }

  const action = findActionObject(parsed, knownTypes);
  if (action) return action as T;

  // No recognizable action. Return an error carrying the raw output so the
  // caller can inspect it rather than crashing the whole demo.
  return {
    type: "error",
    message: `Model returned no valid action. Raw: ${JSON.stringify(parsed)}`,
  } as T;
}
