"use client";
import * as React from "react";
import { ScrollArea as P } from "radix-ui";
import { cn } from "@/lib/utils";

function ScrollArea({ className, children, ...props }: React.ComponentProps<typeof P.Root>) {
  return (
    <P.Root data-slot="scroll-area" className={cn("relative overflow-hidden", className)} {...props}>
      <P.Viewport className="size-full rounded-[inherit] [&>div]:!block">{children}</P.Viewport>
      <ScrollBar />
      <P.Corner />
    </P.Root>
  );
}
function ScrollBar({ className, orientation = "vertical", ...props }: React.ComponentProps<typeof P.ScrollAreaScrollbar>) {
  return (
    <P.ScrollAreaScrollbar
      orientation={orientation}
      className={cn("flex touch-none p-px transition-colors select-none", orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent", orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent", className)}
      {...props}
    >
      <P.ScrollAreaThumb className="bg-border relative flex-1 rounded-full" />
    </P.ScrollAreaScrollbar>
  );
}
export { ScrollArea, ScrollBar };
