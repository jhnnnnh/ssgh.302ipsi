"use client";

import { Plus, X } from "lucide-react";
import { RESULT_ROWS, emptyResultYear } from "@/components/wonseo/RecentResultsTable";
import type { RecentResultYear } from "@/lib/database.types";

/** 카드 수정 모달 안에서 쓰는 편집 가능한 최근 입결 표. 저장은 모달의 "저장하기"가 담당한다. */
export function RecentResultsEditor({
  years,
  onChange,
}: {
  years: RecentResultYear[];
  onChange: (next: RecentResultYear[]) => void;
}) {
  function updateCell(index: number, key: keyof RecentResultYear, value: string) {
    onChange(years.map((y, i) => (i === index ? { ...y, [key]: value } : y)));
  }

  function addYear() {
    const oldestYear = years[years.length - 1]?.year;
    const guess = oldestYear ? String(Number(oldestYear) - 1 || "") : String(new Date().getFullYear());
    onChange([...years, emptyResultYear(guess)]);
  }

  function removeYear(index: number) {
    onChange(years.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2 border-t border-slate-100 pt-3">
      <div className="flex items-center justify-between">
        <label className="block font-bold text-slate-700">최근 입결</label>
        <button
          type="button"
          onClick={addYear}
          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-bold flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          연도 추가
        </button>
      </div>

      {years.length === 0 ? (
        <p className="text-[11px] text-slate-400 text-center py-3 bg-slate-50 rounded-xl">
          등록된 입결 정보가 없습니다. 연도를 추가해 주세요.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="text-[11px] border-collapse w-full">
            <thead>
              <tr>
                <th className="text-left p-1.5 sticky left-0 bg-white" />
                {years.map((y, i) => (
                  <th key={i} className="p-1.5">
                    <div className="flex items-center gap-1">
                      <input
                        value={y.year}
                        onChange={(e) => updateCell(i, "year", e.target.value)}
                        placeholder="연도"
                        className="w-14 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                      <button
                        type="button"
                        onClick={() => removeYear(i)}
                        className="text-slate-300 hover:text-rose-500 shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RESULT_ROWS.map((row) => (
                <tr key={row.key} className="border-t border-slate-100">
                  <td className="text-slate-500 font-bold p-1.5 whitespace-nowrap sticky left-0 bg-white">
                    {row.label}
                  </td>
                  {years.map((y, i) => (
                    <td key={i} className="p-1.5">
                      <input
                        value={y[row.key]}
                        onChange={(e) => updateCell(i, row.key, e.target.value)}
                        className="w-16 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
