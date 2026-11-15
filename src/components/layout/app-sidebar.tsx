"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS, SETTINGS_ITEM } from "./nav-items";

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

function NavLink({ item, collapsed, onNavigate }: { item: Item; collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors",
        active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      <item.icon className={cn("size-4 shrink-0", active ? "text-sidebar-primary" : "text-muted-foreground group-hover:text-foreground")} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-2 py-3 scrollbar-thin">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label} className="grid gap-0.5">
          {!collapsed && <p className="text-muted-foreground/70 mb-1 px-2.5 text-[10px] font-medium tracking-wider uppercase">{section.label}</p>}
          {section.items.map((item) => <NavLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} />)}
        </div>
      ))}
      <div className="mt-auto grid gap-0.5">
        <NavLink item={SETTINGS_ITEM} collapsed={collapsed} onNavigate={onNavigate} />
      </div>
    </nav>
  );
}

export function AppSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside
      className={cn("bg-sidebar text-sidebar-foreground hidden h-svh shrink-0 flex-col border-r transition-[width] duration-200 md:flex", collapsed ? "w-[60px]" : "w-60")}
      aria-label="Main navigation"
    >
      <div className={cn("flex h-14 items-center border-b px-3", collapsed && "justify-center px-0")}>
        <Link href="/dashboard" aria-label="MailCraft AI dashboard"><Logo collapsed={collapsed} /></Link>
      </div>
      <SidebarNav collapsed={collapsed} />
      <div className={cn("border-t p-2", collapsed && "flex justify-center")}>
        <button
          type="button"
          onClick={onToggle}
          className="text-muted-foreground hover:bg-sidebar-accent hover:text-foreground flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-xs"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="mx-auto size-4" /> : <><PanelLeftClose className="size-4" /> Collapse</>}
        </button>
      </div>
    </aside>
  );
}
