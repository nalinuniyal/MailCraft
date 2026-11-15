import { AlertOctagon, AlertTriangle, AlertCircle, Info, CheckCircle2, MinusCircle, HelpCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Severity } from "@/lib/email/types";
import type { SupportLevel } from "@/lib/email/caniemail";
import { cn } from "@/lib/utils";

export const SEVERITY_META: Record<Severity, { label: string; icon: React.ComponentType<{ className?: string }>; text: string }> = {
  critical: { label: "Critical", icon: AlertOctagon, text: "text-sev-critical" },
  high: { label: "High", icon: AlertTriangle, text: "text-sev-high" },
  medium: { label: "Medium", icon: AlertCircle, text: "text-sev-medium" },
  low: { label: "Low", icon: Info, text: "text-sev-low" },
};

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const m = SEVERITY_META[severity];
  return <Badge variant={severity} className={className}><m.icon /> {m.label}</Badge>;
}

export const SUPPORT_META: Record<SupportLevel, { label: string; icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  supported: { label: "Supported", icon: CheckCircle2, cls: "text-success" },
  partial: { label: "Partially supported", icon: MinusCircle, cls: "text-warning" },
  unsupported: { label: "Unsupported", icon: XCircle, cls: "text-sev-critical" },
  unknown: { label: "Requires testing", icon: HelpCircle, cls: "text-muted-foreground" },
};

export function SupportIcon({ level, className }: { level: SupportLevel; className?: string }) {
  const m = SUPPORT_META[level];
  return <m.icon aria-label={m.label} className={cn("size-4", m.cls, className)} />;
}

export function SupportBadge({ level }: { level: SupportLevel }) {
  const m = SUPPORT_META[level];
  const variant = level === "supported" ? "success" : level === "partial" ? "warning" : level === "unsupported" ? "critical" : "outline";
  return <Badge variant={variant}><m.icon /> {m.label}</Badge>;
}
