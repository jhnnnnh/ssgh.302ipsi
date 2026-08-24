"use client";

import { useState } from "react";
import { RotateCcw, Settings } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import {
  DEFAULT_FONT_KEY,
  DEFAULT_FONT_SCALE_KEY,
  FONT_OPTIONS,
  FONT_SCALE_OPTIONS,
} from "@/lib/font-options";

const DEFAULT_SWATCH = "#16366b";
const PREVIEW_TEXT = "가나다 ABC 123";

export function AppearanceSettingsModal({
  open,
  onClose,
  currentColor,
  currentFontKey,
  currentScaleKey,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  currentColor: string | null;
  currentFontKey: string | null;
  currentScaleKey: string | null;
  onSave: (hex: string | null, fontKey: string | null, scaleKey: string | null) => Promise<void>;
}) {
  const [color, setColor] = useState(currentColor ?? DEFAULT_SWATCH);
  const [selectedFont, setSelectedFont] = useState(currentFontKey ?? DEFAULT_FONT_KEY);
  const [selectedScale, setSelectedScale] = useState(currentScaleKey ?? DEFAULT_FONT_SCALE_KEY);
  const [saving, setSaving] = useState(false);

  async function handleSave(hex: string | null) {
    setSaving(true);
    await onSave(
      hex,
      selectedFont === DEFAULT_FONT_KEY ? null : selectedFont,
      selectedScale === DEFAULT_FONT_SCALE_KEY ? null : selectedScale,
    );
    setSaving(false);
    onClose();
  }

  function handleReset() {
    setColor(DEFAULT_SWATCH);
    setSelectedFont(DEFAULT_FONT_KEY);
    setSelectedScale(DEFAULT_FONT_SCALE_KEY);
    handleSave(null);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="테마 및 폰트 설정"
      icon={<Settings className="w-4 h-4 text-indigo-600" />}
      maxWidth="max-w-sm"
      footer={
        <>
          <button
            onClick={handleReset}
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
      <div>
        <label className="block font-bold text-slate-700 mb-1.5">테마 색상</label>
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
      </div>

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
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
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
