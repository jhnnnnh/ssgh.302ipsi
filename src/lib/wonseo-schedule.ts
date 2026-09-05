import { createClient } from "@/lib/supabase/client";
import { DEFAULT_EVENT_COLOR } from "@/lib/calendar-constants";
import {
  findOfferingScheduleDates,
  suggestOfferingAdmissionTypes,
  trackForOffering,
} from "@/lib/admission-offering-lookup";

export type ScheduleItem = {
  /** "원서접수" | "논술" | "면접" | "실기" | "서류제출" | "합격발표" | "직접등록" */
  kind: string;
  label: string;
  /** "YYYY-MM-DD" */
  date: string;
  added: boolean;
};

export type CardScheduleGroup = {
  cardId: string;
  studentId: string;
  studentName: string | null;
  grade: number | null;
  classNo: number | null;
  university: string;
  department: string | null;
  subCategory: string | null;
  items: ScheduleItem[];
  /** 세부전형명이 전형데이터와 정확히 일치하지 않을 때, 이름이 비슷한 추천 후보(최대 5개). */
  suggestions: string[];
};

/**
 * "내 원서 일정" 팝업의 목록을 만든다. 카드마다 (1) 대학+학과+세부전형명이 전형데이터와
 * 정확히 매칭되면 그 전형의 논술/면접/실기/원서접수/서류제출/합격발표 날짜를, 정확히
 * 안 맞으면 이름이 비슷한 전형 추천 후보를, (2) 카드에 직접 등록해 둔 "일정 등록"
 * (exam_date_at) 한 건을 함께 모아 보여준다. 이미 캘린더에 넣은 항목은 added:true로
 * 표시해 중복 추가를 막는다. 학생 모드는 studentId만, 교사 모드는 classScope만 넘긴다.
 */
export async function findWonseoScheduleGroups({
  studentId,
  classScope,
}: {
  studentId?: string;
  classScope?: { grade: number; classNo: number };
}): Promise<CardScheduleGroup[]> {
  const supabase = createClient();

  let studentIds: string[];
  let gradeByStudent: Map<string, { grade: number; classNo: number }>;
  let nameByStudent = new Map<string, string>();

  if (studentId) {
    const [{ data: grade }, { data: classNo }] = await Promise.all([
      supabase.rpc("current_student_grade"),
      supabase.rpc("current_student_class_no"),
    ]);
    if (grade == null || classNo == null) return [];
    studentIds = [studentId];
    gradeByStudent = new Map([[studentId, { grade, classNo }]]);
  } else if (classScope) {
    const { data: rosterRows } = await supabase
      .from("roster")
      .select("student_id, name, grade, class_no")
      .eq("grade", classScope.grade)
      .eq("class_no", classScope.classNo);
    studentIds = (rosterRows ?? []).map((r) => r.student_id);
    gradeByStudent = new Map(
      (rosterRows ?? []).map((r) => [r.student_id, { grade: r.grade!, classNo: r.class_no! }]),
    );
    nameByStudent = new Map((rosterRows ?? []).map((r) => [r.student_id, r.name]));
  } else {
    return [];
  }

  if (studentIds.length === 0) return [];

  const { data: cards } = await supabase
    .from("wonseo_cards")
    .select("id, student_id, university, department, sub_category, category, has_exam_date, exam_date_at, exam_memo")
    .in("student_id", studentIds)
    .not("university", "is", null);
  if (!cards || cards.length === 0) return [];

  const cardIds = cards.map((c) => c.id);
  const { data: existing } = await supabase
    .from("calendar_events")
    .select("wonseo_card_id, type, kind")
    .in("wonseo_card_id", cardIds);

  const addedLinked = new Set(
    (existing ?? []).filter((e) => e.type === "wonseo_linked").map((e) => e.wonseo_card_id as string),
  );
  const addedSchedule = new Set(
    (existing ?? []).filter((e) => e.type === "wonseo_schedule").map((e) => `${e.wonseo_card_id}::${e.kind}`),
  );

  const offeringResults = await Promise.all(
    cards.map((card) =>
      card.department && card.sub_category
        ? findOfferingScheduleDates(card.university!, card.department, card.sub_category)
        : Promise.resolve({ matched: true, items: [] }),
    ),
  );
  const suggestionsByCard = await Promise.all(
    cards.map((card, i) =>
      !offeringResults[i].matched && card.department && card.sub_category
        ? suggestOfferingAdmissionTypes(
            card.university!,
            card.department,
            card.sub_category,
            trackForOffering(card.category),
          )
        : Promise.resolve([] as string[]),
    ),
  );

  const groups: CardScheduleGroup[] = [];
  cards.forEach((card, i) => {
    if (!card.university) return;
    const items: ScheduleItem[] = offeringResults[i].items.map((oi) => ({
      kind: oi.kind,
      label: oi.label,
      date: oi.date,
      added: addedSchedule.has(`${card.id}::${oi.kind}`),
    }));

    if (card.has_exam_date && card.exam_date_at) {
      items.push({
        kind: "직접등록",
        label: card.exam_memo || "직접 등록한 일정",
        date: card.exam_date_at,
        added: addedLinked.has(card.id),
      });
    }
    const suggestions = suggestionsByCard[i];
    if (items.length === 0 && suggestions.length === 0) return;

    const cls = gradeByStudent.get(card.student_id);
    groups.push({
      cardId: card.id,
      studentId: card.student_id,
      studentName: nameByStudent.get(card.student_id) ?? null,
      grade: cls?.grade ?? null,
      classNo: cls?.classNo ?? null,
      university: card.university,
      department: card.department,
      subCategory: card.sub_category,
      items,
      suggestions,
    });
  });

  return groups;
}

