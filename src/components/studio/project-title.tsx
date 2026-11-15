"use client";
import * as React from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { renameProject } from "@/lib/actions/projects";

export function ProjectTitle({ id, name, onRenamed }: { id: string; name: string; onRenamed: (n: string) => void }) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(name);
  async function commit() {
    setEditing(false);
    const next = value.trim();
    if (!next || next === name) return setValue(name);
    const res = await renameProject(id, next);
    if (!res.ok) {
      toast.error(res.error);
      setValue(name);
    } else {
      onRenamed(next);
      toast.success("Renamed");
    }
  }
  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        maxLength={120}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") { setValue(name); setEditing(false); }
        }}
        aria-label="Email name"
        className="border-input bg-background h-7 min-w-0 rounded-md border px-2 text-sm font-medium outline-none focus:ring-2 focus:ring-ring/40"
      />
    );
  }
  return (
    <button type="button" onClick={() => setEditing(true)} className="group hover:bg-accent flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium" title="Rename">
      <span className="truncate">{name}</span>
      <Pencil className="text-muted-foreground size-3 opacity-0 group-hover:opacity-100" />
    </button>
  );
}
