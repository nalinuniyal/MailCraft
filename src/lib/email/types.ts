export type Severity = "critical" | "high" | "medium" | "low";
export const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];
export const SEVERITY_WEIGHT: Record<Severity, number> = { critical: 15, high: 7, medium: 3, low: 1 };

export type IssueCategory =
  | "html" | "css" | "responsive" | "accessibility" | "images" | "links" | "outlook" | "gmail" | "size" | "compatibility" | "dark-mode" | "ampscript" | "rendering";

export interface Issue {
  id: string;
  ruleId: string;
  category: IssueCategory;
  severity: Severity;
  title: string;
  description: string;
  line?: number;
  column?: number;
  endLine?: number;
  snippet?: string;
  whyItMatters: string;
  recommendation: string;
  suggestedCode?: string;
  source: "rule" | "caniemail" | "ai" | "link-check";
}

export type IssueCounts = Record<Severity, number>;

export function countIssues(issues: Pick<Issue, "severity">[]): IssueCounts {
  const counts: IssueCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const i of issues) counts[i.severity]++;
  return counts;
}

/** 100 minus weighted issue penalty, floored at 0. Transparent and deterministic. */
export function scoreIssues(issues: Pick<Issue, "severity">[]): number {
  const penalty = issues.reduce((s, i) => s + SEVERITY_WEIGHT[i.severity], 0);
  return Math.max(0, Math.round(100 - penalty));
}
