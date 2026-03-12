"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Sheet = DialogPrimitive.Root;

const SheetTrigger = DialogPrimitive.Trigger;

const SheetClose = DialogPrimitive.Close;

const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/40 backdrop-blur-sm", className)}
    {...props}
  />
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

const sheetVariants: Record<
  "top" | "bottom" | "left" | "right",
  string
> = {
  top: "inset-x-0 top-0 border-b rounded-b-lg data-[state=open]:animate-[sheet-in-top_280ms_cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:animate-[sheet-out-top_200ms_ease-in]",
  bottom:
    "inset-x-0 bottom-0 border-t rounded-t-lg data-[state=open]:animate-[sheet-in-bottom_280ms_cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:animate-[sheet-out-bottom_200ms_ease-in]",
  left:
    "inset-y-0 left-0 h-full w-3/4 max-w-sm border-r rounded-r-lg sm:w-[420px] data-[state=open]:animate-[sheet-in-left_280ms_cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:animate-[sheet-out-left_200ms_ease-in]",
  right:
    "inset-y-0 right-0 h-full w-3/4 max-w-sm border-l rounded-l-lg sm:w-[420px] data-[state=open]:animate-[sheet-in-right_280ms_cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:animate-[sheet-out-right_200ms_ease-in]"
};

type SheetContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  side?: "top" | "bottom" | "left" | "right";
};

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 flex flex-col overflow-hidden bg-[#0f131a] text-foreground shadow-2xl outline-none will-change-transform",
        "border border-zinc-800",
        sheetVariants[side],
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-2 top-2 rounded-md p-2 text-muted-foreground hover:bg-white/5 focus:outline-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = DialogPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("shrink-0 grid gap-1.5 p-4 pr-12 text-left", className)} {...props} />
);

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "shrink-0 flex flex-col gap-2 border-t border-zinc-800 bg-[#0f131a]/95 p-4 backdrop-blur sm:flex-row sm:justify-end",
      className
    )}
    {...props}
  />
);

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-sm font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-xs text-muted-foreground", className)}
    {...props}
  />
));
SheetDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
