/**
 * Shared Ollama API helper for Rabbit agent models.
 */

export const OLLAMA_BASE_URL = "http://127.0.0.1:11434/v1";

// Vision-capable model (browser screenshot + DOM)
const VISION_MODEL = "llava";
// Text-only model for the sandbox / multi-env planners (cheaper + faster)
const TEXT_MODEL = "qwen3.5:2b";

export interface OllamaRequest {
  /** OpenAI-style chat messages. */
  messages: any[];
  /** Model ID. Defaults based on whether vision is used. */
  model?: string;
  /** API key. Not needed for local Ollama, but kept for interface parity. */
  apiKey?: string;
  /** Maximum completion tokens. */
  maxTokens?: number;
  /** Temperature. */
  temperature?: number;
  /** Whether the request includes image parts (use vision model default). */
  vision?: boolean;
}

function resolveModel(model: string | undefined, vision: boolean): string {
  if (model) return model;
  return vision ? VISION_MODEL : TEXT_MODEL;
}

/**
 * Call the Ollama chat completions endpoint and return the raw content string.
 */
export async function ollamaChat(opts: OllamaRequest): Promise<string> {
  const model = resolveModel(opts.model, opts.vision ?? false);

  const body: Record<string, any> = {
    model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.1,
  };
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;

  // Ollama supports OpenAI JSON mode
  body.response_format = { type: "json_object" };

  const response = await fetch(`${OLLAMA_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Ollama API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return extractOllamaContent(data);
}

function extractOllamaContent(data: any): string {
  const message = data.choices?.[0]?.message;
  if (!message) {
    throw new Error(
      `No message in Ollama response. Full response: ${JSON.stringify(data.choices ?? data)}`,
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

  throw new Error(
    `No extractable content in Ollama response. Full message: ${JSON.stringify(message)}`,
  );
}

/** Strip markdown fences and return possible JSON containing the given key. */
export function extractJson(content: string, requiredKey?: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const trimmed = (fenced ? fenced[1] : content).trim();

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

  if (typeof value.type === "string" && types.includes(value.type)) {
    return value;
  }

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

export function parseAction<T = any>(
  content: string,
  knownTypes: readonly string[] = KNOWN_ACTION_TYPES,
): T {
  let parsed: any;
  try {
    parsed = JSON.parse(extractJson(content));
  } catch {
    return { type: "error", message: `Unparseable model output: ${content}` } as T;
  }

  const action = findActionObject(parsed, knownTypes);
  if (action) return action as T;

  return {
    type: "error",
    message: `Model returned no valid action. Raw: ${JSON.stringify(parsed)}`,
  } as T;
}
