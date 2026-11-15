"use client";
import * as React from "react";
import { DropdownMenu as P } from "radix-ui";
import { CheckIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const DropdownMenu = (props: React.ComponentProps<typeof P.Root>) => <P.Root data-slot="dropdown-menu" {...props} />;
const DropdownMenuTrigger = (props: React.ComponentProps<typeof P.Trigger>) => <P.Trigger data-slot="dropdown-menu-trigger" {...props} />;
const DropdownMenuGroup = (props: React.ComponentProps<typeof P.Group>) => <P.Group {...props} />;
const DropdownMenuSub = (props: React.ComponentProps<typeof P.Sub>) => <P.Sub {...props} />;
const DropdownMenuRadioGroup = (props: React.ComponentProps<typeof P.RadioGroup>) => <P.RadioGroup {...props} />;

function DropdownMenuContent({ className, sideOffset = 4, ...props }: React.ComponentProps<typeof P.Content>) {
  return (
    <P.Portal>
      <P.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn("bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[10rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-lg border p-1 shadow-lg", className)}
        {...props}
      />
    </P.Portal>
  );
}
function DropdownMenuItem({ className, inset, variant = "default", ...props }: React.ComponentProps<typeof P.Item> & { inset?: boolean; variant?: "default" | "destructive" }) {
  return (
    <P.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn("focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", className)}
      {...props}
    />
  );
}
function DropdownMenuRadioItem({ className, children, ...props }: React.ComponentProps<typeof P.RadioItem>) {
  return (
    <P.RadioItem className={cn("focus:bg-accent relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none", className)} {...props}>
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <P.ItemIndicator><CheckIcon className="size-4" /></P.ItemIndicator>
      </span>
      {children}
    </P.RadioItem>
  );
}
function DropdownMenuLabel({ className, inset, ...props }: React.ComponentProps<typeof P.Label> & { inset?: boolean }) {
  return <P.Label data-inset={inset} className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground data-[inset]:pl-8", className)} {...props} />;
}
function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof P.Separator>) {
  return <P.Separator className={cn("bg-border -mx-1 my-1 h-px", className)} {...props} />;
}
function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("text-muted-foreground ml-auto text-xs tracking-widest", className)} {...props} />;
}
function DropdownMenuSubTrigger({ className, inset, children, ...props }: React.ComponentProps<typeof P.SubTrigger> & { inset?: boolean }) {
  return (
    <P.SubTrigger data-inset={inset} className={cn("focus:bg-accent data-[state=open]:bg-accent flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8", className)} {...props}>
      {children}
      <ChevronRightIcon className="ml-auto size-4" />
    </P.SubTrigger>
  );
}
function DropdownMenuSubContent({ className, ...props }: React.ComponentProps<typeof P.SubContent>) {
  return (
    <P.Portal>
      <P.SubContent className={cn("bg-popover text-popover-foreground z-50 min-w-[8rem] overflow-hidden rounded-lg border p-1 shadow-lg", className)} {...props} />
    </P.Portal>
  );
}
export {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuItem,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub,
  DropdownMenuSubTrigger, DropdownMenuSubContent,
};
