"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Copy, Trash2, Code2, History, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { deleteProject, duplicateProject, renameProject } from "@/lib/actions/projects";

export function ProjectActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [value, setValue] = React.useState(name);
  const [pending, start] = React.useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return void toast.error(res.error ?? "Something went wrong");
      toast.success(success);
      after?.();
      router.refresh();
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="ghost" aria-label={`Actions for ${name}`} disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild><Link href={`/studio/${id}`}><Code2 /> Open in studio</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href={`/projects/${id}/history`}><History /> Version history</Link></DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => { setValue(name); setRenameOpen(true); }}><Pencil /> Rename</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => run(() => duplicateProject(id), "Duplicated")}><Copy /> Duplicate</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}><Trash2 /> Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename email</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); run(() => renameProject(id, value), "Renamed", () => setRenameOpen(false)); }} className="grid gap-4">
            <Input autoFocus value={value} onChange={(e) => setValue(e.target.value)} maxLength={120} aria-label="New name" />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={pending}>Rename</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{name}”?</AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes the email, all its versions and its reports. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-white" onClick={() => run(() => deleteProject(id), "Deleted")}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
