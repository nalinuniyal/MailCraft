"use client";
import * as React from "react";
import { Monitor, Tablet, Smartphone, Moon, Sun, ImageOff, Image as ImageIcon, Info, Maximize2, Contrast } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { buildPreviewDocument, type DarkMode } from "@/lib/rendering/preview";
import { CLIENT_PROFILES, VIEWPORTS, getProfile, type ClientProfileId, type ViewportId } from "@/lib/rendering/profiles";
import { cn } from "@/lib/utils";

export interface PreviewState {
  viewport: ViewportId;
  customWidth: number;
  profile: ClientProfileId;
  dark: DarkMode;
  blockImages: boolean;
}

export const DEFAULT_PREVIEW: PreviewState = { viewport: "desktop", customWidth: 600, profile: "none", dark: "off", blockImages: false };

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const VIEWPORT_ICONS = { desktop: Monitor, tablet: Tablet, mobile: Smartphone } as const;

/** The sandboxed frame. No allow-scripts, no allow-same-origin: email HTML can never run code in the app. */
export function PreviewFrame({ doc, width, dark, title = "Email preview", className }: { doc: string; width: number | string; dark: DarkMode; title?: string; className?: string }) {
  return (
    <iframe
      title={title}
      sandbox="allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      srcDoc={doc}
      className={cn("h-full border-0 bg-white", className)}
      // color-scheme on the iframe element drives prefers-color-scheme inside it
      style={{ width, colorScheme: dark === "media" ? "dark" : "light" }}
    />
  );
}

export function EmailPreview({ html, state, onStateChange, className }: { html: string; state: PreviewState; onStateChange: (s: PreviewState) => void; className?: string }) {
  const debounced = useDebounced(html, 250);
  const { doc, notes, report } = React.useMemo(
    () => buildPreviewDocument(debounced, { profile: state.profile, dark: state.dark, blockRemoteImages: state.blockImages }),
    [debounced, state.profile, state.dark, state.blockImages],
  );
  const width = state.viewport === "custom" ? state.customWidth : VIEWPORTS.find((v) => v.id === state.viewport)!.width;
  const profile = getProfile(state.profile);
  const [fullscreen, setFullscreen] = React.useState(false);

  // Scale the frame down when the pane is narrower than the simulated viewport.
  const stageRef = React.useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = React.useState(0);
  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setStageWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = stageWidth && width + 32 > stageWidth ? Math.max(0.3, (stageWidth - 32) / width) : 1;
  const set = (patch: Partial<PreviewState>) => onStateChange({ ...state, ...patch });
  const removed = report.removedElements.length + report.removedAttributes.length;

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5">
        {VIEWPORTS.map((v) => {
          const Icon = VIEWPORT_ICONS[v.id];
          return (
            <Tooltip key={v.id}>
              <TooltipTrigger asChild>
                <Button size="icon-xs" variant={state.viewport === v.id ? "secondary" : "ghost"} onClick={() => set({ viewport: v.id })} aria-label={`${v.label} (${v.width}px)`} aria-pressed={state.viewport === v.id}>
                  <Icon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{v.label} · {v.width}px</TooltipContent>
            </Tooltip>
          );
        })}
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={200}
            max={1600}
            aria-label="Custom viewport width"
            value={state.viewport === "custom" ? state.customWidth : width}
            onChange={(e) => set({ viewport: "custom", customWidth: Math.min(1600, Math.max(200, Number(e.target.value) || 600)) })}
            className="h-7 w-[72px] px-2 text-xs tabular-nums"
          />
          <span className="text-muted-foreground text-xs">px</span>
        </div>
        <div className="bg-border mx-1 h-5 w-px" />
        <Select value={state.profile} onValueChange={(v) => set({ profile: v as ClientProfileId })}>
          <SelectTrigger size="sm" className="h-7 text-xs" aria-label="Client profile"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CLIENT_PROFILES.map((p) => <SelectItem key={p.id} value={p.id}>{p.shortLabel}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={state.dark} onValueChange={(v) => set({ dark: v as DarkMode })}>
          <SelectTrigger size="sm" className="h-7 text-xs" aria-label="Dark mode simulation">
            {state.dark === "off" ? <Sun /> : state.dark === "media" ? <Moon /> : <Contrast />}
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="off">Light</SelectItem>
            <SelectItem value="media">Dark (prefers-color-scheme)</SelectItem>
            <SelectItem value="invert">Dark (forced inversion, approx.)</SelectItem>
          </SelectContent>
        </Select>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon-xs" variant={state.blockImages ? "secondary" : "ghost"} onClick={() => set({ blockImages: !state.blockImages })} aria-label="Toggle remote images" aria-pressed={state.blockImages}>
              {state.blockImages ? <ImageOff /> : <ImageIcon />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{state.blockImages ? "Remote images blocked" : "Block remote images"}</TooltipContent>
        </Tooltip>
        <div className="ml-auto flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon-xs" variant="ghost" aria-label="About this preview"><Info /></Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-left">
              <p className="font-medium">{profile.label}</p>
              <p className="mt-1">Simulated: {profile.simulated.join("; ")}.</p>
              <p className="mt-1">Not simulated: {profile.notSimulated.join("; ")}.</p>
            </TooltipContent>
          </Tooltip>
          <Button size="icon-xs" variant="ghost" onClick={() => setFullscreen(true)} aria-label="Full-screen preview"><Maximize2 /></Button>
        </div>
      </div>
      {(state.profile !== "none" || notes.length > 0 || removed > 0) && (
        <div className="bg-muted/40 text-muted-foreground border-b px-3 py-1.5 text-[11px] leading-relaxed">
          {state.profile !== "none" && <p><span className="text-warning font-medium">Simulation:</span> {profile.description} Not the real client renderer.</p>}
          {notes.map((n) => <p key={n}>{n}</p>)}
          {removed > 0 && <p>Preview sanitizer removed {removed} unsafe item{removed === 1 ? "" : "s"} ({[...new Set([...report.removedElements, ...report.removedAttributes])].slice(0, 4).join(", ")}). Your source is unchanged.</p>}
        </div>
      )}
      <div ref={stageRef} className="bg-muted/30 bg-grid relative min-h-0 flex-1 overflow-hidden" data-testid="preview-stage">
        <div className="absolute inset-0 flex justify-center overflow-hidden p-4">
          <div
            className="shadow-xl ring-1 ring-black/10"
            style={{ width, height: `calc((100% ) / ${scale})`, transform: `scale(${scale})`, transformOrigin: "top center" }}
          >
            <PreviewFrame doc={doc} width={width} dark={state.dark} />
          </div>
        </div>
        <div className="bg-background/80 text-muted-foreground absolute right-2 bottom-2 rounded px-1.5 py-0.5 font-mono text-[10px]">
          {width}px{scale < 1 ? ` · ${Math.round(scale * 100)}%` : ""}
        </div>
      </div>
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="flex h-[92vh] max-w-[96vw] flex-col p-0 sm:max-w-[96vw]">
          <DialogTitle className="border-b px-4 py-3 text-sm">Preview · {profile.shortLabel} · {width}px</DialogTitle>
          <div className="bg-muted/30 flex min-h-0 flex-1 justify-center overflow-auto p-4">
            <PreviewFrame doc={doc} width={width} dark={state.dark} className="shadow-xl" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
