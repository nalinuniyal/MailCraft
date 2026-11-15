"use client";
import * as React from "react";
import Link from "next/link";
import { Menu, Plus } from "lucide-react";
import { AppSidebar, SidebarNav } from "./app-sidebar";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Logo } from "@/components/brand/logo";

const COOKIE = "mc_sidebar_collapsed";

export function AppShell({
  children,
  initialCollapsed,
  user,
}: {
  children: React.ReactNode;
  initialCollapsed: boolean;
  user: { email: string | null; name: string | null };
}) {
  const [collapsed, setCollapsed] = React.useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const toggle = React.useCallback(() => {
    setCollapsed((c) => {
      document.cookie = `${COOKIE}=${!c ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
      return !c;
    });
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b" && !(e.target as HTMLElement)?.closest(".monaco-editor")) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return (
    <div className="flex h-svh overflow-hidden">
      <AppSidebar collapsed={collapsed} onToggle={toggle} />
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="bg-sidebar w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-14 items-center border-b px-3"><Logo /></div>
          <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 flex h-14 shrink-0 items-center gap-2 border-b px-3 backdrop-blur md:px-5">
          <Button variant="ghost" size="icon-sm" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu />
          </Button>
          <div id="page-toolbar" className="flex min-w-0 flex-1 items-center gap-2" />
          <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
            <Link href="/projects?new=1"><Plus /> New email</Link>
          </Button>
          <ThemeToggle />
          <UserMenu email={user.email} name={user.name} />
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">{children}</main>
      </div>
    </div>
  );
}
