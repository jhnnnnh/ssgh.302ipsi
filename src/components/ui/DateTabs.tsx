"use client";

import { cn } from "@/lib/cn";
import { formatDateLabel } from "@/lib/time";

export function DateTabs({
  dates,
  selected,
  onSelect,
}: {
  dates: string[];
  selected: string | null;
  onSelect: (date: string) => void;
}) {
  if (dates.length === 0) return null;
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
      {dates.map((d) => (
        <button
          key={d}
          onClick={() => onSelect(d)}
          className={cn(
            "shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold border transition whitespace-nowrap",
            selected === d
              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
          )}
        >
          {formatDateLabel(d)}
        </button>
      ))}
    </div>
  );
}
