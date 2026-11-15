import { Loader2 } from "lucide-react";
export default function Loading() {
  return <div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" /> Opening studio…</div>;
}
