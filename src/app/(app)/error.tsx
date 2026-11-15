"use client";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="grid max-w-md justify-items-center gap-3 text-center">
        <span className="bg-destructive/10 flex size-11 items-center justify-center rounded-full"><AlertTriangle className="text-destructive size-5" /></span>
        <h2 className="font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground text-sm">{error.message || "An unexpected error occurred."}</p>
        {error.digest && <p className="text-muted-foreground font-mono text-xs">Ref: {error.digest}</p>}
        <Button onClick={reset} variant="outline" size="sm"><RotateCcw /> Try again</Button>
      </div>
    </div>
  );
}
