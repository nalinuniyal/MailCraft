import Link from "next/link";
import { cn } from "@/lib/utils";

export function StatCard({ label, value, hint, icon: Icon, href, tone = "default" }: {
  label: string; value: number; hint?: string; icon: React.ComponentType<{ className?: string }>; href?: string; tone?: "default" | "warning";
}) {
  const body = (
    <div className={cn("bg-card group flex h-full flex-col gap-3 rounded-xl border p-4 transition-colors", href && "hover:border-primary/40")}>
      <div className="text-muted-foreground flex items-center justify-between text-xs font-medium">
        {label}
        <Icon className={cn("size-4", tone === "warning" && value > 0 ? "text-warning" : "text-muted-foreground")} />
      </div>
      <div className="text-3xl font-semibold tabular-nums tracking-tight">{value.toLocaleString()}</div>
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}
