"use client";

// Lightweight two-panel resizer following the shadcn API shape.
// Supports horizontal orientation, a single handle, percent sizes, and min widths.

import * as React from "react";
import { cn } from "@/lib/utils";

type Orientation = "horizontal";

type PanelConfig = { defaultSize?: number; minSize?: number };

type ResizableContextValue = {
  orientation: Orientation;
  registerPanel: (config: PanelConfig) => number;
  sizes: [number, number];
  minSizes: [number, number];
  maxSizes: [number, number];
  setSizes: React.Dispatch<React.SetStateAction<[number, number]>>;
};

const ResizableContext = React.createContext<ResizableContextValue | null>(null);

export function ResizablePanelGroup({
  children,
  orientation = "horizontal",
  className
}: {
  children: React.ReactNode;
  orientation?: Orientation;
  className?: string;
}) {
  const [sizes, setSizes] = React.useState<[number, number]>([50, 50]);
  const [minSizes, setMinSizes] = React.useState<[number, number]>([15, 15]);
  const [maxSizes, setMaxSizes] = React.useState<[number, number]>([50, 100]);
  const countRef = React.useRef(0);
  const configsRef = React.useRef<PanelConfig[]>([{ defaultSize: 50, minSize: 15 }, { defaultSize: 50, minSize: 15 }]);

  const registerPanel = React.useCallback(
    (config: PanelConfig) => {
      const index = countRef.current;
      countRef.current += 1;
      configsRef.current[index] = {
        defaultSize: config.defaultSize ?? configsRef.current[index]?.defaultSize ?? 50,
        minSize: config.minSize ?? configsRef.current[index]?.minSize ?? 15
      };
      return index;
    },
    []
  );

  React.useEffect(() => {
    if (countRef.current === 2) {
      const left = configsRef.current[0];
      const right = configsRef.current[1];
      const leftDefault = left.defaultSize ?? 50;
      const rightDefault = right.defaultSize ?? 50;
      const total = leftDefault + rightDefault || 100;

      setSizes([
        (leftDefault / total) * 100,
        (rightDefault / total) * 100
      ]);

      setMinSizes([
        left.minSize ?? leftDefault ?? 15,
        right.minSize ?? rightDefault ?? 15
      ]);
      setMaxSizes([50, 100]);
    }
  }, []);

  const ctx: ResizableContextValue = React.useMemo(
    () => ({
      orientation,
      registerPanel,
      sizes,
      minSizes,
      maxSizes,
      setSizes
    }),
    [orientation, registerPanel, sizes, minSizes, maxSizes]
  );

  return (
    <ResizableContext.Provider value={ctx}>
      <div
        className={cn(
          "flex w-full h-full min-h-0 overflow-hidden",
          orientation === "horizontal" ? "flex-row" : "flex-col",
          className
        )}
      >
        {children}
      </div>
    </ResizableContext.Provider>
  );
}

export function ResizablePanel({
  children,
  defaultSize,
  minSize,
  className
}: {
  children: React.ReactNode;
  defaultSize?: string | number;
  minSize?: number;
  className?: string;
}) {
  const ctx = React.useContext(ResizableContext);
  if (!ctx) throw new Error("ResizablePanel must be used within ResizablePanelGroup");

  const normalizedDefault =
    typeof defaultSize === "string" ? parseFloat(defaultSize) : defaultSize;

  const [index] = React.useState(() =>
    ctx.registerPanel({
      defaultSize: normalizedDefault,
      minSize
    })
  );

  const size = index === 0 ? ctx.sizes[0] : ctx.sizes[1];
  const minPercent = index === 0 ? ctx.minSizes[0] : ctx.minSizes[1];
  const maxPercent = index === 0 ? ctx.maxSizes[0] : ctx.maxSizes[1];

  return (
    <div
      className={cn("flex flex-col min-h-0", className)}
      style={{
        flexBasis: `${size}%`,
        flexGrow: 0,
        flexShrink: 0,
        minWidth: ctx.orientation === "horizontal" ? `${minPercent}%` : undefined,
        maxWidth: ctx.orientation === "horizontal" ? `${maxPercent}%` : undefined
      }}
    >
      {children}
    </div>
  );
}

export function ResizableHandle({
  className,
  withHandle
}: {
  className?: string;
  withHandle?: boolean;
}) {
  const ctx = React.useContext(ResizableContext);
  if (!ctx) throw new Error("ResizableHandle must be used within ResizablePanelGroup");
  const isHorizontal = ctx.orientation === "horizontal";

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = e.currentTarget.parentElement as HTMLElement | null;
    if (!container) return;
    const leftEl = e.currentTarget.previousElementSibling as HTMLElement | null;
    const rightEl = e.currentTarget.nextElementSibling as HTMLElement | null;
    if (!leftEl || !rightEl) return;

    const start = isHorizontal ? e.clientX : e.clientY;
    const leftStart = isHorizontal ? leftEl.offsetWidth : leftEl.offsetHeight;
    const rightStart = isHorizontal ? rightEl.offsetWidth : rightEl.offsetHeight;
    const totalStart = leftStart + rightStart;

    const leftMinPx = (ctx.minSizes[0] / 100) * totalStart;
    const rightMinPx = (ctx.minSizes[1] / 100) * totalStart;
    const leftMaxPx = (ctx.maxSizes[0] / 100) * totalStart;
    const rightMaxPx = (ctx.maxSizes[1] / 100) * totalStart;

    const onMove = (event: PointerEvent) => {
      const current = isHorizontal ? event.clientX : event.clientY;
      const delta = current - start;
      let newLeft = leftStart + delta;
      let newRight = rightStart - delta;
      // clamp mins (absolute based on initial container width)
      if (newLeft < leftMinPx) {
        newRight -= leftMinPx - newLeft;
        newLeft = leftMinPx;
      }
      if (newRight < rightMinPx) {
        newLeft -= rightMinPx - newRight;
        newRight = rightMinPx;
      }
      // clamp maxes
      if (newLeft > leftMaxPx) {
        newRight += newLeft - leftMaxPx;
        newLeft = leftMaxPx;
      }
      if (newRight > rightMaxPx) {
        newLeft += newRight - rightMaxPx;
        newRight = rightMaxPx;
      }
      const totalNow = newLeft + newRight;
      const leftPct = (newLeft / totalNow) * 100;
      ctx.setSizes([leftPct, 100 - leftPct]);
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div
      role="separator"
      aria-orientation={isHorizontal ? "vertical" : "horizontal"}
      onPointerDown={onPointerDown}
      className={cn(
        "relative shrink-0",
        isHorizontal ? "w-3 cursor-col-resize" : "h-3 cursor-row-resize",
        className
      )}
    >
      {withHandle ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              "rounded-full bg-border/70",
              isHorizontal ? "h-10 w-1.5" : "w-10 h-1.5"
            )}
          />
        </div>
      ) : (
        <div
          className={cn(
            "absolute inset-1 rounded-md bg-transparent hover:bg-muted/70 dark:hover:bg-muted/40",
            isHorizontal ? "w-1" : "h-1"
          )}
        />
      )}
    </div>
  );
}
