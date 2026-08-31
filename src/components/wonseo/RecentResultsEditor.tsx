"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/providers/ToastProvider";
import { RESULT_ROWS, emptyResultYear } from "@/components/wonseo/RecentResultsTable";
import {
  fetchExactCutoffs,
  mergeCutoffsIntoYears,
  searchCutoffCandidates,
  trackFromCategory,
  type CutoffCandidate,
} from "@/lib/admission-cutoff-lookup";
import type { RecentResultYear } from "@/lib/database.types";

/** 카드 수정 모달 안에서 쓰는 편집 가능한 최근 입결 표. 저장은 모달의 "저장하기"가 담당한다. */
export function RecentResultsEditor({
  years,
  onChange,
  university,
  department,
  category,
}: {
  years: RecentResultYear[];
  onChange: (next: RecentResultYear[]) => void;
  /** 불러오기 매칭 기준. 카드에 입력된 대학교명/모집단위를 그대로 넘긴다. */
  university: string;
  department: string;
  /** 카드의 전형 유형("학생부교과"/"학생부종합" 등) — 같은 학과에 전형이 여러 줄 있을 때 우선 매칭에 쓴다. */
  category: string;
}) {
  const showToast = useToast();
  const [importing, setImporting] = useState(false);
  const [candidates, setCandidates] = useState<CutoffCandidate[] | null>(null);

  function updateCell(index: number, key: keyof RecentResultYear, value: string) {
    onChange(years.map((y, i) => (i === index ? { ...y, [key]: value } : y)));
  }

  function addYear() {
    const guess = years[0]?.year ? String(Number(years[0].year) + 1 || "") : String(new Date().getFullYear());
    onChange([emptyResultYear(guess), ...years]);
  }

  function removeYear(index: number) {
    onChange(years.filter((_, i) => i !== index));
  }

  async function applyMatch(matchUniversity: string, matchDepartment: string) {
    const matches = await fetchExactCutoffs(matchUniversity, matchDepartment, trackFromCategory(category));
    if (matches.length === 0) {
      showToast("일치하는 입결 데이터를 찾을 수 없습니다. 직접 입력해주세요.", "error");
      return;
    }
    onChange(mergeCutoffsIntoYears(years, matches));
    showToast(`${matches.length}개 연도의 입결을 불러왔습니다.`, "success");
  }

  async function handleImport() {
    const uni = university.trim();
    const dept = department.trim();
    if (!uni || !dept) {
      showToast("대학교명과 모집단위를 먼저 입력해 주세요.", "error");
      return;
    }

    setImporting(true);
    try {
      const exact = await fetchExactCutoffs(uni, dept, trackFromCategory(category));
      if (exact.length > 0) {
        onChange(mergeCutoffsIntoYears(years, exact));
        showToast(`${exact.length}개 연도의 입결을 불러왔습니다.`, "success");
        return;
      }

      const found = await searchCutoffCandidates(uni, dept);
      if (found.length === 0) {
        showToast("일치하는 입결 데이터를 찾을 수 없습니다. 직접 입력해주세요.", "error");
        return;
      }
      setCandidates(found);
    } catch {
      showToast("입결 데이터를 불러오지 못했습니다.", "error");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-2 border-t border-slate-100 pt-3">
      <div className="flex items-center justify-between">
        <label className="block font-bold text-slate-700">최근 입결</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addYear}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-bold flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            연도 추가
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={importing}
            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-[11px] font-bold disabled:opacity-60"
          >
            {importing ? "검색 중..." : "불러오기"}
          </button>
        </div>
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

      <Modal
        open={candidates != null}
        onClose={() => setCandidates(null)}
        title="비슷한 학과를 선택해 주세요"
        maxWidth="max-w-sm"
      >
        <p className="text-[11px] text-slate-400">
          정확히 일치하는 입결 데이터가 없어요. 아래 중 맞는 학과가 있으면 선택해 주세요.
        </p>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {candidates?.map((c) => (
            <button
              key={`${c.university}-${c.department}`}
              type="button"
              onClick={async () => {
                setCandidates(null);
                await applyMatch(c.university, c.department);
              }}
              className="w-full text-left px-3 py-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl transition"
            >
              <span className="font-bold text-slate-800">{c.university}</span>
              <span className="text-slate-500"> · {c.department}</span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
