import data from "@/data/caniemail.json";

export type SupportLevel = "supported" | "partial" | "unsupported" | "unknown";

export interface CaniemailFeature {
  slug: string;
  title: string;
  category: string;
  url: string;
  lastTestDate: string;
  notes: string | null;
  notesByNum: Record<string, string>;
  stats: Record<string, Record<string, Record<string, string>>>;
}

export const CANIEMAIL_SOURCE = data.source as {
  name: string; url: string; package: string; license: string; apiVersion: string; lastUpdated: string; featureCount: number;
};
export const NICENAMES = data.nicenames as { family: Record<string, string>; platform: Record<string, string> };
const FEATURES = data.features as unknown as CaniemailFeature[];
const BY_SLUG = new Map(FEATURES.map((f) => [f.slug, f]));

export function getFeature(slug: string) {
  return BY_SLUG.get(slug);
}
export function allFeatures() {
  return FEATURES;
}

/** Key clients shown in compact compatibility tables. */
export const KEY_CLIENTS: { family: string; platform: string; label: string }[] = [
  { family: "apple-mail", platform: "macos", label: "Apple Mail macOS" },
  { family: "apple-mail", platform: "ios", label: "Apple Mail iOS" },
  { family: "gmail", platform: "desktop-webmail", label: "Gmail Web" },
  { family: "gmail", platform: "ios", label: "Gmail iOS" },
  { family: "gmail", platform: "android", label: "Gmail Android" },
  { family: "outlook", platform: "windows", label: "Outlook Windows" },
  { family: "outlook", platform: "macos", label: "Outlook macOS" },
  { family: "outlook", platform: "outlook-com", label: "Outlook.com" },
  { family: "outlook", platform: "ios", label: "Outlook iOS" },
  { family: "outlook", platform: "android", label: "Outlook Android" },
  { family: "yahoo", platform: "desktop-webmail", label: "Yahoo Web" },
  { family: "samsung-email", platform: "android", label: "Samsung Email" },
  { family: "thunderbird", platform: "macos", label: "Thunderbird" },
];

export interface ClientSupport {
  family: string;
  platform: string;
  label: string;
  level: SupportLevel;
  /** raw value per tested version, e.g. { "2016": "n", "2019": "a #1" } */
  versions: Record<string, string>;
  notes: string[];
}

function levelOf(v: string): SupportLevel {
  const c = v.trim().charAt(0);
  return c === "y" ? "supported" : c === "a" ? "partial" : c === "n" ? "unsupported" : "unknown";
}

/**
 * Support for one client/platform. Uses the most recent tested version, except
 * where several versions are in active use side by side (Outlook for Windows),
 * where mixed results across versions are reported as partial.
 */
export function clientSupport(feature: CaniemailFeature, family: string, platform: string, label?: string): ClientSupport {
  const versions = feature.stats?.[family]?.[platform] ?? {};
  const entries = Object.entries(versions);
  let level: SupportLevel = "unknown";
  if (entries.length) {
    if (family === "outlook" && platform === "windows") {
      const levels = new Set(entries.map(([, v]) => levelOf(v)));
      level = levels.size === 1 ? [...levels][0] : levels.has("supported") || levels.has("partial") ? "partial" : "unsupported";
    } else {
      level = levelOf(entries[entries.length - 1][1]);
    }
  }
  const noteNums = new Set<string>();
  for (const [, v] of entries) for (const m of v.matchAll(/#(\d+)/g)) noteNums.add(m[1]);
  const notes = [...noteNums].map((n) => feature.notesByNum?.[n]).filter(Boolean) as string[];
  return {
    family,
    platform,
    label: label ?? `${NICENAMES.family[family] ?? family} ${NICENAMES.platform[platform] ?? platform}`,
    level,
    versions,
    notes,
  };
}

/** Summary across every client/platform Can I Email has tested for this feature. */
export function featureSummary(feature: CaniemailFeature) {
  const counts: Record<SupportLevel, number> = { supported: 0, partial: 0, unsupported: 0, unknown: 0 };
  for (const [family, platforms] of Object.entries(feature.stats ?? {})) {
    for (const platform of Object.keys(platforms)) counts[clientSupport(feature, family, platform).level]++;
  }
  const tested = counts.supported + counts.partial + counts.unsupported;
  const overall: SupportLevel = tested === 0 ? "unknown" : counts.unsupported === 0 && counts.partial === 0 ? "supported" : counts.supported === 0 && counts.partial === 0 ? "unsupported" : "partial";
  return { counts, tested, total: tested + counts.unknown, overall, pct: tested ? Math.round(((counts.supported + counts.partial * 0.5) / tested) * 100) : null };
}
