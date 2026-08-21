"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, CircleX, Info } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastKind = "info" | "success" | "error";

interface ToastState {
  id: number;
  message: string;
  kind: ToastKind;
  visible: boolean;
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const KIND_STYLES: Record<ToastKind, string> = {
  info: "bg-slate-900 text-white border-slate-700",
  success: "bg-emerald-600 text-white border-emerald-500",
  error: "bg-rose-600 text-white border-rose-500",
};

const KIND_ICON: Record<ToastKind, React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: CheckCircle2,
  error: CircleX,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, kind, visible: true }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-4 left-4 sm:left-auto z-[100] flex flex-col items-end gap-2 pointer-events-none">
        {toasts.map((t) => {
          const Icon = KIND_ICON[t.kind];
          return (
            <div
              key={t.id}
              className={cn(
                "flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold max-w-sm animate-in fade-in slide-in-from-bottom-2",
                KIND_STYLES[t.kind],
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.showToast;
}
