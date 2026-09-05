import { createClient } from "@/lib/supabase/client";
import { QUICK_CATEGORY_OPTIONS } from "@/lib/wonseo-constants";

const OFFERING_COLUMNS =
  "admission_type, track, enrollment, selection_model, method_text, method_academic_quant, method_academic_qual, method_interview, method_essay, method_practical, method_document, method_stage1_score, method_etc, min_standard_applied, min_standard_text";

type OfferingRow = {
  admission_type: string;
  track: string;
  enrollment: number | null;
  selection_model: string;
  method_text: string | null;
  method_academic_quant: number | null;
  method_academic_qual: number | null;
  method_interview: number | null;
  method_essay: number | null;
  method_practical: number | null;
  method_document: number | null;
  method_stage1_score: number | null;
  method_etc: number | null;
  min_standard_applied: string | null;
  min_standard_text: string | null;
};

export type MergedOffering = {
  admissionType: string;
  track: string;
  enrollment: number | null;
  minStandard: string;
  selectionMode: "single" | "multi";
  methodSingle: string;
  methodStage1: string;
  methodStage2: string;
};

export type OfferingLookupResult =
  | { kind: "matched"; offering: MergedOffering }
  | { kind: "ambiguous"; options: MergedOffering[] }
  | { kind: "none" };

/** 카드의 전형 유형 문자열이 이투스 데이터의 "중심전형" 값과 정확히 같을 때만 자동완성 필터에 쓴다. */
export function trackForOffering(category: string): string | undefined {
  return (QUICK_CATEGORY_OPTIONS as readonly string[]).includes(category) ? category : undefined;
}

const METHOD_LABELS: { key: keyof OfferingRow; label: string }[] = [
  { key: "method_academic_quant", label: "학생부(정량)" },
  { key: "method_academic_qual", label: "학생부(정성)" },
  { key: "method_interview", label: "면접" },
  { key: "method_essay", label: "논술" },
  { key: "method_practical", label: "실기" },
  { key: "method_document", label: "서류" },
  { key: "method_stage1_score", label: "1단계성적" },
  { key: "method_etc", label: "기타" },
];

/** 값이 있는 항목만 "라벨+숫자" 형태로 이어붙인다(예: "학생부(정량)80 + 면접20"). 전부 비어 있으면 원문으로 대체. */
function buildMethodSummary(row: OfferingRow): string {
  const parts = METHOD_LABELS.filter(({ key }) => row[key] != null).map(({ key, label }) => `${label}${row[key]}`);
  if (parts.length > 0) return parts.join(" + ");
  return row.method_text ?? "";
}

function minStandardText(row: OfferingRow): string {
  return row.min_standard_applied === "Y" ? (row.min_standard_text ?? "") : "없음";
}

/** 단일 행을 그대로 하나의 후보(일괄전형 형태)로 보여준다 — 모양이 안 맞는 예외 케이스용. */
function rowToCandidate(row: OfferingRow): MergedOffering {
  return {
    admissionType: row.admission_type,
    track: row.track,
    enrollment: row.enrollment,
    minStandard: minStandardText(row),
    selectionMode: "single",
    methodSingle: buildMethodSummary(row),
    methodStage1: "",
    methodStage2: "",
  };
}

/** 같은 세부전형명의 행들("일괄합산" 1행 또는 "1단계"+"2단계" 각 1행)을 하나의 결과로 합친다. */
function toMerged(rows: OfferingRow[]): MergedOffering | null {
  if (rows.length === 1 && rows[0].selection_model === "일괄합산") {
    return rowToCandidate(rows[0]);
  }
  const stage1 = rows.find((r) => r.selection_model === "1단계");
  const stage2 = rows.find((r) => r.selection_model === "2단계");
  if (rows.length === 2 && stage1 && stage2) {
    return {
      admissionType: stage1.admission_type,
      track: stage1.track,
      enrollment: stage1.enrollment ?? stage2.enrollment,
      minStandard: minStandardText(stage1),
      selectionMode: "multi",
      methodSingle: "",
      methodStage1: buildMethodSummary(stage1),
      methodStage2: buildMethodSummary(stage2),
    };
  }
  return null;
}

