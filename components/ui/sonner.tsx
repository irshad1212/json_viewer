"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";
type ToastItem = {
  id: number;
  type: ToastType;
  message: React.ReactNode;
  duration: number;
};

const listeners = new Set<(toasts: ToastItem[]) => void>();
let queue: ToastItem[] = [];

const notify = () => listeners.forEach((fn) => fn(queue));

const remove = (id: number) => {
  queue = queue.filter((t) => t.id !== id);
  notify();
};

const push = (type: ToastType, message: React.ReactNode, duration = 3200) => {
  const id = Date.now() + Math.random();
  queue = [...queue, { id, type, message, duration }];
  notify();
  if (duration > 0) {
    setTimeout(() => remove(id), duration);
  }
  return id;
};

export const toast = {
  success(message: React.ReactNode, opts?: { duration?: number }) {
    return push("success", message, opts?.duration);
  },
  error(message: React.ReactNode, opts?: { duration?: number }) {
    return push("error", message, opts?.duration);
  },
  info(message: React.ReactNode, opts?: { duration?: number }) {
    return push("info", message, opts?.duration);
  }
};

type ToasterProps = {
  position?:
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left"
    | "bottom-center";
};

export function Toaster({ position = "top-right" }: ToasterProps) {
  const [ready] = useState(() => typeof document !== "undefined");
  const [toasts, setToasts] = useState<ToastItem[]>(() => (typeof document !== "undefined" ? [...queue] : []));

  useEffect(() => {
    if (!ready || typeof document === "undefined") return;
    listeners.add(setToasts);
    return () => {
      listeners.delete(setToasts);
    };
  }, [ready]);

  if (!ready || typeof document === "undefined" || toasts.length === 0) return null;

  const posClass =
    position === "top-right"
      ? "top-4 right-4"
      : position === "top-left"
        ? "top-4 left-4"
        : position === "bottom-right"
          ? "bottom-4 right-4"
          : position === "bottom-center"
            ? "bottom-6 left-1/2 -translate-x-1/2"
            : "bottom-4 left-4";

  return createPortal(
    <div className={cn("fixed z-50 flex flex-col gap-2 pointer-events-none items-center", posClass)}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex min-w-[260px] max-w-sm items-start gap-3 rounded-lg border px-3 py-3 shadow-lg backdrop-blur",
            "bg-white/90 border-border text-foreground dark:bg-zinc-900/90 dark:border-zinc-800",
            t.type === "success" && "border-emerald-500/50",
            t.type === "error" && "border-rose-500/50",
            t.type === "info" && "border-blue-500/50"
          )}
        >
          <div
            className={cn(
              "mt-1 h-2 w-2 rounded-full",
              t.type === "success" && "bg-emerald-500",
              t.type === "error" && "bg-rose-500",
              t.type === "info" && "bg-blue-500"
            )}
          />
          <div className="flex-1 text-sm leading-relaxed text-foreground dark:text-zinc-100">{t.message}</div>
          <button
            onClick={() => remove(t.id)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}
