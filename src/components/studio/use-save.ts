"use client";
import * as React from "react";
import { toast } from "sonner";
import { saveProject } from "@/lib/actions/projects";
import type { VersionSource } from "@/lib/types/database";

export type SaveStatus = { state: "saved" | "dirty" | "saving" | "error"; at?: Date; version?: number | null; error?: string };

/** Tracks dirty state against the last persisted HTML and handles manual + auto saves. */
export function useProjectSave(projectId: string, initialHtml: string, autosave: boolean) {
  const [status, setStatus] = React.useState<SaveStatus>({ state: "saved" });
  const savedRef = React.useRef(initialHtml);
  const latestRef = React.useRef(initialHtml);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = React.useRef<Promise<unknown> | null>(null);

  const persist = React.useCallback(
    async (opts: { createVersion: boolean; source?: Extract<VersionSource, "manual" | "autosave" | "ai" | "restore">; message?: string; quiet?: boolean }) => {
      if (timer.current) clearTimeout(timer.current);
      const html = latestRef.current;
      if (!opts.createVersion && html === savedRef.current) return true;
      setStatus((s) => ({ ...s, state: "saving" }));
      const p = saveProject({ id: projectId, html, createVersion: opts.createVersion, source: opts.source ?? "manual", message: opts.message });
      inFlight.current = p;
      const res = await p;
      if (!res.ok) {
        setStatus({ state: "error", error: res.error });
        if (!opts.quiet) toast.error(`Save failed: ${res.error}`);
        return false;
      }
      savedRef.current = html;
      setStatus({ state: latestRef.current === html ? "saved" : "dirty", at: new Date(), version: res.data.versionNumber });
      if (!opts.quiet && res.data.versionNumber) toast.success(`Saved version ${res.data.versionNumber}`);
      return true;
    },
    [projectId],
  );

  const onChange = React.useCallback(
    (html: string) => {
      latestRef.current = html;
      const dirty = html !== savedRef.current;
      setStatus((s) => (s.state === "saving" ? s : { ...s, state: dirty ? "dirty" : "saved" }));
      if (autosave && dirty) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void persist({ createVersion: false, source: "autosave", quiet: true }), 2500);
      }
    },
    [autosave, persist],
  );

  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (latestRef.current !== savedRef.current) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return { status, onChange, persist, isDirty: () => latestRef.current !== savedRef.current };
}