/** 세부전형명별로 묶어서 후보 목록을 만든다. 모양이 안 맞는 그룹은 행 단위로 풀어서 보여준다. */
function groupByAdmissionType(rows: OfferingRow[]): MergedOffering[] {
  const byType = new Map<string, OfferingRow[]>();
  for (const row of rows) {
    const list = byType.get(row.admission_type) ?? [];
    list.push(row);
    byType.set(row.admission_type, list);
  }
  const result: MergedOffering[] = [];
  for (const group of byType.values()) {
    const merged = toMerged(group);
    if (merged) result.push(merged);
    else result.push(...group.map(rowToCandidate));
  }
  return result;
}

/**
 * 대학+모집단위+세부전형명이 정확히 일치하는 이투스 전형데이터를 찾는다. 원본 데이터는
 * 1행이 아니라 "1개 전형 = 일괄합산 1행 또는 1단계+2단계 각 1행"이라, 먼저 그 모양대로
 * 합쳐서 하나의 결과로 만든다. 그 모양을 벗어나는 경우(원본 데이터 자체의 중복 등, 매우
 * 드묾)는 각 행을 후보로 보여주고 학생이 고르게 한다.
 */
export async function findOfferingMatch(
  university: string,
  department: string,
  admissionType: string,
): Promise<OfferingLookupResult> {
  const supabase = createClient();
  const { data } = await supabase
    .from("admission_offerings")
    .select(OFFERING_COLUMNS)
    .eq("university", university)
    .eq("department", department)
    .eq("admission_type", admissionType);
  const rows = data ?? [];
  if (rows.length === 0) return { kind: "none" };

  const merged = toMerged(rows);
  if (merged) return { kind: "matched", offering: merged };

  return { kind: "ambiguous", options: rows.map(rowToCandidate) };
}

/**
 * 세부 전형명을 아직 안 골랐을 때 쓴다 — 대학+모집단위(+전형 유형)에 있는 이투스 전형을
 * 전부 훑어서 세부전형명별로 하나씩 후보를 만든다. 딱 하나뿐이면 바로 그걸 쓰면 되고,
 * 여러 개면 학생이 고르게 한다.
 */
export async function listOfferingCandidates(
  university: string,
  department: string,
  track?: string,
): Promise<MergedOffering[]> {
  const supabase = createClient();
  let query = supabase
    .from("admission_offerings")
    .select(OFFERING_COLUMNS)
    .eq("university", university)
    .eq("department", department);
  if (track) query = query.eq("track", track);
  const { data } = await query;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  return groupByAdmissionType(rows);
}

export type OfferingScheduleItem = {
  kind: string;
  label: string;
  /** "YYYY-MM-DD" */
  date: string;
};

/** raw 원본 열 이름 → 캘린더 일정 종류. 시작일이 있으면 시작일을, 없으면 종료일을 쓴다. */
const SCHEDULE_SPECS: { kind: string; label: string; startKey: string; endKey?: string }[] = [
  { kind: "원서접수", label: "원서접수 마감", startKey: "인터넷원서접수_종료" },
  { kind: "논술", label: "논술고사", startKey: "논술시기_시작", endKey: "논술시기_종료" },
  { kind: "면접", label: "면접고사", startKey: "면접시기_시작", endKey: "면접시기_종료" },
  { kind: "실기", label: "실기고사", startKey: "실기시기_시작", endKey: "실기시기_종료" },
  { kind: "서류제출", label: "서류제출 마감", startKey: "서류제출기한_종료" },
  { kind: "합격발표", label: "합격자 발표", startKey: "합격자발표시기" },
];

/** 이투스 원본 값(ISO 문자열/기타)에서 "YYYY-MM-DD"만 뽑는다. 못 알아보면 null. */
function parseDateOnly(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  // 액셀의 "시간만" 값이 1899-12-30 기준 일련번호로 파싱되는 경우가 있어(예: 마감시간
  // 컬럼) 진짜 입시 일정으로 보기 어려운 값은 걸러낸다.
  if (d.getUTCFullYear() < 2020) return null;
  return d.toISOString().slice(0, 10);
}

