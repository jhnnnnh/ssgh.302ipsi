"use client";

import { useState } from "react";
import { Type } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import {
  DEFAULT_FONT_KEY,
  DEFAULT_FONT_SCALE_KEY,
  FONT_OPTIONS,
  FONT_SCALE_OPTIONS,
} from "@/lib/font-options";

const PREVIEW_TEXT = "가나다 ABC 123";

export function FontModal({
  open,
  onClose,
  currentFontKey,
  currentScaleKey,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  currentFontKey: string | null;
  currentScaleKey: string | null;
  onSave: (fontKey: string | null, scaleKey: string | null) => Promise<void>;
}) {
  const [selectedFont, setSelectedFont] = useState(currentFontKey ?? DEFAULT_FONT_KEY);
  const [selectedScale, setSelectedScale] = useState(currentScaleKey ?? DEFAULT_FONT_SCALE_KEY);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(
      selectedFont === DEFAULT_FONT_KEY ? null : selectedFont,
      selectedScale === DEFAULT_FONT_SCALE_KEY ? null : selectedScale,
    );
    setSaving(false);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="폰트 설정"
      icon={<Type className="w-4 h-4 text-indigo-600" />}
      maxWidth="max-w-sm"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={saving}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition disabled:opacity-60"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-60"
          >
            {saving ? "저장 중..." : "저장하기"}
          </button>
        </>
      }
    >
      <p className="text-slate-500 leading-relaxed">
        원하는 폰트와 글씨 크기를 골라보세요. 앱 전체에 반영되며, 다른 기기에서 로그인해도
        동일하게 적용됩니다.
      </p>

      <div>
        <label className="block font-bold text-slate-700 mb-1.5">글씨 크기</label>
        <div className="grid grid-cols-4 gap-1.5">
          {FONT_SCALE_OPTIONS.map((scale) => (
            <button
              key={scale.key}
              type="button"
              onClick={() => setSelectedScale(scale.key)}
              className={cn(
                "py-2 rounded-xl border font-bold text-[11px] transition",
                selectedScale === scale.key
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
              )}
            >
              {scale.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block font-bold text-slate-700 mb-1.5">폰트 종류</label>
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {FONT_OPTIONS.map((font) => (
            <button
              key={font.key}
              type="button"
              onClick={() => setSelectedFont(font.key)}
              className={cn(
                "w-full text-left px-3.5 py-2.5 rounded-2xl border transition flex items-center justify-between gap-3",
                selectedFont === font.key
                  ? "bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400"
                  : "bg-white border-slate-200 hover:bg-slate-50",
              )}
            >
              <span className="text-[11px] font-bold text-slate-500 shrink-0">{font.label}</span>
              <span
                className="text-slate-900 truncate"
                style={{ fontFamily: font.cssFamily, fontSize: `${font.sizeAdjust}rem` }}
              >
                {PREVIEW_TEXT}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
