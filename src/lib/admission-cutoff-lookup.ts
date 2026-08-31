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

export type CutoffCandidate = { university: string; department: string; score: number };

const RECENT_YEARS = 3;

/**
 * 대학교명 + 모집단위가 정확히 일치하는 입결을 최근 연도순으로 가져온다.
 * 원본 데이터는 같은 학과라도 연도마다 전형(교과/지역인재/종합 등)이 여러 줄로 나뉘어
 * 있어서, 한 연도에 여러 행이 걸릴 수 있다 — 카드의 전형 유형(교과/종합)과 같은 트랙을
 * 우선으로, 그마저 없으면 첫 번째 행으로 연도당 한 줄만 남긴다.
 */
export async function fetchExactCutoffs(
  university: string,
  department: string,
  preferredTrack?: "교과" | "종합",
): Promise<CutoffMatch[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("admission_cutoffs")
    .select("year, track, admission_type, enrollment, competition_rate, additional_pass, grade_50, grade_70")
    .eq("university", university)
    .eq("department", department)
    .eq("admission_period", "수시")
    .order("year", { ascending: false })
    .order("admission_type", { ascending: true });

  const rows = data ?? [];
  const byYear = new Map<number, (typeof rows)[number]>();
  for (const row of rows) {
    const current = byYear.get(row.year);
    if (!current) {
      byYear.set(row.year, row);
    } else if (preferredTrack && current.track !== preferredTrack && row.track === preferredTrack) {
      byYear.set(row.year, row);
    }
  }

  return Array.from(byYear.values())
    .sort((a, b) => b.year - a.year)
    .slice(0, RECENT_YEARS);
}

/** wonseo 카드의 전형 유형 문자열을 admission_cutoffs.track 값으로 변환한다. */
export function trackFromCategory(category: string): "교과" | "종합" | undefined {
  if (category.includes("교과")) return "교과";
  if (category.includes("종합")) return "종합";
  return undefined;
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
