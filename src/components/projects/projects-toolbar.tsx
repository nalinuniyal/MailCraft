"use client";
import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, Plus, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NewEmailDialog, type NewEmailMode } from "./new-email-dialog";

export function ProjectsToolbar({ initialOpen }: { initialOpen: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = React.useState(params.get("q") ?? "");
  const [open, setOpen] = React.useState(initialOpen);
  const [mode, setMode] = React.useState<NewEmailMode>("blank");

  const update = React.useCallback((patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("new");
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`);
  }, [params, pathname, router]);

  React.useEffect(() => {
    const t = setTimeout(() => { if ((params.get("q") ?? "") !== q) update({ q: q || null }); }, 300);
    return () => clearTimeout(t);
  }, [q, params, update]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search emails…" className="pl-8" aria-label="Search emails" />
      </div>
      <Select value={params.get("sort") ?? "updated"} onValueChange={(v) => update({ sort: v === "updated" ? null : v })}>
        <SelectTrigger className="w-full sm:w-44" aria-label="Sort"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="updated">Last edited</SelectItem>
          <SelectItem value="created">Newest</SelectItem>
          <SelectItem value="name">Name A–Z</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" onClick={() => { setMode("upload"); setOpen(true); }}><Upload /> Upload</Button>
      <Button onClick={() => { setMode("blank"); setOpen(true); }}><Plus /> New email</Button>
      <NewEmailDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o && params.get("new")) update({}); }} initialMode={mode} />
    </div>
  );
}
