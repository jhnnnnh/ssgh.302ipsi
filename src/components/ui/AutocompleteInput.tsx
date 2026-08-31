"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type AutocompleteOption = {
  /** 선택 시 입력 칸에 채워질 값. */
  value: string;
  /** 목록에 굵게 보여줄 이름. 보통 value와 같다. */
  label: string;
  /** 목록에 흐리게 같이 보여줄 부가 정보(예: 대학명, 학과명). */
  hint?: string;
};

const DEBOUNCE_MS = 150;
const MAX_OPTIONS = 20;

/**
 * 자유 입력을 그대로 두면서(강제 선택 아님) 보조로 추천 목록을 보여주는 입력 칸.
 * onSearch가 없으면 그냥 평범한 input처럼 동작한다(자동완성 비활성화).
 */
export const AutocompleteInput = forwardRef<
  HTMLInputElement,
  {
    value: string;
    onChange: (value: string) => void;
    onSearch?: (query: string) => Promise<AutocompleteOption[]>;
    placeholder?: string;
    className?: string;
  }
>(function AutocompleteInput({ value, onChange, onSearch, placeholder, className }, ref) {
  const [options, setOptions] = useState<AutocompleteOption[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function runSearch(query: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!onSearch || query.trim().length === 0) {
      setOptions([]);
      setOpen(false);
      return;
    }
    const requestId = ++requestIdRef.current;
    debounceRef.current = setTimeout(async () => {
      const results = await onSearch(query.trim());
      if (requestIdRef.current !== requestId) return;
      const limited = results.slice(0, MAX_OPTIONS);
      setOptions(limited);
      setActiveIndex(-1);
      setOpen(limited.length > 0);
    }, DEBOUNCE_MS);
  }

  function handleInputChange(next: string) {
    onChange(next);
    runSearch(next);
  }

  function selectOption(opt: AutocompleteOption) {
    onChange(opt.value);
    setOptions([]);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || options.length === 0) return;
    // keyCode is a fallback for automation/older browsers that don't populate e.key reliably.
    const isArrowDown = e.key === "ArrowDown" || e.keyCode === 40;
    const isArrowUp = e.key === "ArrowUp" || e.keyCode === 38;
    const isEnter = e.key === "Enter" || e.keyCode === 13;
    const isEscape = e.key === "Escape" || e.keyCode === 27;

    if (isArrowDown) {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (isArrowUp) {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (isEnter) {
      if (activeIndex >= 0) {
        e.preventDefault();
        selectOption(options[activeIndex]);
      }
    } else if (isEscape) {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={ref}
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => options.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />
      {open && options.length > 0 && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-72 overflow-y-auto py-1">
          {options.map((opt, i) => (
            <button
              type="button"
              key={`${opt.value}-${i}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectOption(opt)}
              className={cn(
                "w-full text-left px-3 py-2 text-xs transition",
                i === activeIndex ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-700",
              )}
            >
              <span className="font-semibold">{opt.label}</span>
              {opt.hint && <span className="text-slate-400 ml-1.5">{opt.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
