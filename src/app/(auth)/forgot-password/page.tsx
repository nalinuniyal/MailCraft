import Link from "next/link";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { requestPasswordReset } from "@/lib/actions/auth";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
        <p className="text-muted-foreground mt-1 text-sm">We&apos;ll email you a secure reset link.</p>
      </div>
      <AuthForm action={requestPasswordReset} submitLabel="Send reset link" fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]} />
      <Link href="/login" className="text-muted-foreground hover:text-foreground text-sm">← Back to sign in</Link>
    </div>
  );
}
