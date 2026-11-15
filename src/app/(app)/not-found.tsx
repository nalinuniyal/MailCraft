import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-primary font-mono text-sm">404</p>
      <h2 className="font-semibold">Not found</h2>
      <p className="text-muted-foreground text-sm">This item doesn&apos;t exist or you don&apos;t have access to it.</p>
      <Button asChild size="sm" variant="outline"><Link href="/dashboard">Back to dashboard</Link></Button>
    </div>
  );
}
