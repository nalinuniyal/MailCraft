"use client";
import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ComponentCustomizer, type LibraryComponent } from "@/components/library/component-customizer";
import { ComponentFilters, ComponentForm, KIND_LABELS, useComponentFilter } from "@/components/library/component-library";
import { TemplateDetailsForm } from "@/components/library/template-library";
import type { CodeEditorHandle } from "@/components/editor/code-editor";
import type { CategoryRow } from "@/lib/types/database";

export type StudioLibraryData = { components: LibraryComponent[]; categories: Pick<CategoryRow, "id" | "slug" | "name" | "description">[] };

export function InsertComponentSheet({ open, onOpenChange, components, editorRef }: { open: boolean; onOpenChange: (o: boolean) => void; components: LibraryComponent[]; editorRef: React.RefObject<CodeEditorHandle | null> }) {
  const f = useComponentFilter(components);
  const [selected, setSelected] = React.useState<LibraryComponent | null>(null);
  const insert = (html: string) => {
    editorRef.current?.insertAtCursor(html);
    onOpenChange(false);
    toast.success(`Inserted “${selected?.name}”`);
    setTimeout(() => editorRef.current?.focus(), 50);
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg" data-testid="insert-sheet">
        <SheetHeader className="border-b p-4">
          <SheetTitle>{selected ? selected.name : "Insert component"}</SheetTitle>
          <SheetDescription>{selected ? selected.description : "Pick a component, fill in its fields and insert it at the cursor."}</SheetDescription>
        </SheetHeader>
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4">
          {selected ? (
            <div className="grid gap-3">
              <Button variant="ghost" size="xs" className="justify-self-start" onClick={() => setSelected(null)}><ArrowLeft /> All components</Button>
              <ComponentCustomizer key={selected.id} component={selected} onInsert={insert} compact />
            </div>
          ) : (
            <div className="grid gap-3">
              <ComponentFilters f={f} />
              <ul className="grid gap-1">
                {f.shown.map((c) => (
                  <li key={c.id}>
                    <button onClick={() => setSelected(c)} className="hover:bg-muted/50 w-full rounded-md border px-3 py-2 text-left" data-testid="insert-component-item">
                      <span className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{c.name}</span>{c.own && <Badge variant="secondary">Mine</Badge>}</span>
                      <span className="text-muted-foreground line-clamp-1 text-xs">{KIND_LABELS[c.kind] ?? c.kind} · {c.description}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function SaveAsTemplateDialog({ open, onOpenChange, html, name, categories }: { open: boolean; onOpenChange: (o: boolean) => void; html: string; name: string; categories: StudioLibraryData["categories"] }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>{open && <TemplateDetailsForm key={name} html={html} categories={categories} onClose={() => onOpenChange(false)} template={undefined} />}</DialogContent>
    </Dialog>
  );
}

export function SaveComponentDialog({ html, onClose }: { html: string | null; onClose: () => void }) {
  return (
    <Dialog open={html !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">{html !== null && <ComponentForm initialHtml={html} onClose={onClose} />}</DialogContent>
    </Dialog>
  );
}
