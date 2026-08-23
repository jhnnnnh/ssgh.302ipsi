import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/supabase/require-teacher";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const teacher = await requireTeacher();
  if (!teacher) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  let grade: number;
  let classNo: number;
  if (teacher.isAdmin) {
    const body = await request.json().catch(() => ({}));
    if (typeof body.grade !== "number" || typeof body.classNo !== "number") {
      return NextResponse.json({ error: "비울 반(학년/반)을 지정해 주세요." }, { status: 400 });
    }
    grade = body.grade;
    classNo = body.classNo;
  } else {
    grade = teacher.grade!;
    classNo = teacher.classNo!;
  }

  const admin = createAdminClient();

  const { data: rosterRows, error: rosterFetchError } = await admin
    .from("roster")
    .select("student_id")
    .eq("grade", grade)
    .eq("class_no", classNo);
  if (rosterFetchError) {
    return NextResponse.json({ error: "명단 조회에 실패했습니다." }, { status: 500 });
  }

  const studentIds = (rosterRows ?? []).map((r) => r.student_id);
  if (studentIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id")
      .in("student_id", studentIds);
    for (const p of profiles ?? []) {
      await admin.auth.admin.deleteUser(p.id);
    }
  }

  const { error: rosterError } = await admin
    .from("roster")
    .delete()
    .eq("grade", grade)
    .eq("class_no", classNo);
  if (rosterError) {
    return NextResponse.json({ error: "명단 초기화에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
