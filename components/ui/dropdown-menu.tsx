"use client";

import * as React from "react";
import { Menu } from "@base-ui/react/menu";
import { cn } from "@/lib/utils";

const DropdownMenu = Menu.Root;

const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Menu.Trigger>
>(({ className, children, ...props }, ref) => {
  return (
    <Menu.Trigger
      ref={ref}
      className={cn(
        "inline-flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-normal",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        "hover:bg-muted aria-expanded:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </Menu.Trigger>
  );
});
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof Menu.Popup> & { sideOffset?: number }
>(({ className, sideOffset = 4, ...props }, ref) => {
  return (
    <Menu.Portal>
      <Menu.Positioner sideOffset={sideOffset} className="z-50">
        <Menu.Popup
          ref={ref}
          className={cn(
            "min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md p-1",
            className
          )}
          {...props}
        />
      </Menu.Positioner>
    </Menu.Portal>
  );
});
DropdownMenuContent.displayName = "DropdownMenuContent";

const DropdownMenuRadioGroup = Menu.RadioGroup;

const DropdownMenuRadioItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof Menu.RadioItem>
>(({ className, children, ...props }, ref) => {
  return (
    <Menu.RadioItem
      ref={ref}
      className={cn(
        "flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
        "focus:bg-muted data-[checked=true]:bg-muted/70",
        className
      )}
      {...props}
    >
      <span className="mr-2 h-2.5 w-2.5 rounded-full border border-muted-foreground/60 data-[checked=true]:bg-foreground" />
      {children}
    </Menu.RadioItem>
  );
});
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
};
