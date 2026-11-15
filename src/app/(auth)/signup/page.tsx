import Link from "next/link";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { signUp } from "@/lib/actions/auth";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-muted-foreground mt-1 text-sm">Your projects and templates are private to you.</p>
      </div>
      <AuthForm
        action={signUp}
        submitLabel="Create account"
        fields={[
          { name: "displayName", label: "Name", autoComplete: "name", placeholder: "Ada Lovelace", required: false },
          { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@company.com" },
          { name: "password", label: "Password", type: "password", autoComplete: "new-password", placeholder: "At least 8 characters" },
        ]}
      />
      <p className="text-muted-foreground text-sm">
        Already have an account? <Link href="/login" className="text-foreground underline-offset-4 hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
