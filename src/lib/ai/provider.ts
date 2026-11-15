import "server-only";

/* Which AI provider MailCraft talks to. The only module that reads AI keys,
 * together with the two clients. "server-only" makes any import from a client
 * component a build error, so keys never reach the browser. */

export type AiProviderId = "anthropic" | "xai" | "groq";

export type AiProvider = {
  id: AiProviderId;
  /** Shown in the UI, e.g. "Claude". */
  label: string;
  apiKey: string;
  /** OpenAI-compatible base URL (xAI and Groq only). */
  baseUrl?: string;
  models: { analyze: string; assist: string };
};

const PRESETS: Record<AiProviderId, { label: string; keyVar: string; aliases?: string[]; baseUrl?: string; analyze: string; assist: string }> = {
  anthropic: { label: "Claude", keyVar: "ANTHROPIC_API_KEY", analyze: "claude-opus-5-5", assist: "claude-sonnet-5-5" },
  xai: { label: "Grok", keyVar: "XAI_API_KEY", aliases: ["GROK_API_KEY"], baseUrl: "https://api.x.ai/v1", analyze: "grok-4", assist: "grok-4" },
  groq: { label: "Groq", keyVar: "GROQ_API_KEY", baseUrl: "https://api.groq.com/openai/v1", analyze: "openai/gpt-oss-120b", assist: "openai/gpt-oss-120b" },
};

const ORDER: AiProviderId[] = ["anthropic", "xai", "groq"];

const keyFor = (id: AiProviderId) => [PRESETS[id].keyVar, ...(PRESETS[id].aliases ?? [])].map((k) => process.env[k]).find(Boolean);

/**
 * AI_PROVIDER picks one explicitly (anthropic | xai | groq). Without it, the
 * first provider whose key is set wins, in the order above.
 */
export function getAiProvider(): AiProvider | null {
  const env = process.env;
  const wanted = env.AI_PROVIDER?.trim().toLowerCase();
  const id = wanted && wanted in PRESETS ? (wanted as AiProviderId) : wanted ? null : ORDER.find((p) => keyFor(p));
  if (!id) return null;
  const preset = PRESETS[id];
  const apiKey = keyFor(id);
  if (!apiKey) return null;
  // Legacy ANTHROPIC_MODEL_* names still work for Claude.
  const legacy = id === "anthropic" ? { analyze: env.ANTHROPIC_MODEL_ANALYZE, assist: env.ANTHROPIC_MODEL_ASSIST } : {};
  return {
    id,
    label: preset.label,
    apiKey,
    baseUrl: (id !== "anthropic" && env.AI_BASE_URL) || preset.baseUrl,
    models: {
      analyze: env.AI_MODEL_ANALYZE || legacy.analyze || preset.analyze,
      assist: env.AI_MODEL_ASSIST || legacy.assist || preset.assist,
    },
  };
}

export function isAiConfigured(): boolean {
  return getAiProvider() !== null;
}

/** Public, secret-free description for the UI and health check. */
export function aiProviderInfo(): { id: AiProviderId; label: string; models: AiProvider["models"] } | null {
  const p = getAiProvider();
  return p && { id: p.id, label: p.label, models: p.models };
}

/** The env var a misconfigured AI_PROVIDER is missing, for error messages. */
export function aiSetupHint(): string {
  const wanted = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (wanted && !(wanted in PRESETS)) return `AI_PROVIDER="${wanted}" is not supported. Use anthropic, xai or groq.`;
  if (wanted) return `AI_PROVIDER is ${wanted} but ${PRESETS[wanted as AiProviderId].keyVar} is not set.`;
  return "Add ANTHROPIC_API_KEY, XAI_API_KEY or GROQ_API_KEY to the server environment.";
}

export class AiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}
