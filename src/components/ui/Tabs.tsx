"use client";

import { cn } from "@/lib/cn";

export interface TabItem {
  key: string;
  label: string;
  icon: React.ReactNode;
}

export function Tabs({
  items,
  active,
  onChange,
}: {
  items: TabItem[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex border-b border-slate-200 gap-4 sm:gap-6 text-sm font-bold flex-wrap pt-2">
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          className={cn(
            "pb-3 border-b-2 flex items-center gap-2 transition",
            active === item.key
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-400 hover:text-slate-800",
          )}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
