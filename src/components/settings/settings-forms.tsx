"use client";
import * as React from "react";
import { useTheme } from "next-themes";
import { Download, KeyRound, Loader2, LogOut, Save } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { changePassword, exportMyData, savePreferences, saveProfile } from "@/lib/actions/settings";
import { signOut } from "@/lib/actions/auth";
import { downloadText } from "@/lib/download";
import type { PreferencesRow } from "@/lib/types/database";

type Prefs = Pick<PreferencesRow, "theme" | "editor_font_size" | "editor_word_wrap" | "editor_minimap" | "autosave" | "default_viewport">;

export function SettingsForms({ email, displayName, prefs, system }: { email: string; displayName: string; prefs: Prefs; system: { ai: { label: string; models: { analyze: string; assist: string } } | null; aiPerHour: number; linksPerHour: number } }) {
  return (
    <div className="grid gap-5">
      <ProfileCard email={email} displayName={displayName} />
      <PreferencesCard initial={prefs} />
      <PasswordCard />
      <Card>
        <CardHeader><CardTitle>Workspace limits</CardTitle><CardDescription>Set by this deployment&apos;s environment.</CardDescription></CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <p className="flex items-center justify-between">AI provider {system.ai ? <Badge variant="success">{system.ai.label}</Badge> : <Badge variant="outline">Not configured</Badge>}</p>
          {system.ai && <p className="text-muted-foreground text-xs">Analysis and fixes: {system.ai.models.analyze} · Assistant: {system.ai.models.assist}</p>}
          <p className="flex items-center justify-between">AI requests per hour <span className="tabular-nums">{system.aiPerHour}</span></p>
          <p className="flex items-center justify-between">Link checks per hour <span className="tabular-nums">{system.linksPerHour}</span></p>
        </CardContent>
      </Card>
      <DataCard />
    </div>
  );
}

function ProfileCard({ email, displayName }: { email: string; displayName: string }) {
  const [name, setName] = React.useState(displayName);
  const [pending, setPending] = React.useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const res = await saveProfile({ display_name: name });
    setPending(false);
    if (res.ok) toast.success("Profile saved");
    else toast.error(res.error);
  }
  return (
    <Card>
      <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5"><Label htmlFor="s-name">Display name</Label><Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></div>
          <div className="grid gap-1.5"><Label htmlFor="s-email">Email</Label><Input id="s-email" value={email} readOnly disabled /></div>
          <Button type="submit" size="sm" className="justify-self-start" disabled={pending || name === displayName} data-testid="save-profile">{pending ? <Loader2 className="animate-spin" /> : <Save />} Save profile</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PreferencesCard({ initial }: { initial: Prefs }) {
  const [prefs, setPrefs] = React.useState(initial);
  const [pending, setPending] = React.useState(false);
  const { setTheme } = useTheme();
  const set = <K extends keyof Prefs>(k: K, v: Prefs[K]) => setPrefs((p) => ({ ...p, [k]: v }));
  const dirty = JSON.stringify(prefs) !== JSON.stringify(initial);
  async function submit() {
    setPending(true);
    const res = await savePreferences(prefs);
    setPending(false);
    if (!res.ok) return void toast.error(res.error);
    setTheme(prefs.theme);
    toast.success("Preferences saved. Editor changes apply the next time you open the studio.");
  }
  return (
    <Card>
      <CardHeader><CardTitle>Appearance & editor</CardTitle></CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label>Theme</Label>
            <Select value={prefs.theme} onValueChange={(v) => set("theme", v as Prefs["theme"])}>
              <SelectTrigger className="w-full" aria-label="Theme"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="dark">Dark</SelectItem><SelectItem value="light">Light</SelectItem><SelectItem value="system">System</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="s-font">Editor font size</Label>
            <Input id="s-font" type="number" min={10} max={24} value={prefs.editor_font_size} onChange={(e) => set("editor_font_size", Math.min(24, Math.max(10, Number(e.target.value) || 13)))} />
          </div>
          <div className="grid gap-1.5">
            <Label>Default preview</Label>
            <Select value={prefs.default_viewport} onValueChange={(v) => set("default_viewport", v as Prefs["default_viewport"])}>
              <SelectTrigger className="w-full" aria-label="Default preview"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="desktop">Desktop</SelectItem><SelectItem value="tablet">Tablet</SelectItem><SelectItem value="mobile">Mobile</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {([["editor_word_wrap", "Word wrap"], ["editor_minimap", "Minimap"], ["autosave", "Autosave"]] as const).map(([k, label]) => (
            <label key={k} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
              {label}
              <Switch checked={prefs[k]} onCheckedChange={(v) => set(k, v)} aria-label={label} />
            </label>
          ))}
        </div>
        <Button size="sm" className="justify-self-start" onClick={submit} disabled={pending || !dirty} data-testid="save-prefs">{pending ? <Loader2 className="animate-spin" /> : <Save />} Save preferences</Button>
      </CardContent>
    </Card>
  );
}

function PasswordCard() {
  const [pw, setPw] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [pending, setPending] = React.useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const res = await changePassword({ password: pw, confirm });
    setPending(false);
    if (!res.ok) return void toast.error(res.error);
    setPw("");
    setConfirm("");
    toast.success("Password changed");
  }
  return (
    <Card>
      <CardHeader><CardTitle>Account</CardTitle></CardHeader>
      <CardContent className="grid gap-4">
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5"><Label htmlFor="s-pw">New password</Label><Input id="s-pw" type="password" autoComplete="new-password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label htmlFor="s-pw2">Confirm password</Label><Input id="s-pw2" type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
          <Button type="submit" size="sm" variant="outline" className="justify-self-start" disabled={pending || pw.length < 8}>{pending ? <Loader2 className="animate-spin" /> : <KeyRound />} Change password</Button>
        </form>
        <form action={signOut}><Button type="submit" variant="ghost" size="sm"><LogOut /> Sign out</Button></form>
      </CardContent>
    </Card>
  );
}

function DataCard() {
  const [pending, setPending] = React.useState(false);
  async function exportData() {
    setPending(true);
    const res = await exportMyData();
    setPending(false);
    if (!res.ok) return void toast.error(res.error);
    downloadText(`mailcraft-export-${new Date().toISOString().slice(0, 10)}.json`, res.data.json, "application/json");
  }
  return (
    <Card>
      <CardHeader><CardTitle>Your data</CardTitle><CardDescription>Download every project, version, template, component and report you own as JSON.</CardDescription></CardHeader>
      <CardContent><Button variant="outline" size="sm" onClick={exportData} disabled={pending} data-testid="export-data">{pending ? <Loader2 className="animate-spin" /> : <Download />} Export my data</Button></CardContent>
    </Card>
  );
}
