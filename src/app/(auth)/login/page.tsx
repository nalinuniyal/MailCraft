import Link from "next/link";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { signIn } from "@/lib/actions/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/dashboard";
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground mt-1 text-sm">Sign in to your MailCraft workspace.</p>
      </div>
      {sp.error === "link" && <p className="text-destructive text-sm">That link is invalid or has expired. Please try again.</p>}
      <AuthForm
        action={signIn}
        hidden={{ next }}
        submitLabel="Sign in"
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@company.com" },
          { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
        ]}
      />
      <div className="text-muted-foreground flex justify-between text-sm">
        <Link href="/forgot-password" className="hover:text-foreground underline-offset-4 hover:underline">Forgot password?</Link>
        <Link href="/signup" className="hover:text-foreground underline-offset-4 hover:underline">Create account</Link>
      </div>
    </div>
  );
}
