import "server-only";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { TeacherRole } from "@/lib/database.types";

export type TeacherContext = {
  id: string;
  teacherRole: TeacherRole;
  grade: number | null;
  classNo: number | null;
  /**
   * 실제 유효 관리자 권한. teacher_role='admin'이거나, 겸용 계정(dual_admin)이
   * 관리자 모드를 켠 경우 true. teacherRole만 보고 admin 여부를 판단하면
   * 겸용 계정에서 실제로는 관리자 모드가 아닌데도(또는 반대로) 잘못 판단하게 되므로
   * 모든 호출부는 반드시 이 필드를 사용해야 한다.
   */
  isAdmin: boolean;
};

/** 현재 요청의 세션이 교사인지 서버에서 검증하고, 역할/담당 반/유효 관리자 여부를 함께 돌려준다. 아니면 null. */
export async function requireTeacher(): Promise<TeacherContext | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, teacher_role, grade, class_no, dual_admin, admin_mode_enabled")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "teacher" || !profile.teacher_role) return null;
  return {
    id: user.id,
    teacherRole: profile.teacher_role,
    grade: profile.grade,
    classNo: profile.class_no,
    isAdmin: profile.teacher_role === "admin" || Boolean(profile.dual_admin && profile.admin_mode_enabled),
  };
}

/** 담임교사가 특정 학번(같은 반)에만 접근할 수 있는지 검사한다. 유효 관리자는 항상 true. */
export function canAccessStudent(teacher: TeacherContext, studentId: string) {
  if (teacher.isAdmin) return true;
  const grade = Number(studentId[0]);
  const classNo = Number(studentId[2]);
  return grade === teacher.grade && classNo === teacher.classNo;
}
