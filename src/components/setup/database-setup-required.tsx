import { Database } from "lucide-react";

/**
 * Shown instead of the app when the Supabase project has no MailCraft tables
 * yet, so a fresh deployment explains what to do rather than crashing.
 */
export function DatabaseSetupRequired() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="bg-card grid max-w-lg gap-4 rounded-xl border p-6">
        <span className="bg-primary/10 flex size-11 items-center justify-center rounded-full"><Database className="text-primary size-5" /></span>
        <div className="grid gap-1.5">
          <h1 className="text-lg font-semibold">Finish setting up the database</h1>
          <p className="text-muted-foreground text-sm">
            You are signed in, but this Supabase project doesn&apos;t have MailCraft&apos;s tables yet, so there is nothing to load.
          </p>
        </div>
        <ol className="text-muted-foreground list-decimal space-y-1.5 pl-5 text-sm">
          <li>Open your Supabase project, then <span className="text-foreground">SQL Editor</span>.</li>
          <li>Paste and run <code className="text-foreground">supabase/migrations/20261115000001_init.sql</code> from the repository.</li>
          <li>Then paste and run <code className="text-foreground">supabase/seed.sql</code> to add the starter templates and components.</li>
          <li>Reload this page.</li>
        </ol>
        <p className="text-muted-foreground text-xs">Accounts created before the schema existed are picked up automatically.</p>
      </div>
    </main>
  );
}

/** PostgREST "table not in schema cache" or Postgres "relation does not exist". */
export function isMissingSchemaError(error: { code?: string } | null | undefined) {
  return error?.code === "PGRST205" || error?.code === "42P01";
}
