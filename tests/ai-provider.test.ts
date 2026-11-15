import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { getAiProvider, aiSetupHint } from "@/lib/ai/provider";
import { callStructured } from "@/lib/ai/client";
import { extractJson } from "@/lib/ai/openai-compatible";

const KEYS = ["AI_PROVIDER", "ANTHROPIC_API_KEY", "XAI_API_KEY", "GROK_API_KEY", "GROQ_API_KEY", "AI_MODEL_ANALYZE", "AI_MODEL_ASSIST", "AI_BASE_URL", "ANTHROPIC_MODEL_ANALYZE"];
const setEnv = (vars: Record<string, string>) => {
  for (const k of KEYS) vi.stubEnv(k, "");
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("getAiProvider", () => {
  it("is null with no keys", () => {
    setEnv({});
    expect(getAiProvider()).toBeNull();
  });
  it("picks the first key present: Anthropic, then xAI, then Groq", () => {
    setEnv({ GROQ_API_KEY: "g", XAI_API_KEY: "x" });
    expect(getAiProvider()?.id).toBe("xai");
    setEnv({ GROQ_API_KEY: "g" });
    const p = getAiProvider()!;
    expect(p).toMatchObject({ id: "groq", label: "Groq", baseUrl: "https://api.groq.com/openai/v1" });
  });
  it("accepts GROK_API_KEY as an alias for xAI", () => {
    setEnv({ GROK_API_KEY: "k" });
    expect(getAiProvider()).toMatchObject({ id: "xai", apiKey: "k", baseUrl: "https://api.x.ai/v1" });
  });
  it("honours AI_PROVIDER and model overrides", () => {
    setEnv({ AI_PROVIDER: "groq", ANTHROPIC_API_KEY: "a", GROQ_API_KEY: "g", AI_MODEL_ANALYZE: "my-model" });
    expect(getAiProvider()).toMatchObject({ id: "groq", models: { analyze: "my-model", assist: "openai/gpt-oss-120b" } });
  });
  it("keeps the legacy ANTHROPIC_MODEL_* names for Claude", () => {
    setEnv({ ANTHROPIC_API_KEY: "a", ANTHROPIC_MODEL_ANALYZE: "claude-x" });
    expect(getAiProvider()?.models.analyze).toBe("claude-x");
  });
  it("explains a misconfigured AI_PROVIDER instead of silently falling back", () => {
    setEnv({ AI_PROVIDER: "xai", GROQ_API_KEY: "g" });
    expect(getAiProvider()).toBeNull();
    expect(aiSetupHint()).toContain("XAI_API_KEY");
    setEnv({ AI_PROVIDER: "gemini" });
    expect(aiSetupHint()).toContain("not supported");
  });
});

describe("OpenAI-compatible client", () => {
  const schema = z.object({ reply: z.string() });
  const jsonSchema = { type: "object", additionalProperties: false, required: ["reply"], properties: { reply: { type: "string" } } };
  const req = { task: "assist" as const, system: "sys", messages: [{ role: "user" as const, content: "hi" }], jsonSchema, schema, effort: "medium" as const };
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  it("sends a JSON-schema request with a bearer key and validates the answer", async () => {
    setEnv({ XAI_API_KEY: "secret" });
    const fetchMock = vi.fn(async () => reply(200, { model: "grok-4", choices: [{ finish_reason: "stop", message: { content: '{"reply":"ok"}' } }], usage: { prompt_tokens: 5, completion_tokens: 2 } }));
    vi.stubGlobal("fetch", fetchMock);
    const r = await callStructured(req);
    expect(r).toEqual({ data: { reply: "ok" }, model: "grok-4", usage: { input: 5, output: 2 } });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.x.ai/v1/chat/completions");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer secret");
    const body = JSON.parse(String(init.body));
    expect(body.response_format.type).toBe("json_schema");
    expect(body.messages[0]).toEqual({ role: "system", content: "sys" });
  });

  it("falls back to JSON mode when the model has no structured outputs", async () => {
    setEnv({ GROQ_API_KEY: "g" });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reply(400, { error: { message: "This model does not support response format `json_schema`" } }))
      .mockResolvedValueOnce(reply(200, { choices: [{ finish_reason: "stop", message: { content: '```json\n{"reply":"fenced"}\n```' } }] }));
    vi.stubGlobal("fetch", fetchMock);
    const r = await callStructured(req);
    expect(r.data.reply).toBe("fenced");
    const second = JSON.parse(String((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body));
    expect(second.response_format).toEqual({ type: "json_object" });
    expect(second.messages[0].content).toContain('"required":["reply"]');
  });

  it("maps provider errors to clear messages and never returns malformed output", async () => {
    setEnv({ GROQ_API_KEY: "g" });
    vi.stubGlobal("fetch", vi.fn(async () => reply(413, { error: { message: "Request too large" } })));
    await expect(callStructured(req)).rejects.toMatchObject({ status: 413 });
    vi.stubGlobal("fetch", vi.fn(async () => reply(401, {})));
    await expect(callStructured(req)).rejects.toThrow(/key was rejected/);
    vi.stubGlobal("fetch", vi.fn(async () => reply(200, { choices: [{ finish_reason: "stop", message: { content: '{"nope":1}' } }] })));
    await expect(callStructured(req)).rejects.toThrow(/unexpected shape/);
    vi.stubGlobal("fetch", vi.fn(async () => reply(200, { choices: [{ finish_reason: "length", message: { content: '{"rep' } }] })));
    await expect(callStructured(req)).rejects.toThrow(/cut off/);
  });

  it("extractJson strips code fences", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
});

describe("OpenAI-compatible client: Groq resilience", () => {
  const schema = z.object({ reply: z.string() });
  const jsonSchema = { type: "object", additionalProperties: false, required: ["reply"], properties: { reply: { type: "string" } } };
  const req = { task: "analyze" as const, system: "sys", messages: [{ role: "user" as const, content: "hi" }], jsonSchema, schema, effort: "high" as const };
  const reply = (status: number, body: unknown, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
  const ok = () => reply(200, { choices: [{ finish_reason: "stop", message: { content: '{"reply":"ok"}' } }] });
  const bodyOf = (m: ReturnType<typeof vi.fn>, i: number) => JSON.parse(String((m.mock.calls[i] as unknown as [string, RequestInit])[1].body));

  it("retries in JSON mode when strict JSON generation fails", async () => {
    setEnv({ GROQ_API_KEY: "g" });
    const fetchMock = vi.fn().mockResolvedValueOnce(reply(400, { error: { message: "Failed to generate JSON. Please adjust your prompt.", code: "json_validate_failed" } })).mockResolvedValueOnce(ok());
    vi.stubGlobal("fetch", fetchMock);
    expect((await callStructured(req)).data.reply).toBe("ok");
    expect(bodyOf(fetchMock, 1).response_format).toEqual({ type: "json_object" });
  });

  it("explains a JSON generation failure that persists", async () => {
    setEnv({ GROQ_API_KEY: "g" });
    vi.stubGlobal("fetch", vi.fn(async () => reply(400, { error: { message: "Failed to generate JSON.", code: "json_validate_failed" } })));
    await expect(callStructured(req)).rejects.toThrow(/could not produce a valid answer/);
  });

  it("waits out a short 429 once, but not a long one", async () => {
    setEnv({ GROQ_API_KEY: "g" });
    vi.useFakeTimers();
    try {
      const fetchMock = vi.fn().mockResolvedValueOnce(reply(429, {}, { "retry-after": "2" })).mockResolvedValueOnce(ok());
      vi.stubGlobal("fetch", fetchMock);
      const p = callStructured(req);
      await vi.advanceTimersByTimeAsync(3000);
      expect((await p).data.reply).toBe("ok");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
    const slow = vi.fn(async () => reply(429, {}, { "retry-after": "50" }));
    vi.stubGlobal("fetch", slow);
    await expect(callStructured(req)).rejects.toMatchObject({ status: 429 });
    expect(slow).toHaveBeenCalledTimes(1);
  });

  it("keeps gpt-oss reasoning light on Groq only", async () => {
    setEnv({ GROQ_API_KEY: "g" });
    const fetchMock = vi.fn(async () => ok());
    vi.stubGlobal("fetch", fetchMock);
    await callStructured(req);
    expect(bodyOf(fetchMock, 0).reasoning_effort).toBe("medium");
    setEnv({ XAI_API_KEY: "x" });
    await callStructured(req);
    expect(bodyOf(fetchMock, 1).reasoning_effort).toBeUndefined();
  });
});
