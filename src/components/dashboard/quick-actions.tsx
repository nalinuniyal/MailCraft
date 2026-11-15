"use client";
import * as React from "react";
import Link from "next/link";
import { FilePlus2, Upload, LayoutTemplate, ShieldCheck } from "lucide-react";
import { NewEmailDialog, type NewEmailMode } from "@/components/projects/new-email-dialog";

const ACTIONS = [
  { mode: "blank" as const, label: "Create new email", desc: "Email-safe responsive skeleton", icon: FilePlus2 },
  { mode: "upload" as const, label: "Upload HTML", desc: "Drag & drop .html up to 1 MB", icon: Upload },
];

export function QuickActions() {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<NewEmailMode>("blank");
  const cls = "bg-card hover:border-primary/40 hover:bg-accent/40 flex items-center gap-3 rounded-xl border p-4 text-left transition-colors";
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {ACTIONS.map((a) => (
        <button key={a.mode} type="button" className={cls} onClick={() => { setMode(a.mode); setOpen(true); }}>
          <span className="bg-primary/12 text-primary flex size-9 items-center justify-center rounded-lg"><a.icon className="size-4" /></span>
          <span><span className="block text-sm font-medium">{a.label}</span><span className="text-muted-foreground block text-xs">{a.desc}</span></span>
        </button>
      ))}
      <Link href="/templates" className={cls}>
        <span className="bg-primary/12 text-primary flex size-9 items-center justify-center rounded-lg"><LayoutTemplate className="size-4" /></span>
        <span><span className="block text-sm font-medium">Start from template</span><span className="text-muted-foreground block text-xs">11 categories of starters</span></span>
      </Link>
      <Link href="/compatibility" className={cls}>
        <span className="bg-primary/12 text-primary flex size-9 items-center justify-center rounded-lg"><ShieldCheck className="size-4" /></span>
        <span><span className="block text-sm font-medium">Check compatibility</span><span className="text-muted-foreground block text-xs">Paste HTML, get client support</span></span>
      </Link>
      <NewEmailDialog open={open} onOpenChange={setOpen} initialMode={mode} />
    </div>
  );
}
