import OpenAI from "openai";

export interface NineRouterConfig {
  url: string;
  key: string;
}

/** Build an OpenAI-compatible client pointed at 9Router. */
export function getOpenAI(cfg: NineRouterConfig): OpenAI {
  const baseURL = `${cfg.url.replace(/\/+$/, "")}/v1`;
  return new OpenAI({
    baseURL,
    apiKey: cfg.key || "not-needed",
    timeout: 180_000,
    maxRetries: 1,
  });
}

export interface ChatOptions {
  model: string;
  user: string;
  system?: string;
  temperature?: number;
}

export interface ChatResponse {
  text: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}

/** Single-turn chat completion. */
export async function chat(
  cfg: NineRouterConfig,
  opts: ChatOptions,
): Promise<ChatResponse> {
  const client = getOpenAI(cfg);
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: opts.user });

  const res = await client.chat.completions.create({
    model: opts.model,
    messages,
    temperature: opts.temperature ?? 0.7,
  });

  return {
    text: res.choices?.[0]?.message?.content ?? "",
    model: res.model ?? opts.model,
    promptTokens: res.usage?.prompt_tokens ?? 0,
    completionTokens: res.usage?.completion_tokens ?? 0,
  };
}

/** Extract the first JSON value found in a model response. */
export function extractJson<T>(raw: string): T {
  let s = raw.trim();
  s = s
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(s) as T;
  } catch {
    // fall through to bracket slicing
  }

  const start = s.search(/[[{]/);
  const end = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  if (start !== -1 && end !== -1 && end > start) {
    return JSON.parse(s.slice(start, end + 1)) as T;
  }

  throw new Error("No JSON found in model output");
}

/** List available model ids from 9Router (used to test a connection). */
export async function listModels(cfg: NineRouterConfig): Promise<string[]> {
  const client = getOpenAI(cfg);
  const models = await client.models.list();
  return models.data.map((m) => m.id);
}

/** Generate embeddings; returns one vector per input string. */
export async function embed(
  cfg: NineRouterConfig,
  model: string,
  input: string[],
): Promise<number[][]> {
  const client = getOpenAI(cfg);
  const res = await client.embeddings.create({ model, input });
  return res.data.map((d) => d.embedding as number[]);
}

/** Cosine similarity between two vectors (0..1 range for similar magnitudes). */
export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
