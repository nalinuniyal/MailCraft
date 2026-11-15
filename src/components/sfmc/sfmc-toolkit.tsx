"use client";
import * as React from "react";
import { Check, Cloud, Copy, FileCode2, Info, Plus, Trash2, UserRound, ListChecks, Plug } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IssueList } from "@/components/analysis/issue-list";
import { PreviewFrame } from "@/components/preview/email-preview";
import { AMPSCRIPT_SNIPPETS, PERSONALIZATION_STRINGS } from "@/lib/sfmc/snippets";
import { lintAmpscript } from "@/lib/sfmc/lint";
import { DEFAULT_SUBSCRIBER, renderSubscriberPreview } from "@/lib/sfmc/preview";
import { buildPreviewDocument } from "@/lib/rendering/preview";
import { getProjectHtml } from "@/lib/actions/sfmc";
import type { Issue } from "@/lib/email/types";


const SAMPLE = `%%[
VAR @firstName
SET @firstName = AttributeValue("FirstName")
IF Empty(@firstName) THEN SET @firstName = "there" ENDIF
]%%
<p>Hi %%=v(@firstName)=%%,</p>
<p>Your account email is %%emailaddr%%.</p>
<p>Offer ends %%=FormatDate(DateAdd(Now(), 7, "D"), "MMMM d")=%%.</p>
<p style="font-size:12px">%%member_busname%% · %%member_addr%%, %%member_city%% · <a href="%%unsub_center_url%%">Unsubscribe</a></p>`;

function useCopy() {
  const [copied, setCopied] = React.useState<string | null>(null);
  return {
    copied,
    copy: async (id: string, text: string) => {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      toast.success("Copied");
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
    },
  };
}

export function SfmcToolkit({ projects }: { projects: { id: string; name: string }[] }) {
  const [source, setSource] = React.useState(SAMPLE);
  return (
    <Tabs defaultValue="preview" className="gap-4">
      <TabsList className="h-auto flex-wrap">
        <TabsTrigger value="preview"><UserRound /> Subscriber preview</TabsTrigger>
        <TabsTrigger value="lint"><ListChecks /> AMPscript checks</TabsTrigger>
        <TabsTrigger value="snippets"><FileCode2 /> Snippets</TabsTrigger>
        <TabsTrigger value="strings"><Cloud /> Personalization strings</TabsTrigger>
        <TabsTrigger value="integration"><Plug /> Integration</TabsTrigger>
      </TabsList>
      <TabsContent value="preview"><SourceEditor source={source} onChange={setSource} projects={projects} /><SubscriberPreviewPanel source={source} /></TabsContent>
      <TabsContent value="lint"><SourceEditor source={source} onChange={setSource} projects={projects} /><LintPanel source={source} /></TabsContent>
      <TabsContent value="snippets"><SnippetsPanel /></TabsContent>
      <TabsContent value="strings"><StringsPanel /></TabsContent>
      <TabsContent value="integration"><IntegrationPanel /></TabsContent>
    </Tabs>
  );
}

