"use client";
import * as React from "react";
import { AlertDialog as P } from "radix-ui";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const AlertDialog = (props: React.ComponentProps<typeof P.Root>) => <P.Root {...props} />;
const AlertDialogTrigger = (props: React.ComponentProps<typeof P.Trigger>) => <P.Trigger {...props} />;
function AlertDialogContent({ className, ...props }: React.ComponentProps<typeof P.Content>) {
  return (
    <P.Portal>
      <P.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/60" />
      <P.Content
        className={cn("bg-popover data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl border p-6 shadow-2xl sm:max-w-md", className)}
        {...props}
      />
    </P.Portal>
  );
}
const AlertDialogHeader = ({ className, ...props }: React.ComponentProps<"div">) => <div className={cn("flex flex-col gap-2", className)} {...props} />;
const AlertDialogFooter = ({ className, ...props }: React.ComponentProps<"div">) => <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
const AlertDialogTitle = ({ className, ...props }: React.ComponentProps<typeof P.Title>) => <P.Title className={cn("text-lg font-semibold", className)} {...props} />;
const AlertDialogDescription = ({ className, ...props }: React.ComponentProps<typeof P.Description>) => <P.Description className={cn("text-muted-foreground text-sm", className)} {...props} />;
const AlertDialogAction = ({ className, ...props }: React.ComponentProps<typeof P.Action>) => <P.Action className={cn(buttonVariants(), className)} {...props} />;
const AlertDialogCancel = ({ className, ...props }: React.ComponentProps<typeof P.Cancel>) => <P.Cancel className={cn(buttonVariants({ variant: "outline" }), className)} {...props} />;
export { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel };
