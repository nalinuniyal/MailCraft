"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy, Eye, LayoutTemplate, Loader2, MoreHorizontal, Pencil, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HtmlThumb } from "./html-thumb";
import { cloneTemplate, deleteTemplate, saveTemplate } from "@/lib/actions/library";
import { formatBytes, byteLength, cn } from "@/lib/utils";
import type { CategoryRow, TemplateRow } from "@/lib/types/database";

export type LibraryTemplate = Pick<TemplateRow, "id" | "category_id" | "name" | "description" | "html" | "tags" | "is_system" | "updated_at"> & { own: boolean };
type Category = Pick<CategoryRow, "id" | "slug" | "name" | "description">;

export function TemplateLibrary({ categories, templates }: { categories: Category[]; templates: LibraryTemplate[] }) {
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<string>("all");
  const [owner, setOwner] = React.useState<"all" | "builtin" | "mine">("all");
  const [preview, setPreview] = React.useState<LibraryTemplate | null>(null);
  const [using, setUsing] = React.useState<LibraryTemplate | null>(null);
  const [editing, setEditing] = React.useState<LibraryTemplate | null>(null);
  const [deleting, setDeleting] = React.useState<LibraryTemplate | null>(null);
  const router = useRouter();
  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "Uncategorised";

  const q = query.trim().toLowerCase();
  const shown = templates.filter(
    (t) =>
      (category === "all" || t.category_id === category) &&
      (owner === "all" || (owner === "mine" ? t.own : t.is_system)) &&
      (!q || t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q) || t.tags.some((tag) => tag.includes(q))),
  );
  const counts = new Map<string, number>();
  for (const t of templates) counts.set(t.category_id ?? "", (counts.get(t.category_id ?? "") ?? 0) + 1);

  async function remove(t: LibraryTemplate) {
    const res = await deleteTemplate(t.id);
    setDeleting(null);
    if (!res.ok) return void toast.error(res.error);
    toast.success(`Deleted “${t.name}”`);
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <aside className="grid content-start gap-1" aria-label="Categories">
        <CategoryButton active={category === "all"} onClick={() => setCategory("all")} label="All templates" count={templates.length} />
        {categories.map((c) => (
          <CategoryButton key={c.id} active={category === c.id} onClick={() => setCategory(c.id)} label={c.name} count={counts.get(c.id) ?? 0} />
        ))}
      </aside>
      <div className="grid content-start gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search templates and tags…" className="pl-8" aria-label="Search templates" />
          </div>
          <div className="bg-muted inline-flex rounded-md p-0.5 text-xs">
            {(["all", "builtin", "mine"] as const).map((o) => (
              <button key={o} onClick={() => setOwner(o)} className={cn("rounded px-2.5 py-1.5", owner === o ? "bg-background shadow-sm" : "text-muted-foreground")}>
                {o === "all" ? "All" : o === "builtin" ? "Built-in" : "My templates"}
              </button>
            ))}
          </div>
        </div>
        {shown.length === 0 ? (
          <EmptyState icon={LayoutTemplate} title={owner === "mine" && !q ? "No saved templates yet" : "No templates match"} description={owner === "mine" && !q ? "In the Code Studio, open the ⋯ menu and choose “Save as template”." : "Try another category or search term."} />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4" data-testid="template-grid">
            {shown.map((t) => (
              <article key={t.id} className="bg-card group overflow-hidden rounded-xl border transition-shadow hover:shadow-md" data-testid="template-card">
                <button className="block w-full border-b text-left" onClick={() => setPreview(t)} aria-label={`Preview ${t.name}`}>
                  <HtmlThumb html={t.html} title={`${t.name} thumbnail`} scale={0.42} height={720} />
                </button>
                <div className="grid gap-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-medium">{t.name}</h3>
                      <p className="text-muted-foreground text-xs">{catName(t.category_id)} · {formatBytes(byteLength(t.html))}</p>
                    </div>
                    {t.own ? <Badge variant="secondary">Mine</Badge> : <Badge variant="outline">Built-in</Badge>}
                  </div>
                  {t.description && <p className="text-muted-foreground line-clamp-2 text-xs">{t.description}</p>}
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" className="flex-1" onClick={() => setUsing(t)} data-testid="use-template"><Copy /> Use template</Button>
                    <Button size="icon-sm" variant="outline" onClick={() => setPreview(t)} aria-label="Preview"><Eye /></Button>
                    {t.own && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button size="icon-sm" variant="ghost" aria-label="More actions"><MoreHorizontal /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setEditing(t)}><Pencil /> Edit details</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(t)}><Trash2 /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="flex h-[min(92vh,900px)] w-[min(96vw,760px)] max-w-none flex-col sm:max-w-none">
          <DialogHeader>
            <DialogTitle>{preview?.name}</DialogTitle>
            <DialogDescription>{preview?.description ?? catName(preview?.category_id ?? null)} Preview is sanitized and sandboxed; it is not a client render.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto rounded-md border">{preview && <HtmlThumb html={preview.html} scale={1} height={2400} width={640} interactive title={`${preview.name} preview`} className="h-auto" />}</div>
          {preview && (
            <div className="flex flex-wrap items-center gap-1.5">
              {preview.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
              <Button className="ml-auto" onClick={() => { setUsing(preview); setPreview(null); }}><Copy /> Use template</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <UseTemplateDialog template={using} onClose={() => setUsing(null)} />
      <TemplateDetailsDialog template={editing} categories={categories} onClose={() => setEditing(null)} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>Emails you already created from it are not affected. This can&apos;t be undone.</AlertDialogDescription>
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

function CategoryButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button onClick={onClick} className={cn("flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm", active ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-muted")}>
      <span className="truncate">{label}</span>
      <span className="text-xs tabular-nums">{count}</span>
    </button>
  );
}

function UseTemplateDialog({ template, onClose }: { template: LibraryTemplate | null; onClose: () => void }) {
  return (
    <Dialog open={!!template} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>{template && <UseTemplateForm key={template.id} template={template} onClose={onClose} />}</DialogContent>
    </Dialog>
  );
}

function UseTemplateForm({ template, onClose }: { template: LibraryTemplate; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = React.useState(template.name);
  const [pending, setPending] = React.useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const res = await cloneTemplate(template.id, name);
    if (!res.ok) {
      setPending(false);
      return void toast.error(res.error);
    }
    toast.success("Email created from template");
    onClose();
    router.push(`/studio/${res.data.id}`);
  }
  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Use “{template.name}”</DialogTitle>
        <DialogDescription>Creates a new email project with a copy of this template and opens it in the Code Studio.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-2">
        <Label htmlFor="tpl-name">Email name</Label>
        <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required autoFocus />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={pending || !name.trim()} data-testid="confirm-use-template">{pending && <Loader2 className="animate-spin" />} Create & open</Button>
      </DialogFooter>
    </form>
  );
}

function TemplateDetailsDialog({ template, categories, onClose }: { template: LibraryTemplate | null; categories: Category[]; onClose: () => void }) {
  return (
    <Dialog open={!!template} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>{template && <TemplateDetailsForm key={template.id} template={template} categories={categories} onClose={onClose} />}</DialogContent>
    </Dialog>
  );
}

/** Save-as-template (from the studio) and edit-details share this form. */
export function TemplateDetailsForm({ template, html, categories, onClose, onSaved }: { template?: LibraryTemplate; html?: string; categories: Category[]; onClose: () => void; onSaved?: (id: string) => void }) {
  const router = useRouter();
  const [name, setName] = React.useState(template?.name ?? "");
  const [description, setDescription] = React.useState(template?.description ?? "");
  const [categoryId, setCategoryId] = React.useState<string>(template?.category_id ?? "none");
  const [tags, setTags] = React.useState((template?.tags ?? []).join(", "));
  const [pending, setPending] = React.useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const res = await saveTemplate({
      id: template?.id,
      name,
      description,
      categoryId: categoryId === "none" ? null : categoryId,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      html: html ?? template!.html,
    });
    setPending(false);
    if (!res.ok) return void toast.error(res.error);
    toast.success(template ? "Template updated" : "Saved to your templates", template ? undefined : { action: { label: "View", onClick: () => router.push("/templates") } });
    onSaved?.(res.data.id);
    onClose();
    router.refresh();
  }
  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{template ? "Edit template details" : "Save as template"}</DialogTitle>
        <DialogDescription>{template ? "Change how this template appears in your library." : "Saves a copy of the current HTML to your template library. Later edits to this email don't change the template."}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-2"><Label htmlFor="t-name">Name</Label><Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required autoFocus /></div>
      <div className="grid gap-2"><Label htmlFor="t-desc">Description</Label><Textarea id="t-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={2} /></div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Uncategorised</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2"><Label htmlFor="t-tags">Tags</Label><Input id="t-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="sale, dark-mode" /></div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={pending || !name.trim()} data-testid="save-template">{pending && <Loader2 className="animate-spin" />} {template ? "Save changes" : "Save template"}</Button>
      </DialogFooter>
    </form>
  );
}
