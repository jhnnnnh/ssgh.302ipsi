"use client";

import { useEffect, useState } from "react";
import { GraduationCap, Paperclip } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { WonseoImageThumb } from "@/components/wonseo/WonseoImageThumb";
import { buildStoragePath, deleteWonseoImageFile, uploadWonseoImage } from "@/lib/wonseo-storage";
import {
  LEVEL_OPTIONS,
  LEVEL_TOGGLE_STYLE,
  QUICK_CATEGORY_OPTIONS,
  STATUS_OPTIONS,
} from "@/lib/wonseo-constants";
import { cn } from "@/lib/cn";
import type {
  ApplicationCategory,
  ApplicationStatus,
  SelectionMode,
  SupportLevel,
  WonseoCard,
  WonseoImage,
} from "@/lib/database.types";

interface FormState {
  rank: string;
  level: SupportLevel;
  status: ApplicationStatus;
  university: string;
  department: string;
  category: ApplicationCategory;
  subCategory: string;
  selectionMode: SelectionMode;
  stageSingle: string;
  stage1: string;
  stage2: string;
  calculatedGrade: string;
  minStandard: string;
  hasExamDate: boolean;
  examDate: string;
  memo: string;
}

const EMPTY_FORM: FormState = {
  rank: "",
  level: "적정",
  status: "지원예정",
  university: "",
  department: "",
  category: "학생부종합",
  subCategory: "",
  selectionMode: "single",
  stageSingle: "",
  stage1: "",
  stage2: "",
  calculatedGrade: "",
  minStandard: "",
  hasExamDate: false,
  examDate: "",
  memo: "",
};

function cardToForm(card: WonseoCard): FormState {
  return {
    rank: card.rank ?? "",
    level: card.level,
    status: card.status,
    university: card.university ?? "",
    department: card.department ?? "",
    category: card.category,
    subCategory: card.sub_category ?? "",
    selectionMode: card.selection_mode,
    stageSingle: card.stage_single ?? "",
    stage1: card.stage_1 ?? "",
    stage2: card.stage_2 ?? "",
    calculatedGrade: card.calculated_grade ?? "",
    minStandard: card.min_standard ?? "",
    hasExamDate: card.has_exam_date,
    examDate: card.exam_date ?? "",
    memo: card.memo ?? "",
  };
}

