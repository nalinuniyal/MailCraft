"use client";
import { useRouter } from "next/navigation";
import { Download, Trash2, FileJson, FileText, FileCode2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { deleteReport } from "@/lib/actions/reports";

export function ReportActions({ id }: { id: string }) {
  const router = useRouter();
  return (
    <div className="flex gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button><Download /> Download</Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild><a href={`/api/reports/${id}/download?format=html`}><FileCode2 /> HTML report</a></DropdownMenuItem>
          <DropdownMenuItem asChild><a href={`/api/reports/${id}/download?format=md`}><FileText /> Markdown</a></DropdownMenuItem>
          <DropdownMenuItem asChild><a href={`/api/reports/${id}/download?format=json`}><FileJson /> JSON</a></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog>
        <AlertDialogTrigger asChild><Button variant="outline" size="icon" aria-label="Delete report"><Trash2 /></Button></AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this report?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white" onClick={async () => { const r = await deleteReport(id); if (!r.ok) return toast.error(r.error); toast.success("Report deleted"); router.push("/reports"); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
