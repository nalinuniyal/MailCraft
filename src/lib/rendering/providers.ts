/**
 * Rendering provider abstraction.
 *
 * MailCraft ships with the LocalSimulationProvider (sandboxed iframe + profile
 * transforms). Real email-client screenshots can be added by implementing this
 * interface against a service such as Litmus (Instant API) or Email on Acid
 * (Email Testing API). Calls must happen server-side (API keys) from a route
 * such as /api/rendering/[provider], with results persisted to
 * analysis_reports.sections.renders.
 */
export interface RenderTarget {
  clientId: string; // provider-specific client id, e.g. "ol2019" or "gmailnew"
  label: string;
}

export interface RenderResult {
  clientId: string;
  status: "pending" | "complete" | "failed";
  screenshotUrl?: string;
  fullPageUrl?: string;
  error?: string;
}

export interface RenderingProvider {
  id: "local" | "litmus" | "emailonacid";
  name: string;
  /** true when the provider produces genuine client renders (not a simulation). */
  genuine: boolean;
  listTargets(): Promise<RenderTarget[]>;
  createTest(input: { html: string; subject: string; targets: string[] }): Promise<{ testId: string }>;
  getResults(testId: string): Promise<RenderResult[]>;
}

export const LOCAL_PROVIDER_INFO = {
  id: "local" as const,
  name: "MailCraft local simulation",
  genuine: false,
};

/** Providers that can be configured by setting their server-side env vars. */
export const FUTURE_PROVIDERS = [
  { id: "litmus", name: "Litmus", env: ["LITMUS_API_KEY"], docs: "https://docs.litmus.com" },
  { id: "emailonacid", name: "Email on Acid", env: ["EMAILONACID_API_KEY", "EMAILONACID_ACCOUNT_PASSWORD"], docs: "https://api.emailonacid.com/docs/latest" },
] as const;