export function WonseoCardModal({
  open,
  onClose,
  studentId,
  editingCard,
  canEditStatus,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  studentId: string;
  editingCard: WonseoCard | null;
  canEditStatus: boolean;
  onSaved: () => void;
}) {
  const showToast = useToast();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [existingImages, setExistingImages] = useState<WonseoImage[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(editingCard ? cardToForm(editingCard) : EMPTY_FORM);
    setNewFiles([]);
    if (editingCard) {
      const supabase = createClient();
      supabase
        .from("wonseo_images")
        .select("*")
        .eq("card_id", editingCard.id)
        .then(({ data }) => setExistingImages(data ?? []));
    } else {
      setExistingImages([]);
    }
  }, [open, editingCard]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const isCustomCategory = !(QUICK_CATEGORY_OPTIONS as readonly string[]).includes(form.category);

  async function handleRemoveExistingImage(img: WonseoImage) {
    const supabase = createClient();
    await supabase.from("wonseo_images").delete().eq("id", img.id);
    await deleteWonseoImageFile(img.storage_path);
    setExistingImages((prev) => prev.filter((i) => i.id !== img.id));
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setNewFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  }

  async function handleSave() {
    if (!form.university.trim()) {
      showToast("대학교명을 입력해 주세요.", "error");
      return;
    }
    setSaving(true);
    const supabase = createClient();

    const payload = {
      student_id: studentId,
      rank: form.rank.trim() || null,
      level: form.level,
      status: form.status,
      university: form.university.trim(),
      department: form.department.trim() || null,
      category: form.category,
      sub_category: form.subCategory.trim() || null,
      selection_mode: form.selectionMode,
      stage_single: form.selectionMode === "single" ? form.stageSingle.trim() || null : null,
      stage_1: form.selectionMode === "multi" ? form.stage1.trim() || null : null,
      stage_2: form.selectionMode === "multi" ? form.stage2.trim() || null : null,
      calculated_grade: form.calculatedGrade.trim() || null,
      min_standard: form.minStandard.trim() || null,
      has_exam_date: form.hasExamDate,
      exam_date: form.hasExamDate ? form.examDate.trim() || null : null,
      memo: form.memo.trim() || null,
      updated_at: new Date().toISOString(),
    };

    let cardId = editingCard?.id ?? null;

    if (cardId) {
      const { error } = await supabase.from("wonseo_cards").update(payload).eq("id", cardId);
      if (error) {
        showToast("저장에 실패했습니다.", "error");
        setSaving(false);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("wonseo_cards")
        .insert(payload)
        .select("id")
        .single();
      if (error || !data) {
        showToast("저장에 실패했습니다.", "error");
        setSaving(false);
        return;
      }
      cardId = data.id;
    }

    for (const file of newFiles) {
      const path = buildStoragePath(studentId, cardId, file);
      try {
        await uploadWonseoImage(path, file);
        await supabase.from("wonseo_images").insert({
          card_id: cardId,
          student_id: studentId,
          storage_path: path,
        });
      } catch {
        showToast(`${file.name} 업로드에 실패했습니다.`, "error");
      }
    }

    setSaving(false);
    showToast("저장되었습니다.", "success");
    onSaved();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingCard ? "수시 원서 카드 수정" : "수시 원서 카드 등록"}
      icon={<GraduationCap className="w-4 h-4 text-indigo-600" />}
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-60"
          >
            {saving ? "저장 중..." : "저장하기"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block font-bold text-slate-700 mb-1">지망 순위</label>
          <input
            value={form.rank}
            onChange={(e) => set("rank", e.target.value)}
            placeholder="예: 1지망"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">지원 정도</label>
          <div className="grid grid-cols-4 gap-1.5">
            {LEVEL_OPTIONS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => set("level", level)}
                className={cn(
                  "py-2 rounded-xl border font-bold transition",
                  form.level === level
                    ? LEVEL_TOGGLE_STYLE[level].active
                    : LEVEL_TOGGLE_STYLE[level].inactive,
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>

      {canEditStatus && (
        <div className="border-t border-b border-slate-100 py-2.5">
          <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
            <span>진행 / 합격 상태</span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              선생님 전용
            </span>
          </label>
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value as ApplicationStatus)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block font-bold text-slate-700 mb-1">대학교명</label>
          <input
            value={form.university}
            onChange={(e) => set("university", e.target.value)}
            placeholder="OO대학교"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">모집단위 / 학과</label>
          <input
            value={form.department}
            onChange={(e) => set("department", e.target.value)}
            placeholder="OO학과 또는 OO학부"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block font-bold text-slate-700 mb-1">전형 유형</label>
          <div className="grid grid-cols-3 gap-1.5">
            {QUICK_CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => set("category", opt)}
                className={cn(
                  "py-2 rounded-xl border font-bold text-[11px] sm:text-xs transition",
                  form.category === opt
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
                )}
              >
                {opt}
              </button>
            ))}
            <button
              type="button"
              onClick={() => !isCustomCategory && set("category", "")}
              className={cn(
                "py-2 rounded-xl border font-bold text-[11px] sm:text-xs transition",
                isCustomCategory
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
              )}
            >
              직접입력
            </button>
          </div>
          {isCustomCategory && (
            <input
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              placeholder="전형 유형을 입력하세요"
              autoFocus
              className="w-full mt-1.5 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">세부 전형명</label>
          <input
            value={form.subCategory}
            onChange={(e) => set("subCategory", e.target.value)}
            placeholder="예: 지역균형전형 / 일반전형"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between">
          <label className="block font-bold text-slate-700">전형 방법</label>
          <div className="flex items-center gap-3 text-xs">
            <label className="inline-flex items-center gap-1 cursor-pointer font-semibold text-slate-700">
              <input
                type="radio"
                checked={form.selectionMode === "single"}
                onChange={() => set("selectionMode", "single")}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              <span>일괄전형</span>
            </label>
            <label className="inline-flex items-center gap-1 cursor-pointer font-semibold text-slate-700">
              <input
                type="radio"
                checked={form.selectionMode === "multi"}
                onChange={() => set("selectionMode", "multi")}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              <span>단계별 전형</span>
            </label>
          </div>
        </div>

        {form.selectionMode === "single" ? (
          <input
            value={form.stageSingle}
            onChange={(e) => set("stageSingle", e.target.value)}
            placeholder="예: 서류 100% 또는 교과 100%"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-0.5">1단계</label>
              <input
                value={form.stage1}
                onChange={(e) => set("stage1", e.target.value)}
                placeholder="예: 서류 100% (3배수)"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-0.5">2단계</label>
              <input
                value={form.stage2}
                onChange={(e) => set("stage2", e.target.value)}
                placeholder="예: 1단계 70% + 면접 30%"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block font-bold text-slate-700 mb-1">대학별 산출 등급</label>
          <input
            value={form.calculatedGrade}
            onChange={(e) => set("calculatedGrade", e.target.value)}
            placeholder="1.00 또는 970점"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">수능 최저학력기준</label>
          <input
            value={form.minStandard}
            onChange={(e) => set("minStandard", e.target.value)}
            placeholder="2개 합 5 이내 / 없음"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-2">
        <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
          <input
            type="checkbox"
            checked={form.hasExamDate}
            onChange={(e) => set("hasExamDate", e.target.checked)}
            className="rounded text-indigo-600 focus:ring-indigo-500"
          />
          <span>면접 / 고사 일정 등록</span>
        </label>
        {form.hasExamDate && (
          <input
            value={form.examDate}
            onChange={(e) => set("examDate", e.target.value)}
            placeholder="11/19(목) 14:00 면접"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        )}
      </div>

      <div>
        <label className="block font-bold text-slate-700 mb-1">메모</label>
        <textarea
          value={form.memo}
          onChange={(e) => set("memo", e.target.value)}
          rows={3}
          placeholder="메모할 사항을 자유롭게 입력하세요."
          className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-sans text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
        />
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between">
          <label className="block font-bold text-slate-700">이미지 파일 첨부</label>
          <label className="cursor-pointer px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-[11px] font-bold transition flex items-center gap-1">
            <Paperclip className="w-3 h-3" />
            <span>사진 선택</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2 pt-1 min-h-[40px]">
          {existingImages.map((img) => (
            <WonseoImageThumb
              key={img.id}
              path={img.storage_path}
              onRemove={() => handleRemoveExistingImage(img)}
            />
          ))}
          {newFiles.map((file, idx) => (
            <div
              key={idx}
              className="relative w-16 h-16 rounded-xl overflow-hidden border border-indigo-200 bg-slate-100 shrink-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0 inset-x-0 bg-indigo-600/80 text-white text-[9px] text-center">
                신규
              </span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
