import Link from "next/link";
import { Code2, ShieldCheck, Sparkles, MonitorSmartphone, Cloud, History } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { icon: Code2, title: "Email Code Studio", body: "Monaco editor, upload/paste, formatting, versioning and a split-screen sandboxed preview." },
  { icon: ShieldCheck, title: "Compatibility checks", body: "CSS & HTML feature detection mapped to Can I Email support data, with source and date shown." },
  { icon: Sparkles, title: "Claude-powered analysis", body: "Severity-ranked issues and reviewable fixes. Nothing changes without your approval." },
  { icon: MonitorSmartphone, title: "Responsive preview", body: "Desktop, tablet, mobile and custom widths, plus dark-mode simulation." },
  { icon: Cloud, title: "SFMC toolkit", body: "AMPscript & SSJS highlighting, snippets, personalization strings and lint warnings." },
  { icon: History, title: "Versions & QA reports", body: "Compare and restore versions; generate downloadable QA reports." },
];

export default function Home() {
  return (
    <div className="min-h-svh">
      <header className="mx-auto flex max-w-6xl items-center justify-between p-6">
        <Logo />
        <div className="flex gap-2">
          <Button asChild variant="ghost"><Link href="/login">Sign in</Link></Button>
          <Button asChild><Link href="/signup">Get started</Link></Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 pt-16 pb-24">
        <p className="text-primary font-mono text-xs tracking-widest uppercase">For HTML email developers</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">Build, debug and validate HTML email in one studio.</h1>
        <p className="text-muted-foreground mt-5 max-w-2xl text-lg">
          MailCraft AI combines a professional code editor, safe live previews, compatibility analysis and Claude-powered fixes.
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild size="lg"><Link href="/signup">Create free account</Link></Button>
          <Button asChild size="lg" variant="outline"><Link href="/login">Sign in</Link></Button>
        </div>
        <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-card rounded-xl border p-5">
              <f.icon className="text-primary size-5" />
              <h3 className="mt-3 font-medium">{f.title}</h3>
              <p className="text-muted-foreground mt-1 text-sm">{f.body}</p>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mt-12 text-xs">
          Previews simulate viewports and known client limitations; they do not reproduce real email client rendering engines.
        </p>
      </main>
    </div>
  );
}
