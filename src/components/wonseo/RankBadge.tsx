"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import type { RankMode, WonseoCard } from "@/lib/database.types";

/**
 * 지망 순위 배지. 누르면 자동배정 → 미지정 → (텍스트 직접 입력) → 자동배정 순으로 순환한다.
 * 미지정에서 다음으로 넘어갈 때만 텍스트가 필요해서 작은 입력 모달을 띄운다.
 */
export function RankBadge({
  card,
  label,
  onUpdate,
}: {
  card: WonseoCard;
  label: string;
  onUpdate: (patch: { rank_mode: RankMode; rank?: string | null }) => void | Promise<void>;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState(card.rank ?? "");

  function handleClick() {
    if (card.rank_mode === "auto") {
      onUpdate({ rank_mode: "unassigned" });
    } else if (card.rank_mode === "unassigned") {
      setCustomText(card.rank ?? "");
      setCustomOpen(true);
    } else {
      onUpdate({ rank_mode: "auto" });
    }
  }

  async function handleCustomSave() {
    const text = customText.trim();
    if (!text) return;
    await onUpdate({ rank_mode: "custom", rank: text });
    setCustomOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="눌러서 지망 순위 상태를 바꿀 수 있어요"
        className="text-[11px] font-bold text-slate-900 hover:text-indigo-600 hover:underline underline-offset-2 transition"
      >
        {label}
      </button>
      <Modal
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        title="지망 순위 직접 입력"
        maxWidth="max-w-xs"
        footer={
          <>
            <button
              type="button"
              onClick={() => setCustomOpen(false)}
              className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleCustomSave}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition"
            >
              저장
            </button>
          </>
        }
      >
        <input
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCustomSave()}
          placeholder="예: 1지망(예비)"
          autoFocus
          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </Modal>
    </>
  );
}
