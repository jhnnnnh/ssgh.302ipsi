import { createClient } from "@/lib/supabase/client";
import { emptyResultYear } from "@/components/wonseo/RecentResultsTable";
import type { RecentResultYear } from "@/lib/database.types";

export type CutoffMatch = {
  year: number;
  enrollment: string | null;
  competition_rate: string | null;
  additional_pass: string | null;
  grade_50: string | null;
  grade_70: string | null;
};

type CutoffRow = CutoffMatch & { track: string | null; admission_type: string | null };

export type CutoffCandidate = { university: string; department: string; score: number };

/** 같은 학과 안에서 고를 수 있는 전형 하나 — 가장 최근 연도 값을 미리보기로 같이 보여준다. */
export type AdmissionTypeOption = {
  admissionType: string;
  track: string | null;
  preview: CutoffMatch;
};

const RECENT_YEARS = 3;

/**
 * 학생이 실제로 지원하는 입시 학년도(수시를 접수하는 해의 다음 해)를 계산한다. "대학어디가"
 * 입결 데이터는 항상 그 전해까지의 실제 결과만 담고 있어서, 이 연도와 똑같은 모집인원 행은
 * 구조적으로 존재할 수 없다 — 그래서 카드 상단 모집인원을 "가장 최근 연도" 값으로 자동
 * 채우면 사실은 작년 숫자인데 올해 숫자인 것처럼 보이는 문제가 생긴다.
 */
export function currentAdmissionYear(): number {
  return new Date().getFullYear() + 1;
}

/** 대학교명 + 모집단위가 정확히 일치하는 입결 원본 행을 전부 가져온다(연도별로 안 묶은 상태). */
async function fetchCutoffRows(university: string, department: string): Promise<CutoffRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("admission_cutoffs")
    .select("year, track, admission_type, enrollment, competition_rate, additional_pass, grade_50, grade_70")
    .eq("university", university)
    .eq("department", department)
    .eq("admission_period", "수시")
    .order("year", { ascending: false })
    .order("admission_type", { ascending: true });
  return data ?? [];
}

/** 같은 연도에 전형이 두 개 이상 걸리는 행이 하나라도 있으면 학생에게 전형을 직접 고르게 한다. */
function isAmbiguous(rows: CutoffRow[]): boolean {
  const perYear = new Map<number, number>();
  for (const row of rows) perYear.set(row.year, (perYear.get(row.year) ?? 0) + 1);
  return [...perYear.values()].some((count) => count > 1);
}

/** 전형이 겹치지 않는 경우 그대로 최근 3개년으로 정리한다. */
function toRecentYears(rows: CutoffRow[]): CutoffMatch[] {
  const byYear = new Map<number, CutoffRow>();
  for (const row of rows) if (!byYear.has(row.year)) byYear.set(row.year, row);
  return [...byYear.values()].sort((a, b) => b.year - a.year).slice(0, RECENT_YEARS);
}

/** wonseo 카드의 전형 유형 문자열을 admission_cutoffs.track 값으로 변환한다(추천 표시용). */
export function trackFromCategory(category: string): "교과" | "종합" | undefined {
  if (category.includes("교과")) return "교과";
  if (category.includes("종합")) return "종합";
  return undefined;
}

/**
 * "종합(지역인재)" 같은 전형 문자열을 카드의 전형 유형/세부 전형명으로 나눈다.
 * 괄호가 없으면(예: "일반전형") 전체를 세부 전형명으로 쓴다.
 */
export function describeAdmissionType(admissionType: string): { category: string; subCategory: string } {
  const match = admissionType.match(/^(교과|종합)\((.+)\)$/);
  if (match) {
    return { category: match[1] === "교과" ? "학생부교과" : "학생부종합", subCategory: match[2] };
  }
  const category = admissionType.startsWith("교과")
    ? "학생부교과"
    : admissionType.startsWith("종합")
      ? "학생부종합"
      : "";
  return { category, subCategory: admissionType };
}

