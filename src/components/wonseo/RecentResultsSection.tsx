"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { RecentResultsTable } from "@/components/wonseo/RecentResultsTable";
import type { RecentResultYear } from "@/lib/database.types";

/**
 * 카드 목록에서 최근 입결을 조회만 하는 아코디언.
 * 실제 입력/수정은 카드 수정 모달에서 이뤄진다 (다른 필드들과 동일한 패턴).
 */
export function RecentResultsSection({ years }: { years: RecentResultYear[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-slate-100 pt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-xs font-bold text-slate-600 hover:text-indigo-600 transition"
      >
        <span>최근 입결 {open ? "접기" : "보기"}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="mt-3">
          <RecentResultsTable years={years} />
        </div>
      )}
    </div>
  );
}
