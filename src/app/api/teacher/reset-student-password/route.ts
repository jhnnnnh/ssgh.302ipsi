import { NextResponse } from "next/server";
import { requireTeacher, canAccessStudent } from "@/lib/supabase/require-teacher";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const teacher = await requireTeacher();
  if (!teacher) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { studentId } = await request.json();
  if (typeof studentId !== "string" || !studentId.trim()) {
    return NextResponse.json({ error: "학번이 필요합니다." }, { status: 400 });
  }
  const trimmedId = studentId.trim();
  if (!canAccessStudent(teacher, trimmedId)) {
    return NextResponse.json({ error: "본인 담당 반 학생만 관리할 수 있습니다." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("student_id", trimmedId)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ ok: true, message: "이미 비밀번호가 설정되지 않은 상태입니다." });
  }

  // 계정을 삭제하면 다음 로그인 시 입력하는 비밀번호가 새로 저장된다 (= 초기화 효과)
  const { error } = await admin.auth.admin.deleteUser(profile.id);
  if (error) {
    return NextResponse.json({ error: "초기화에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
