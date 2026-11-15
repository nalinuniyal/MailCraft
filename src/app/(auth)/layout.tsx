import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col p-6 md:p-10">
        <Link href="/" className="w-fit"><Logo /></Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
      <aside className="bg-sidebar relative hidden overflow-hidden border-l lg:block">
        <div className="bg-grid absolute inset-0 opacity-60" />
        <div className="relative flex h-full flex-col justify-center gap-6 p-14">
          <p className="text-primary font-mono text-xs tracking-widest uppercase">Email Developer Studio</p>
          <h2 className="max-w-md text-3xl font-semibold tracking-tight">Write, debug and ship HTML email with confidence.</h2>
          <ul className="text-muted-foreground max-w-md space-y-3 text-sm">
            <li>• Monaco editor with live, sandboxed preview</li>
            <li>• Compatibility checks backed by Can I Email data</li>
            <li>• AI-powered analysis and reviewable fixes</li>
            <li>• Versions, templates, components and SFMC toolkit</li>
          </ul>
          <pre className="bg-card text-muted-foreground max-w-md overflow-hidden rounded-lg border p-4 font-mono text-[11px] leading-relaxed">
{`<!--[if mso]>
<v:roundrect arcsize="12%" fillcolor="#6d5dfc">
<![endif]-->
<a href="%%=RedirectTo(@cta)=%%" class="btn">
  Get started
</a>`}
          </pre>
        </div>
      </aside>
    </div>
  );
}
