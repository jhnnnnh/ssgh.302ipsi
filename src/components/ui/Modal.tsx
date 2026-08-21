"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export function Modal({
  open,
  onClose,
  title,
  icon,
  children,
  footer,
  maxWidth = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className={cn(
          "bg-white rounded-3xl p-6 w-full shadow-xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto",
          maxWidth,
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            {icon}
            <span>{title}</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-3.5 text-xs">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
