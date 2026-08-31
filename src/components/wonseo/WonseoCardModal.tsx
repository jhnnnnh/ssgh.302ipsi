"use client";

import { useEffect, useRef, useState } from "react";
import { GraduationCap, Paperclip } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { AutocompleteInput } from "@/components/ui/AutocompleteInput";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { WonseoImageThumb } from "@/components/wonseo/WonseoImageThumb";
import { RecentResultsEditor } from "@/components/wonseo/RecentResultsEditor";
import {
  describeAdmissionType,
  fetchCutoffsForType,
  fetchExactCutoffs,
  mergeCutoffsIntoYears,
  searchCutoffCandidates,
  trackFromCategory,
  type AdmissionTypeOption,
  type CutoffCandidate,
  type CutoffMatch,
} from "@/lib/admission-cutoff-lookup";
import { findAdmissionMethod } from "@/lib/admission-method-lookup";
import { summarizeMinStandard } from "@/lib/min-standard-format";
import { emptyResultYear } from "@/components/wonseo/RecentResultsTable";
import { buildStoragePath, deleteWonseoImageFile, uploadWonseoImage } from "@/lib/wonseo-storage";
import {
  prefetchUniversities,
  searchAdmissionTypes,
  searchDepartments,
  searchUniversities,
} from "@/lib/admission-cutoff-autocomplete";
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
  RecentResultYear,
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
  enrollment: string;
  category: ApplicationCategory;
  subCategory: string;
  selectionMode: SelectionMode;
  stageSingle: string;
  stage1: string;
  stage2: string;
  calculatedGrade: string;
  minStandard: string;
  hasExamDate: boolean;
  examDateAt: string;
  examMemo: string;
  memo: string;
  recentResults: RecentResultYear[];
}

const EMPTY_FORM: FormState = {
  rank: "",
  level: "적정",
  status: "지원예정",
  university: "",
  department: "",
  enrollment: "",
  category: "학생부교과",
  subCategory: "",
  selectionMode: "single",
  stageSingle: "",
  stage1: "",
  stage2: "",
  calculatedGrade: "",
  minStandard: "",
  hasExamDate: false,
  examDateAt: "",
  examMemo: "",
  memo: "",
  recentResults: [],
};

function defaultRecentResultYears(): RecentResultYear[] {
  const thisYear = new Date().getFullYear();
  return [thisYear, thisYear - 1, thisYear - 2].map((y) => emptyResultYear(String(y)));
}

function cardToForm(card: WonseoCard): FormState {
  return {
    rank: card.rank ?? "",
    level: card.level,
    status: card.status,
    university: card.university ?? "",
    department: card.department ?? "",
    enrollment: card.enrollment != null ? String(card.enrollment) : "",
    category: card.category,
    subCategory: card.sub_category ?? "",
    selectionMode: card.selection_mode,
    stageSingle: card.stage_single ?? "",
    stage1: card.stage_1 ?? "",
    stage2: card.stage_2 ?? "",
    calculatedGrade: card.calculated_grade ?? "",
    minStandard: card.min_standard ?? "",
    hasExamDate: card.has_exam_date,
    examDateAt: card.exam_date_at ?? "",
    examMemo: card.exam_memo ?? "",
    memo: card.memo ?? "",
    recentResults: card.recent_results ?? [],
  };
}

