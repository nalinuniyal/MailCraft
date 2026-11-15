import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Setup required" };

export default function SetupPage() {
  if (isSupabaseConfigured()) redirect("/login");
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="bg-card grid w-full max-w-xl gap-5 rounded-xl border p-8">
        <Logo />
        <h1 className="text-xl font-semibold">Setup required</h1>
        <p className="text-muted-foreground text-sm">
          MailCraft needs a Supabase project for authentication and storage. Add these environment variables and restart the server:
        </p>
        <pre className="bg-muted overflow-x-auto rounded-md p-4 font-mono text-xs">{`NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon or publishable key>
ANTHROPIC_API_KEY=<server-side only>`}</pre>
        <p className="text-muted-foreground text-sm">Then apply the SQL in <code className="font-mono">supabase/migrations</code> and <code className="font-mono">supabase/seed.sql</code>. See README.md for details.</p>
      </div>
    </div>
  );
}
