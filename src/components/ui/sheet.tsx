"use client";
import * as React from "react";
import { Dialog as P } from "radix-ui";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const Sheet = (props: React.ComponentProps<typeof P.Root>) => <P.Root {...props} />;
const SheetTrigger = (props: React.ComponentProps<typeof P.Trigger>) => <P.Trigger {...props} />;
const SheetClose = (props: React.ComponentProps<typeof P.Close>) => <P.Close {...props} />;
function SheetContent({ className, children, side = "right", ...props }: React.ComponentProps<typeof P.Content> & { side?: "top" | "right" | "bottom" | "left" }) {
  return (
    <P.Portal>
      <P.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50" />
      <P.Content
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-200 data-[state=open]:duration-300",
          side === "right" && "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-md",
          side === "left" && "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-xs",
          side === "top" && "inset-x-0 top-0 h-auto border-b",
          side === "bottom" && "inset-x-0 bottom-0 h-auto border-t",
          className,
        )}
        {...props}
      >
        {children}
        <P.Close className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100">
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </P.Close>
      </P.Content>
    </P.Portal>
  );
}
const SheetHeader = ({ className, ...props }: React.ComponentProps<"div">) => <div className={cn("flex flex-col gap-1.5 p-4", className)} {...props} />;
const SheetTitle = ({ className, ...props }: React.ComponentProps<typeof P.Title>) => <P.Title className={cn("text-foreground font-semibold", className)} {...props} />;
const SheetDescription = ({ className, ...props }: React.ComponentProps<typeof P.Description>) => <P.Description className={cn("text-muted-foreground text-sm", className)} {...props} />;
export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription };
