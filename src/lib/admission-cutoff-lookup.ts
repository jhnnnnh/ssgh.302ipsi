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

const RECENT_YEARS = 3;

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

/** wonseo 카드의 전형 유형 문자열을 admission_cutoffs.track 값으로 변환한다(추천 표시용). */
export function trackFromCategory(category: string): "교과" | "종합" | undefined {
  if (category.includes("교과")) return "교과";
  if (category.includes("종합")) return "종합";
  return undefined;
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

/**
 * 이름을 비교하기 좋게 다듬는다. "교과"/"종합"/"전형"은 트랙을 나타내는 수식어일 뿐
 * 전형을 구분하는 진짜 이름이 아닌데, 두 원본이 이 수식어를 서로 다른 위치에 넣는다
 * (입결 쪽 "교과(지역인재)" vs 전형데이터 쪽 "지역인재전형(교과)") — 그대로 비교하면
 * 같은 전형인데도 문자열이 안 겹쳐서 다르다고 오판할 수 있어 미리 걷어낸다.
 */
function normalize(s: string): string {
  return s
    .replace(/\s+/g, "")
    .replace(/전형|교과|종합|\(|\)/g, "")
    .trim();
}

/** 이름이 완전히 같으면 2점, 한쪽이 다른 쪽을 포함하면 1점, 전혀 안 비슷하면 0점. */
function nameSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 2;
  // 너무 짧은 조각끼리의 포함 관계는 우연히 겹칠 수 있어 후보로 인정하지 않는다.
  if (Math.min(a.length, b.length) < 2) return 0;
  if (a.includes(b) || b.includes(a)) return 1;
  return 0;
}

/**
 * 최근 3개년 입결을 조용히, 최대한 자동으로 채운다. 이투스 전형데이터에서 이미 정해진
 * 세부 전형명과 이름이 실제로 비슷한 입결 전형이 있을 때만 채운다 — 두 데이터가 서로 다른
 * 원본이라 표기가 항상 똑같지는 않아서(예: "지역인재" vs "지역인재전형(교과)") 이름 포함
 * 관계까지는 인정하지만, 트랙(교과/종합)만 같다고 무작정 아무 전형이나 골라 쓰지는 않는다 —
 * 그러면 이번에 신설된 전형에 작년 이전 다른 전형의 입결이 잘못 붙어버릴 수 있다. 이름이
 * 비슷한 후보가 하나도 없으면(신설 전형 등) 사용자에게 다시 묻지 않고 그냥 비워 둔다.
 */
export async function fetchRecentResultsBestEffort(
  university: string,
  department: string,
  preferredTrack: "교과" | "종합" | undefined,
  hintAdmissionType: string,
): Promise<CutoffMatch[]> {
  const rows = await fetchCutoffRows(university, department);
  if (rows.length === 0) return [];

  const hint = normalize(hintAdmissionType);
  const trackOf = new Map<string, string | null>();
  for (const row of rows) {
    if (row.admission_type && !trackOf.has(row.admission_type)) {
      trackOf.set(row.admission_type, row.track);
    }
  }

  let best: { type: string; score: number; track: string | null } | null = null;
  for (const [type, track] of trackOf) {
    const score = nameSimilarity(normalize(type), hint);
    if (score === 0) continue;
    const better =
      !best ||
      score > best.score ||
      (score === best.score && preferredTrack != null && track === preferredTrack && best.track !== preferredTrack);
    if (better) best = { type, score, track };
  }
  if (!best) return [];

  return fetchCutoffsForType(university, department, best.type);
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
