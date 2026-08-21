import type { ApplicationStatus, SupportLevel } from "@/lib/database.types";

export const LEVEL_OPTIONS: SupportLevel[] = ["상향", "소신", "적정", "하향"];

/** 지원 정도 선택 버튼(입력 폼)의 활성/비활성 스타일 */
export const LEVEL_TOGGLE_STYLE: Record<SupportLevel, { active: string; inactive: string }> = {
  상향: {
    active: "bg-rose-600 text-white border-rose-600",
    inactive: "bg-white text-rose-600 border-rose-200 hover:bg-rose-50",
  },
  소신: {
    active: "bg-amber-500 text-white border-amber-500",
    inactive: "bg-white text-amber-600 border-amber-200 hover:bg-amber-50",
  },
  적정: {
    active: "bg-emerald-600 text-white border-emerald-600",
    inactive: "bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50",
  },
  하향: {
    active: "bg-blue-600 text-white border-blue-600",
    inactive: "bg-white text-blue-600 border-blue-200 hover:bg-blue-50",
  },
};

/** 원서 카드 목록에서 지원 정도를 강조하는 배지/테두리 스타일 */
export const LEVEL_EMPHASIS_STYLE: Record<SupportLevel, { badge: string; border: string; bar: string }> = {
  상향: { badge: "bg-rose-600 text-white", border: "border-rose-300", bar: "bg-rose-500" },
  소신: { badge: "bg-amber-500 text-white", border: "border-amber-300", bar: "bg-amber-500" },
  적정: { badge: "bg-emerald-600 text-white", border: "border-emerald-300", bar: "bg-emerald-500" },
  하향: { badge: "bg-blue-600 text-white", border: "border-blue-300", bar: "bg-blue-500" },
};

/** 전형 유형 빠른 선택 버튼 (그 외 값은 "직접입력"으로 취급) */
export const QUICK_CATEGORY_OPTIONS = ["학생부교과", "학생부종합"] as const;

export const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "지원예정", label: "지원예정" },
  { value: "원서접수", label: "원서접수 완료" },
  { value: "1차합격", label: "1차 합격" },
  { value: "최종합격", label: "🎉 최종 합격" },
  { value: "예비번호", label: "예비 번호" },
  { value: "불합격", label: "불합격" },
];

export const STATUS_BADGE_STYLE: Record<ApplicationStatus, string> = {
  지원예정: "bg-slate-100 text-slate-600 border-slate-200",
  원서접수: "bg-blue-50 text-blue-600 border-blue-200",
  "1차합격": "bg-amber-50 text-amber-700 border-amber-200",
  최종합격: "bg-emerald-50 text-emerald-700 border-emerald-200",
  예비번호: "bg-purple-50 text-purple-700 border-purple-200",
  불합격: "bg-rose-50 text-rose-600 border-rose-200",
};
