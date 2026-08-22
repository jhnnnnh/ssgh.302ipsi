"use client";

import { useState } from "react";
import { Palette, RotateCcw } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

const DEFAULT_SWATCH = "#4f46e5";

export function ThemeColorModal({
  open,
  onClose,
  currentColor,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  currentColor: string | null;
  onSave: (hex: string | null) => Promise<void>;
}) {
  const [color, setColor] = useState(currentColor ?? DEFAULT_SWATCH);
  const [saving, setSaving] = useState(false);

  async function handleSave(hex: string | null) {
    setSaving(true);
    await onSave(hex);
    setSaving(false);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="테마 색상 설정"
      icon={<Palette className="w-4 h-4 text-indigo-600" />}
      maxWidth="max-w-sm"
      footer={
        <>
          <button
            onClick={() => handleSave(null)}
            disabled={saving}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-60"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>기본값으로</span>
          </button>
          <button
            onClick={() => handleSave(color)}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-60"
          >
            {saving ? "저장 중..." : "저장하기"}
          </button>
        </>
      }
    >
      <p className="text-slate-500 leading-relaxed">
        원하는 색을 자유롭게 골라보세요. 카드 헤더, 선택된 탭, 주요 버튼 등 앱의 강조 색상에
        반영되며, 다른 기기에서 로그인해도 동일하게 적용됩니다.
      </p>
      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-14 h-14 rounded-xl border border-slate-200 cursor-pointer bg-white p-1"
        />
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            선택한 색상
          </span>
          <span className="text-sm font-black text-slate-800 tracking-tight">{color}</span>
        </div>
      </div>
    </Modal>
  );
}
