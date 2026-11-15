import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { updatePassword } from "@/lib/actions/auth";
import { Logo } from "@/components/brand/logo";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function UpdatePasswordPage() {
  await requireUser();
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="grid w-full max-w-sm gap-6">
        <Logo />
        <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        <AuthForm action={updatePassword} submitLabel="Update password" fields={[{ name: "password", label: "New password", type: "password", autoComplete: "new-password" }]} />
      </div>
    </div>
  );
}