function SourceEditor({ source, onChange, projects }: { source: string; onChange: (s: string) => void; projects: { id: string; name: string }[] }) {
  async function load(id: string) {
    const res = await getProjectHtml(id);
    if (!res.ok) return void toast.error(res.error);
    onChange(res.data.html);
    toast.success(`Loaded “${res.data.name}”`);
  }
  return (
    <div className="mb-4 grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">Email HTML</span>
        {projects.length > 0 && (
          <Select onValueChange={(v) => void load(v)}>
            <SelectTrigger size="sm" className="w-64" aria-label="Load from project"><SelectValue placeholder="Load from a project…" /></SelectTrigger>
            <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </div>
      <Textarea value={source} onChange={(e) => onChange(e.target.value)} rows={8} className="font-mono text-xs" spellCheck={false} aria-label="Email HTML" data-testid="sfmc-source" />
    </div>
  );
}

function SubscriberPreviewPanel({ source }: { source: string }) {
  const [rows, setRows] = React.useState<[string, string][]>(Object.entries(DEFAULT_SUBSCRIBER));
  const subscriber = React.useMemo(() => Object.fromEntries(rows.filter(([k]) => k.trim())), [rows]);
  const result = React.useMemo(() => renderSubscriberPreview(source, subscriber), [source, subscriber]);
  const doc = React.useMemo(() => buildPreviewDocument(result.html, { profile: "none", dark: "off", blockRemoteImages: false }).doc, [result.html]);
  const set = (i: number, j: 0 | 1, v: string) => setRows((r) => r.map((row, n) => (n === i ? (j === 0 ? [v, row[1]] : [row[0], v]) : row)));
  return (
    <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
      <div className="grid content-start gap-2">
        <h3 className="text-sm font-medium">Sample subscriber</h3>
        <div className="grid gap-1.5">
          {rows.map(([k, v], i) => (
            <div key={i} className="flex gap-1.5">
              <Input value={k} onChange={(e) => set(i, 0, e.target.value)} className="w-44 font-mono text-xs" aria-label="Attribute name" />
              <Input value={v} onChange={(e) => set(i, 1, e.target.value)} className="text-xs" aria-label={`${k} value`} data-testid={`sub-${k}`} />
              <Button size="icon-sm" variant="ghost" aria-label={`Remove ${k}`} onClick={() => setRows((r) => r.filter((_, n) => n !== i))}><Trash2 /></Button>
            </div>
          ))}
        </div>
        <Button size="sm" variant="outline" className="justify-self-start" onClick={() => setRows((r) => [...r, ["", ""]])}><Plus /> Add attribute</Button>
      </div>
      <div className="grid content-start gap-3">
        <div className="bg-muted/40 flex gap-2 rounded-md border p-3 text-xs" data-testid="sfmc-preview-note">
          <Info className="text-info mt-0.5 size-4 shrink-0" />
          <div className="grid gap-1">
            <p><strong>Substitution preview, not AMPscript execution.</strong> Personalization strings and simple variables (<code>v(@x)</code> set from <code>AttributeValue()</code> or a literal outside IF/FOR) are filled in. Conditions, loops, lookups and other functions are not evaluated. Use Marketing Cloud&apos;s preview for the real result.</p>
            <p className="text-muted-foreground">
              {result.substituted.length} field{result.substituted.length === 1 ? "" : "s"} substituted · {result.removedBlocks} code block{result.removedBlocks === 1 ? "" : "s"} hidden · {result.unresolved.length} expression{result.unresolved.length === 1 ? "" : "s"} not evaluated
              {result.missingFields.length > 0 && <> · missing: {result.missingFields.map((f) => <Badge key={f} variant="warning" className="ml-1">{f}</Badge>)}</>}
            </p>
          </div>
        </div>
        <div className="h-[520px] overflow-hidden rounded-md border bg-white">
          <PreviewFrame doc={doc} width="100%" dark="off" title="Subscriber preview" className="w-full" />
        </div>
      </div>
    </div>
  );
}

function LintPanel({ source }: { source: string }) {
  const issues = React.useMemo<Issue[]>(() => lintAmpscript(source).map((d, i) => ({ ...d, id: `amp-${i}`, source: "rule", snippet: undefined })), [source]);
  const hasAmp = /%%[\[=]|runat\s*=\s*["']?server/i.test(source);
  return (
    <div className="grid gap-3">
      <p className="text-muted-foreground text-xs">Static checks: unclosed blocks, curly quotes, IF/ENDIF and FOR/NEXT balance, unrecognised functions and variables that are never set. These checks also run in the Code Studio whenever an email contains AMPscript.</p>
      {!hasAmp ? (
        <p className="text-muted-foreground py-8 text-center text-sm">No AMPscript found in this HTML.</p>
      ) : (
        <IssueList issues={issues} empty={<p className="text-success flex items-center justify-center gap-2 py-8 text-sm" data-testid="lint-clean"><Check className="size-4" /> No AMPscript problems found.</p>} />
      )}
    </div>
  );
}

function SnippetsPanel() {
  const { copied, copy } = useCopy();
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {AMPSCRIPT_SNIPPETS.map((s) => (
        <article key={s.id} className="bg-card grid content-start gap-2 rounded-xl border p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium">{s.title}</h3>
              <p className="text-muted-foreground text-xs">{s.description}</p>
            </div>
            <Button size="xs" variant="outline" onClick={() => void copy(s.id, s.code)}>{copied === s.id ? <Check /> : <Copy />} Copy</Button>
          </div>
          <pre className="bg-muted/40 scrollbar-thin overflow-x-auto rounded-md p-3 font-mono text-[11px] leading-relaxed">{s.code}</pre>
        </article>
      ))}
    </div>
  );
}

function StringsPanel() {
  const { copied, copy } = useCopy();
  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground text-xs">Commonly used Marketing Cloud personalization strings. Availability depends on your account and send type; check Salesforce&apos;s documentation for the full list.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {PERSONALIZATION_STRINGS.map((g) => (
          <section key={g.group} className="bg-card rounded-xl border">
            <h3 className="border-b px-4 py-2.5 text-sm font-medium">{g.group}</h3>
            <ul className="divide-y">
              {g.items.map((it) => (
                <li key={it.token} className="flex items-center justify-between gap-3 px-4 py-2">
                  <span className="min-w-0"><code className="text-primary text-xs">{it.token}</code><span className="text-muted-foreground block text-xs">{it.description}</span></span>
                  <Button size="icon-xs" variant="ghost" aria-label={`Copy ${it.token}`} onClick={() => void copy(it.token, it.token)}>{copied === it.token ? <Check /> : <Copy />}</Button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function IntegrationPanel() {
  const steps = [
    ["Installed package", "A server-to-server installed package in Marketing Cloud with Content Builder read/write scope. Its client ID and secret would be stored as server-only environment variables, never in the browser."],
    ["Token exchange", "MailCraft's server requests an access token from your tenant's auth endpoint and caches it until expiry."],
    ["Push to Content Builder", "\"Send to Marketing Cloud\" would create or update an HTML email asset via the Content Builder REST API, keeping the asset ID on the project."],
    ["Preview & test send", "Real AMPscript output would come from Marketing Cloud's own preview and test-send APIs, not from MailCraft."],
  ];
  return (
    <div className="grid gap-4">
      <div className="bg-muted/40 flex items-start gap-2 rounded-md border p-3 text-sm">
        <Info className="text-info mt-0.5 size-4 shrink-0" />
        <p><strong>Not connected.</strong> MailCraft does not talk to Marketing Cloud yet. This is the planned design; the interface lives in <code>src/lib/sfmc/integration.ts</code>.</p>
      </div>
      <ol className="grid gap-3 md:grid-cols-2">
        {steps.map(([t, d], i) => (
          <li key={t} className="bg-card rounded-xl border p-4">
            <span className="text-muted-foreground text-xs">Step {i + 1}</span>
            <h3 className="text-sm font-medium">{t}</h3>
            <p className="text-muted-foreground mt-1 text-xs">{d}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
