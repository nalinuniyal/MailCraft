import "server-only";
import type { ZodType } from "zod";
import { AiError, getAiProvider } from "./provider";
import { callAnthropic } from "./anthropic";
import { callOpenAiCompatible } from "./openai-compatible";

export { AiError, isAiConfigured, aiProviderInfo, aiSetupHint } from "./provider";

export type AiMessage = { role: "user" | "assistant"; content: string };

export type StructuredRequest<T> = {
  model: string;
  system: string;
  messages: AiMessage[];
  jsonSchema: Record<string, unknown>;
  schema: ZodType<T>;
  effort: "low" | "medium" | "high";
  maxTokens?: number;
};

export type StructuredResult<T> = { data: T; model: string; usage: { input: number; output: number } };

/**
 * One structured-output call on whichever provider is configured.
 * `task` picks the model: "analyze" for analysis and fixes, "assist" for chat.
 */
export async function callStructured<T>(opts: Omit<StructuredRequest<T>, "model"> & { task: "analyze" | "assist" }): Promise<StructuredResult<T>> {
  const provider = getAiProvider();
  if (!provider) throw new AiError("AI is not configured on this server.", 503);
  const { task, ...rest } = opts;
  const req = { ...rest, model: provider.models[task] };
  return provider.id === "anthropic" ? callAnthropic(provider, req) : callOpenAiCompatible(provider, req);
}
