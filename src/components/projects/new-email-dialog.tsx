"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, Upload, ClipboardPaste, Loader2, FileCode2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProject } from "@/lib/actions/projects";
import { readEmailFile, checkHtmlText } from "@/lib/email/upload";
import { formatBytes, cn } from "@/lib/utils";

export type NewEmailMode = "blank" | "upload" | "paste";

export function NewEmailDialog({ open, onOpenChange, initialMode = "blank" }: { open: boolean; onOpenChange: (o: boolean) => void; initialMode?: NewEmailMode }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {/* Content unmounts when closed, so form state resets on every open. */}
        <NewEmailForm initialMode={initialMode} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function NewEmailForm({ initialMode, onDone }: { initialMode: NewEmailMode; onDone: () => void }) {
  const router = useRouter();
  const [mode, setMode] = React.useState<NewEmailMode>(initialMode);
  const [name, setName] = React.useState("");
  const [pasted, setPasted] = React.useState("");
  const [file, setFile] = React.useState<{ name: string; html: string; size: number } | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function acceptFile(f: File) {
    const result = await readEmailFile(f);
    if (!result.ok) return toast.error(result.error);
    setFile({ name: f.name, html: result.html, size: f.size });
    if (!name) setName(result.name);
  }

  function submit() {
    let html: string | undefined;
    let source: "create" | "upload" = "create";
    if (mode === "upload") {
      if (!file) return toast.error("Choose an HTML file first.");
      html = file.html;
      source = "upload";
    } else if (mode === "paste") {
      const check = checkHtmlText(pasted);
      if (!check.ok) return toast.error(check.error);
      html = check.html;
      source = "upload";
    }
    startTransition(async () => {
      const res = await createProject({ name: name.trim() || "Untitled email", html, source });
      if (!res.ok) return void toast.error(res.error);
      toast.success("Email created");
      onDone();
      router.push(`/studio/${res.data.id}`);
    });
  }

  return (
    <>
        <DialogHeader>
          <DialogTitle>New email</DialogTitle>
          <DialogDescription>Start from a blank, email-safe skeleton, upload an HTML file, or paste code.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="new-email-name">Name</Label>
          <Input id="new-email-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Spring sale newsletter" maxLength={120} autoFocus />
        </div>
        <Tabs value={mode} onValueChange={(v) => setMode(v as NewEmailMode)}>
          <TabsList className="w-full">
            <TabsTrigger value="blank"><FilePlus2 /> Blank</TabsTrigger>
            <TabsTrigger value="upload"><Upload /> Upload</TabsTrigger>
            <TabsTrigger value="paste"><ClipboardPaste /> Paste</TabsTrigger>
          </TabsList>
          <TabsContent value="blank" className="text-muted-foreground rounded-lg border p-4 text-sm">
            A responsive 600px table layout with MSO conditionals, dark-mode meta tags and a preheader.
          </TabsContent>
          <TabsContent value="upload">
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) void acceptFile(f);
              }}
              className={cn("flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center transition-colors", dragging ? "border-primary bg-primary/5" : "hover:bg-muted/50")}
            >
              {file ? (
                <>
                  <FileCode2 className="text-primary size-6" />
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-muted-foreground text-xs">{formatBytes(file.size)} · click to replace</p>
                </>
              ) : (
                <>
                  <Upload className="text-muted-foreground size-6" />
                  <p className="text-sm font-medium">Drop an .html file here or click to browse</p>
                  <p className="text-muted-foreground text-xs">.html, .htm or .txt · up to 1 MB</p>
                </>
              )}
              <input ref={inputRef} type="file" accept=".html,.htm,.txt,text/html,text/plain" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); e.target.value = ""; }} />
            </div>
          </TabsContent>
          <TabsContent value="paste">
            <Textarea value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="<!DOCTYPE html>…" className="h-48 resize-none font-mono text-xs [field-sizing:fixed]" spellCheck={false} />
          </TabsContent>
        </Tabs>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onDone}>Cancel</Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />} Create & open
          </Button>
        </div>
    </>
  );
}

export function NewEmailButton({ mode = "blank", children, ...props }: { mode?: NewEmailMode } & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button {...props} onClick={() => setOpen(true)}>{children}</Button>
      <NewEmailDialog open={open} onOpenChange={setOpen} initialMode={mode} />
    </>
  );
}
