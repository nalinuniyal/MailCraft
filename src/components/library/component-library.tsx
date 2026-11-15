"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Blocks, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ComponentCustomizer, type LibraryComponent } from "./component-customizer";
import { deleteComponent, saveComponent } from "@/lib/actions/library";
import { cn } from "@/lib/utils";

export const KIND_LABELS: Record<string, string> = { button: "Buttons", header: "Headers", hero: "Heroes", layout: "Layout", commerce: "Commerce", content: "Content", spacing: "Spacing", footer: "Footers", head: "Head & meta" };

export function useComponentFilter(components: LibraryComponent[]) {
  const [query, setQuery] = React.useState("");
  const [kind, setKind] = React.useState("all");
  const kinds = [...new Set(components.map((c) => c.kind))];
  const q = query.trim().toLowerCase();
  const shown = components.filter((c) => (kind === "all" || c.kind === kind) && (!q || c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q) || c.tags.some((t) => t.includes(q))));
  return { query, setQuery, kind, setKind, kinds, shown };
}

export function ComponentFilters({ f }: { f: ReturnType<typeof useComponentFilter> }) {
  return (
    <div className="grid gap-2">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input value={f.query} onChange={(e) => f.setQuery(e.target.value)} placeholder="Search components…" className="pl-8" aria-label="Search components" />
      </div>
      <div className="flex flex-wrap gap-1">
        {["all", ...f.kinds].map((k) => (
          <button key={k} onClick={() => f.setKind(k)} className={cn("rounded-full border px-2.5 py-0.5 text-xs", f.kind === k ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:bg-muted")}>
            {k === "all" ? "All" : KIND_LABELS[k] ?? k}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ComponentLibrary({ components }: { components: LibraryComponent[] }) {
  const f = useComponentFilter(components);
  const [selectedId, setSelectedId] = React.useState<string | null>(components[0]?.id ?? null);
  const [creating, setCreating] = React.useState(false);
  const [deleting, setDeleting] = React.useState<LibraryComponent | null>(null);
  const router = useRouter();
  const selected = components.find((c) => c.id === selectedId) ?? null;

  async function remove(c: LibraryComponent) {
    const res = await deleteComponent(c.id);
    setDeleting(null);
    if (!res.ok) return void toast.error(res.error);
    toast.success(`Deleted “${c.name}”`);
    setSelectedId(null);
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="grid content-start gap-3">
        <ComponentFilters f={f} />
        <Button variant="outline" size="sm" onClick={() => setCreating(true)}><Plus /> New component</Button>
        <ul className="grid gap-1" data-testid="component-list">
          {f.shown.map((c) => (
            <li key={c.id}>
              <button onClick={() => setSelectedId(c.id)} className={cn("w-full rounded-md border px-3 py-2 text-left", selectedId === c.id ? "border-primary bg-primary/5" : "hover:bg-muted/50")}>
                <span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium">{c.name}</span>{c.own && <Badge variant="secondary">Mine</Badge>}</span>
                <span className="text-muted-foreground line-clamp-1 text-xs">{KIND_LABELS[c.kind] ?? c.kind} · {c.description}</span>
              </button>
            </li>
          ))}
          {f.shown.length === 0 && <li className="text-muted-foreground py-6 text-center text-sm">No components match.</li>}
        </ul>
      </div>
      <div className="bg-card min-w-0 rounded-xl border p-4">
        {selected ? (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">{selected.name}</h2>
                <p className="text-muted-foreground text-sm">{selected.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">{selected.tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}</div>
              </div>
              {selected.own && <Button variant="ghost" size="sm" onClick={() => setDeleting(selected)}><Trash2 /> Delete</Button>}
            </div>
            <ComponentCustomizer key={selected.id} component={selected} />
            <p className="text-muted-foreground text-xs">To insert into an email, open it in the Code Studio and use <strong>Insert</strong> in the toolbar.</p>
          </div>
        ) : (
          <EmptyState icon={Blocks} title="Pick a component" description="Choose a component on the left to preview and customize it." />
        )}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-2xl">{creating && <ComponentForm onClose={() => setCreating(false)} onSaved={(id) => { setSelectedId(id); router.refresh(); }} />}</DialogContent>
      </Dialog>
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>Emails that already use it are not affected. This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && void remove(deleting)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Create a component; also used by "Save selection as component" in the studio. */
export function ComponentForm({ initialHtml = "", onClose, onSaved }: { initialHtml?: string; onClose: () => void; onSaved?: (id: string) => void }) {
  const [name, setName] = React.useState("");
  const [kind, setKind] = React.useState("content");
  const [description, setDescription] = React.useState("");
  const [tags, setTags] = React.useState("");
  const [html, setHtml] = React.useState(initialHtml);
  const [pending, setPending] = React.useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const res = await saveComponent({ name, kind, description, html, tags: tags.split(",").map((t) => t.trim()).filter(Boolean) });
    setPending(false);
    if (!res.ok) return void toast.error(res.error);
    toast.success("Component saved to your library");
    onSaved?.(res.data.id);
    onClose();
  }
  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>New component</DialogTitle>
        <DialogDescription>Use <code>{"{{key|default}}"}</code> placeholders (lowercase key) to make fields editable before inserting.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2"><Label htmlFor="c-name">Name</Label><Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required autoFocus /></div>
        <div className="grid gap-2"><Label htmlFor="c-kind">Kind</Label><Input id="c-kind" value={kind} onChange={(e) => setKind(e.target.value)} list="component-kinds" maxLength={40} required /></div>
        <datalist id="component-kinds">{Object.keys(KIND_LABELS).map((k) => <option key={k} value={k} />)}</datalist>
      </div>
      <div className="grid gap-2"><Label htmlFor="c-desc">Description</Label><Input id="c-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} /></div>
      <div className="grid gap-2"><Label htmlFor="c-tags">Tags</Label><Input id="c-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="cta, outlook" /></div>
      <div className="grid gap-2"><Label htmlFor="c-html">HTML</Label><Textarea id="c-html" value={html} onChange={(e) => setHtml(e.target.value)} rows={8} className="font-mono text-xs" required /></div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={pending || !name.trim() || !html.trim()} data-testid="save-component">{pending && <Loader2 className="animate-spin" />} Save component</Button>
      </DialogFooter>
    </form>
  );
}