/** 전형 목록(중복 없이) — 카드의 전형 유형과 같은 트랙을 앞쪽에 정렬해서 고르기 쉽게 한다. */
function buildTypeOptions(rows: CutoffRow[], preferredTrack?: "교과" | "종합"): AdmissionTypeOption[] {
  const byType = new Map<string, CutoffRow>();
  for (const row of rows) {
    if (!row.admission_type) continue;
    if (!byType.has(row.admission_type)) byType.set(row.admission_type, row);
  }
  return [...byType.values()]
    .sort((a, b) => {
      if (preferredTrack) {
        const aMatch = a.track === preferredTrack ? 0 : 1;
        const bMatch = b.track === preferredTrack ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
      }
      return (a.admission_type ?? "").localeCompare(b.admission_type ?? "");
    })
    .map((row) => ({ admissionType: row.admission_type!, track: row.track, preview: row }));
}

export type ExactLookupResult =
  | { kind: "matched"; years: CutoffMatch[]; admissionType: string | null }
  | { kind: "choose_type"; options: AdmissionTypeOption[] }
  | { kind: "none" };

/**
 * 대학교명 + 모집단위로 정확히 일치하는 입결을 찾는다. 같은 학과·같은 연도에 전형이
 * 여러 개 걸리면 자동으로 하나를 고르지 않고 학생이 전형을 직접 선택하게 한다. 전형이 하나뿐이어도
 * 그게 카드의 전형 유형(교과/종합)과 다른 트랙이면 — 예: 종합으로 지원하는데 교과 데이터만 있는 경우 —
 * 다른 트랙 값을 조용히 채우면 안 되니 마찬가지로 선택하게 한다.
 */
export async function fetchExactCutoffs(
  university: string,
  department: string,
  preferredTrack?: "교과" | "종합",
): Promise<ExactLookupResult> {
  const rows = await fetchCutoffRows(university, department);
  if (rows.length === 0) return { kind: "none" };

  const trackMismatch = preferredTrack != null && !rows.some((r) => r.track === preferredTrack);
  if (isAmbiguous(rows) || trackMismatch) {
    return { kind: "choose_type", options: buildTypeOptions(rows, preferredTrack) };
  }
  return { kind: "matched", years: toRecentYears(rows), admissionType: rows[0]?.admission_type ?? null };
}

/** 학생이 전형을 직접 고른 뒤, 그 전형의 최근 3개년 입결만 가져온다. */
export async function fetchCutoffsForType(
  university: string,
  department: string,
  admissionType: string,
): Promise<CutoffMatch[]> {
  const rows = await fetchCutoffRows(university, department);
  return rows
    .filter((r) => r.admission_type === admissionType)
    .sort((a, b) => b.year - a.year)
    .slice(0, RECENT_YEARS);
}

/** 정확히 일치하는 게 없을 때 이름이 비슷한 (대학, 학과) 후보를 찾는다. */
export async function searchCutoffCandidates(
  university: string,
  department: string,
): Promise<CutoffCandidate[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("search_admission_cutoff_candidates", {
    p_university: university,
    p_department: department,
  });
  return data ?? [];
}

/**
 * 불러온 입결을 기존 최근 입결 표에 합친다. 같은 연도가 이미 있으면 그 행의
 * 모집인원/경쟁률/충원인원/50%컷/70%컷만 덮어쓰고, "나의 상대적 위치"는 절대 건드리지 않는다.
 */
export function mergeCutoffsIntoYears(
  existing: RecentResultYear[],
  fetched: CutoffMatch[],
): RecentResultYear[] {
  const byYear = new Map(existing.map((y) => [y.year, y]));
  for (const row of fetched) {
    const yearKey = String(row.year);
    const base = byYear.get(yearKey) ?? emptyResultYear(yearKey);
    byYear.set(yearKey, {
      ...base,
      enrollment: row.enrollment ?? base.enrollment,
      competitionRate: row.competition_rate ?? base.competitionRate,
      fillCount: row.additional_pass ?? base.fillCount,
      cut50: row.grade_50 ?? base.cut50,
      cut70: row.grade_70 ?? base.cut70,
    });
  }
  return Array.from(byYear.values()).sort((a, b) => Number(b.year) - Number(a.year));
}