export type OfferingScheduleResult = { matched: boolean; items: OfferingScheduleItem[] };

/**
 * 대학+모집단위+세부전형명으로 이투스 전형데이터를 찾아 논술/면접/실기/원서접수/서류제출/
 * 합격발표 등 날짜가 있는 항목만 뽑아낸다. raw 원본을 그때그때 훑으므로 나중에 데이터가
 * 갱신돼도 최신 값을 본다(단, 실제로 캘린더에 추가한 뒤에는 그 시점 값이 스냅샷된다).
 * matched가 false면 그 세부전형명과 정확히 일치하는 행 자체가 없었다는 뜻이다
 * (표기가 달라서일 수 있으니 suggestOfferingAdmissionTypes로 비슷한 후보를 찾아본다).
 */
export async function findOfferingScheduleDates(
  university: string,
  department: string,
  admissionType: string,
): Promise<OfferingScheduleResult> {
  const supabase = createClient();
  const { data } = await supabase
    .from("admission_offerings")
    .select("raw")
    .eq("university", university)
    .eq("department", department)
    .eq("admission_type", admissionType)
    .limit(1);
  const raw = data?.[0]?.raw;
  if (!raw) return { matched: false, items: [] };

  const items: OfferingScheduleItem[] = [];
  for (const spec of SCHEDULE_SPECS) {
    const date = parseDateOnly(raw[spec.startKey]) ?? (spec.endKey ? parseDateOnly(raw[spec.endKey]) : null);
    if (date) items.push({ kind: spec.kind, label: spec.label, date });
  }
  return { matched: true, items };
}

/**
 * "교과"/"종합"/"전형"/괄호는 두 원본 사이에서 서로 다른 위치에 붙는 수식어일 뿐이라
 * 걷어내고 비교한다(admission-cutoff-lookup.ts의 최근입결 매칭과 같은 규칙).
 */
function normalizeForSimilarity(s: string): string {
  return s
    .replace(/\s+/g, "")
    .replace(/전형|교과|종합|\(|\)/g, "")
    .trim();
}

function nameSimilarityScore(a: string, b: string): number {
  const na = normalizeForSimilarity(a);
  const nb = normalizeForSimilarity(b);
  if (!na || !nb) return 0;
  if (na === nb) return 2;
  if (Math.min(na.length, nb.length) >= 2 && (na.includes(nb) || nb.includes(na))) return 1;
  return 0;
}

/**
 * 대학+모집단위에 정확히 일치하는 세부전형명이 없을 때, 이름이 비슷한 순서로 후보를
 * 추천한다(최대 5개). 카드의 세부전형명을 직접 고치지 않고, "이 전형 맞아요?"처럼
 * 골라서 확인하는 용도다. 힌트가 "교과"/"종합"처럼 수식어 하나뿐이면 정규화하고 나면
 * 아무것도 안 남아서 이름으로는 비교가 안 되므로, 그때는 카드의 전형 유형(트랙)이 같은
 * 후보를 그대로 보여준다(트랙도 없으면 그 학과의 전형을 전부 보여준다).
 */
export async function suggestOfferingAdmissionTypes(
  university: string,
  department: string,
  hintAdmissionType: string,
  preferredTrack?: string,
): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("admission_offerings")
    .select("admission_type, track")
    .eq("university", university)
    .eq("department", department);
  const rows = data ?? [];
  const trackByType = new Map<string, string>();
  for (const r of rows) if (!trackByType.has(r.admission_type)) trackByType.set(r.admission_type, r.track);

  const hint = normalizeForSimilarity(hintAdmissionType);
  if (!hint) {
    const types = [...trackByType.keys()];
    const preferred = preferredTrack ? types.filter((t) => trackByType.get(t) === preferredTrack) : [];
    return (preferred.length > 0 ? preferred : types).slice(0, 5);
  }

  return [...trackByType.keys()]
    .map((t) => ({ t, score: nameSimilarityScore(t, hintAdmissionType) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => x.t);
}
