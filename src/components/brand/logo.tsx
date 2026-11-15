import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
      <defs>
        <linearGradient id="mc-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="oklch(0.72 0.17 285)" />
          <stop offset="1" stopColor="oklch(0.58 0.2 255)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#mc-g)" />
      <path d="M8 11.5 16 17l8-5.5M8.5 10h15a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 7 20.5v-9A1.5 1.5 0 0 1 8.5 10Z" fill="none" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m19.5 4.5.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" fill="white" />
    </svg>
  );
}

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      {!collapsed && (
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">MailCraft AI</div>
          <div className="text-muted-foreground text-[10px] tracking-wide uppercase">Email Developer Studio</div>
        </div>
      )}
    </div>
  );
}
