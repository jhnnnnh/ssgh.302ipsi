import "server-only";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { TeacherRole } from "@/lib/database.types";

export type TeacherContext = {
  id: string;
  teacherRole: TeacherRole;
  grade: number | null;
  classNo: number | null;
};

/** 현재 요청의 세션이 교사인지 서버에서 검증하고, 역할/담당 반 정보를 함께 돌려준다. 아니면 null. */
export async function requireTeacher(): Promise<TeacherContext | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, teacher_role, grade, class_no")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "teacher" || !profile.teacher_role) return null;
  return {
    id: user.id,
    teacherRole: profile.teacher_role,
    grade: profile.grade,
    classNo: profile.class_no,
  };
}

/** 담임교사가 특정 학번(같은 반)에만 접근할 수 있는지 검사한다. admin은 항상 true. */
export function canAccessStudent(teacher: TeacherContext, studentId: string) {
  if (teacher.teacherRole === "admin") return true;
  const grade = Number(studentId[0]);
  const classNo = Number(studentId[2]);
  return grade === teacher.grade && classNo === teacher.classNo;
}