/**
 * 추천 후보 중 하나를 골랐을 때, 그 전형 기준으로 일정을 다시 조회한다(카드의 세부전형명
 * 자체는 건드리지 않는다 — 이 팝업에서 미리보기 용도로만 쓴다).
 */
export async function getScheduleItemsForAdmissionType(
  cardId: string,
  university: string,
  department: string,
  admissionType: string,
): Promise<ScheduleItem[]> {
  const supabase = createClient();
  const [result, existingRes] = await Promise.all([
    findOfferingScheduleDates(university, department, admissionType),
    supabase.from("calendar_events").select("kind").eq("wonseo_card_id", cardId).eq("type", "wonseo_schedule"),
  ]);
  const addedKinds = new Set((existingRes.data ?? []).map((r) => r.kind));
  return result.items.map((oi) => ({
    kind: oi.kind,
    label: oi.label,
    date: oi.date,
    added: addedKinds.has(oi.kind),
  }));
}

/** 목록의 항목 하나를 실제로 캘린더에 추가한다. */
export async function addScheduleEvent({
  cardId,
  studentId,
  grade,
  classNo,
  university,
  kind,
  label,
  date,
  createdBy,
}: {
  cardId: string;
  studentId: string;
  grade: number | null;
  classNo: number | null;
  university: string;
  kind: string;
  label: string;
  date: string;
  createdBy: string;
}): Promise<void> {
  const supabase = createClient();

  if (kind === "직접등록") {
    const { error } = await supabase.from("calendar_events").insert({
      type: "wonseo_linked",
      color: DEFAULT_EVENT_COLOR,
      student_id: studentId,
      grade,
      class_no: classNo,
      wonseo_card_id: cardId,
      created_by: createdBy,
    });
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("calendar_events").insert({
    type: "wonseo_schedule",
    color: DEFAULT_EVENT_COLOR,
    student_id: studentId,
    grade,
    class_no: classNo,
    wonseo_card_id: cardId,
    kind,
    title: `${university} ${label}`,
    date,
    created_by: createdBy,
  });
  if (error) throw error;
}