export function WonseoCardModal({
  open,
  onClose,
  studentId,
  editingCard,
  canEditStatus,
  nextSortOrder,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  studentId: string;
  editingCard: WonseoCard | null;
  canEditStatus: boolean;
  nextSortOrder?: number;
  onSaved: () => void;
}) {
  const showToast = useToast();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [existingImages, setExistingImages] = useState<WonseoImage[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [universityError, setUniversityError] = useState(false);
  const universityRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [candidates, setCandidates] = useState<CutoffCandidate[] | null>(null);
  const [typeOptions, setTypeOptions] = useState<AdmissionTypeOption[] | null>(null);
  const [pendingMatch, setPendingMatch] = useState<{ university: string; department: string } | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    prefetchUniversities();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(
      editingCard
        ? cardToForm(editingCard)
        : { ...EMPTY_FORM, recentResults: defaultRecentResultYears() },
    );
    setNewFiles([]);
    setUniversityError(false);
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

  /**
   * 입결 데이터를 찾으면 대학교명/모집단위/모집인원/전형 유형/세부 전형명과 최근 입결 표까지
   * 한 번에 채운다. "나의 상대적 위치"는 학생이 직접 쓰는 값이라 절대 건드리지 않는다.
   */
  async function applyImportedResult(
    matchUniversity: string,
    matchDepartment: string,
    years: CutoffMatch[],
    admissionType: string | null,
  ) {
    const desc = admissionType ? describeAdmissionType(admissionType) : null;
    const methodMatch = desc
      ? await findAdmissionMethod(matchUniversity, desc.category, desc.subCategory)
      : null;
    setForm((f) => ({
      ...f,
      university: matchUniversity,
      department: matchDepartment,
      enrollment: years[0]?.enrollment ?? f.enrollment,
      category: desc?.category || f.category,
      subCategory: desc ? desc.subCategory : f.subCategory,
      recentResults: mergeCutoffsIntoYears(f.recentResults, years),
      ...(methodMatch?.method
        ? { selectionMode: "single" as const, stageSingle: methodMatch.method }
        : {}),
      ...(methodMatch?.min_standard
        ? { minStandard: summarizeMinStandard(methodMatch.min_standard) ?? methodMatch.min_standard }
        : {}),
    }));
    const typeLabel = admissionType ? ` ${admissionType}` : "";
    showToast(`${matchUniversity} ${matchDepartment}${typeLabel} 데이터를 불러옵니다.`, "success");
  }

  async function resolveMatch(matchUniversity: string, matchDepartment: string) {
    const result = await fetchExactCutoffs(matchUniversity, matchDepartment, trackFromCategory(form.category));
    if (result.kind === "none") {
      const found = await searchCutoffCandidates(matchUniversity, matchDepartment);
      if (found.length === 0) {
        showToast("일치하는 입결 데이터를 찾을 수 없습니다. 직접 입력해주세요.", "error");
        return;
      }
      setCandidates(found);
      return;
    }
    if (result.kind === "choose_type") {
      setPendingMatch({ university: matchUniversity, department: matchDepartment });
      setTypeOptions(result.options);
      return;
    }
    await applyImportedResult(matchUniversity, matchDepartment, result.years, result.admissionType);
  }

  async function applyType(admissionType: string) {
    if (!pendingMatch) return;
    const matches = await fetchCutoffsForType(pendingMatch.university, pendingMatch.department, admissionType);
    const { university: matchUniversity, department: matchDepartment } = pendingMatch;
    setTypeOptions(null);
    setPendingMatch(null);
    if (matches.length === 0) {
      showToast("일치하는 입결 데이터를 찾을 수 없습니다. 직접 입력해주세요.", "error");
      return;
    }
    await applyImportedResult(matchUniversity, matchDepartment, matches, admissionType);
  }

  async function handleImport() {
    const uni = form.university.trim();
    const dept = form.department.trim();
    if (!uni || !dept) {
      showToast("대학교명과 모집단위를 먼저 입력해 주세요.", "error");
      return;
    }
    setImporting(true);
    try {
      await resolveMatch(uni, dept);
    } catch {
      showToast("입결 데이터를 불러오지 못했습니다.", "error");
    } finally {
      setImporting(false);
    }
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
      setUniversityError(true);
      showToast("대학교명을 입력해 주세요.", "error");
      universityRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      universityRef.current?.focus();
      return;
    }
    setUniversityError(false);
    setSaving(true);
    const supabase = createClient();

    const payload = {
      student_id: studentId,
      rank: form.rank.trim() || null,
      level: form.level,
      status: form.status,
      university: form.university.trim(),
      department: form.department.trim() || null,
      enrollment: form.enrollment.trim() ? Number(form.enrollment.trim()) : null,
      category: form.category,
      sub_category: form.subCategory.trim() || null,
      selection_mode: form.selectionMode,
      stage_single: form.selectionMode === "single" ? form.stageSingle.trim() || null : null,
      stage_1: form.selectionMode === "multi" ? form.stage1.trim() || null : null,
      stage_2: form.selectionMode === "multi" ? form.stage2.trim() || null : null,
      calculated_grade: form.calculatedGrade.trim() || null,
      min_standard: form.minStandard.trim() || null,
      has_exam_date: form.hasExamDate,
      exam_date_at: form.hasExamDate ? form.examDateAt || null : null,
      exam_memo: form.hasExamDate ? form.examMemo.trim() || null : null,
      memo: form.memo.trim() || null,
      recent_results: form.recentResults,
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
        .insert({ ...payload, sort_order: nextSortOrder ?? 0 })
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

      <div className="flex items-center justify-between">
        <label className="block font-bold text-slate-700">학교 · 학과 정보</label>
        <button
          type="button"
          onClick={handleImport}
          disabled={importing}
          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-[11px] font-bold disabled:opacity-60"
        >
          {importing ? "검색 중..." : "불러오기"}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block font-bold text-slate-700 mb-1">
            대학교명 {universityError && <span className="text-rose-500">(필수)</span>}
          </label>
          <AutocompleteInput
            ref={universityRef}
            value={form.university}
            onChange={(v) => {
              set("university", v);
              if (universityError) setUniversityError(false);
            }}
            onSearch={searchUniversities}
            placeholder="OO대학교"
            className={cn(
              "w-full bg-slate-50 border rounded-xl px-3 py-2.5 font-semibold text-slate-800 focus:outline-none focus:ring-2",
              universityError
                ? "border-rose-400 focus:ring-rose-400"
                : "border-slate-300 focus:ring-indigo-500",
            )}
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">모집단위 / 학과</label>
          <AutocompleteInput
            value={form.department}
            onChange={(v) => set("department", v)}
            onSearch={(q) => searchDepartments(q, form.university)}
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
          <AutocompleteInput
            value={form.subCategory}
            onChange={(v) => set("subCategory", v)}
            onSearch={
              form.university.trim()
                ? (q) =>
                    searchAdmissionTypes(
                      q,
                      form.university,
                      form.department,
                      trackFromCategory(form.category),
                    )
                : undefined
            }
            revealOnFocus
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block font-bold text-slate-700 mb-1">수능 최저학력기준</label>
          <textarea
            value={form.minStandard}
            onChange={(e) => set("minStandard", e.target.value)}
            rows={2}
            placeholder="2합5 / 없음"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">모집인원</label>
          <input
            value={form.enrollment}
            onChange={(e) => set("enrollment", e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            placeholder="예: 10"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">대학별 산출 등급</label>
          <input
            value={form.calculatedGrade}
            onChange={(e) => set("calculatedGrade", e.target.value)}
            placeholder="1.00 또는 970점"
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
          <span>일정 등록</span>
        </label>
        {form.hasExamDate && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-0.5">날짜</label>
              <input
                type="date"
                value={form.examDateAt}
                onChange={(e) => set("examDateAt", e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-0.5">메모</label>
              <input
                value={form.examMemo}
                onChange={(e) => set("examMemo", e.target.value)}
                placeholder="예: 면접, 고사, 실기"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      <RecentResultsEditor years={form.recentResults} onChange={(next) => set("recentResults", next)} />

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
                await resolveMatch(c.university, c.department);
              }}
              className="w-full text-left px-3 py-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl transition"
            >
              <span className="font-bold text-slate-800">{c.university}</span>
              <span className="text-slate-500"> · {c.department}</span>
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        open={typeOptions != null}
        onClose={() => {
          setTypeOptions(null);
          setPendingMatch(null);
        }}
        title="전형을 선택해 주세요"
        maxWidth="max-w-sm"
      >
        {(() => {
          const myTrack = trackFromCategory(form.category);
          const hasMyTrack = typeOptions?.some((o) => o.track === myTrack);
          if (myTrack && typeOptions && !hasMyTrack) {
            return (
              <p className="text-[11px] text-rose-500 font-bold">
                이 학과는 &ldquo;{form.category}&rdquo;(으)로 등록된 입결이 없어요. 다른 전형 데이터를
                참고용으로만 보여드려요 — 정확한 값이 아닐 수 있어요.
              </p>
            );
          }
          return (
            <p className="text-[11px] text-slate-400">
              {pendingMatch?.university} · {pendingMatch?.department}에 전형이 여러 개 있어요. 지원하는
              전형을 선택해 주세요.
            </p>
          );
        })()}
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {typeOptions?.map((opt) => (
            <button
              key={opt.admissionType}
              type="button"
              onClick={() => applyType(opt.admissionType)}
              className="w-full text-left px-3 py-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl transition"
            >
              <div className="font-bold text-slate-800">{opt.admissionType}</div>
              <div className="text-slate-400 text-[10px] mt-0.5">
                {opt.preview.year}학년도 · 모집 {opt.preview.enrollment ?? "-"}명 · 경쟁률{" "}
                {opt.preview.competition_rate ?? "-"}
              </div>
            </button>
          ))}
        </div>
      </Modal>

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
