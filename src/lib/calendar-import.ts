import { createClient } from "@/lib/supabase/client";
import { EVENT_TYPE_DEFAULT_COLOR } from "@/lib/calendar-constants";

/**
 * "원서 일정 불러오기": 면접/고사 날짜가 채워진 원서 카드 중 아직 캘린더에 없는 것만
 * calendar_events(type=wonseo_linked)로 새로 만든다. 이미 불러온 카드는 건드리지 않는다.
 * 학생 모드는 studentId만, 교사 모드는 classScope만 넘긴다.
 */
export async function importWonseoCalendarEvents({
  studentId,
  classScope,
  createdBy,
}: {
  studentId?: string;
  classScope?: { grade: number; classNo: number };
  createdBy: string;
}): Promise<number> {
  const supabase = createClient();

  // wonseo_linked는 wonseo_card_id에 유니크 제약이 있어 카드당 행이 하나뿐이다.
  // 학생이 먼저 불러오든 담임이 먼저 불러오든 같은 행을 공유해야 하므로,
  // 두 경우 모두 grade/class_no를 항상 채워 담임·학생 양쪽 조회 조건을 만족시킨다.
  let studentIds: string[];
  let gradeByStudent: Map<string, { grade: number; classNo: number }>;

  if (studentId) {
    // roster 테이블은 학생에게 SELECT 권한이 없으므로(담임/관리자 전용), 학생 본인 grade/class_no는
    // security definer RPC로 조회한다(auth.uid() 기준으로 본인 값만 반환하니 RLS 우회가 안전하다).
    const [{ data: grade }, { data: classNo }] = await Promise.all([
      supabase.rpc("current_student_grade"),
      supabase.rpc("current_student_class_no"),
    ]);
    if (grade == null || classNo == null) return 0;
    studentIds = [studentId];
    gradeByStudent = new Map([[studentId, { grade, classNo }]]);
  } else if (classScope) {
    const { data: rosterRows } = await supabase
      .from("roster")
      .select("student_id, grade, class_no")
      .eq("grade", classScope.grade)
      .eq("class_no", classScope.classNo);
    studentIds = (rosterRows ?? []).map((r) => r.student_id);
    gradeByStudent = new Map(
      (rosterRows ?? []).map((r) => [r.student_id, { grade: r.grade!, classNo: r.class_no! }]),
    );
  } else {
    return 0;
  }

  if (studentIds.length === 0) return 0;

  const { data: candidateCards } = await supabase
    .from("wonseo_cards")
    .select("id, student_id")
    .eq("has_exam_date", true)
    .not("exam_date_at", "is", null)
    .in("student_id", studentIds);

  if (!candidateCards || candidateCards.length === 0) return 0;

  const { data: alreadyImported } = await supabase
    .from("calendar_events")
    .select("wonseo_card_id")
    .eq("type", "wonseo_linked")
    .in(
      "wonseo_card_id",
      candidateCards.map((c) => c.id),
    );
  const importedIds = new Set((alreadyImported ?? []).map((r) => r.wonseo_card_id));

  const toInsert = candidateCards
    .filter((c) => !importedIds.has(c.id))
    .map((c) => {
      const cls = gradeByStudent.get(c.student_id);
      return {
        type: "wonseo_linked" as const,
        color: EVENT_TYPE_DEFAULT_COLOR.wonseo_linked,
        student_id: c.student_id,
        grade: cls?.grade ?? null,
        class_no: cls?.classNo ?? null,
        wonseo_card_id: c.id,
        created_by: createdBy,
      };
    });

  if (toInsert.length === 0) return 0;

  const { error } = await supabase.from("calendar_events").insert(toInsert);
  if (error) throw error;
  return toInsert.length;
}
