import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { teacherId, teacherRole, grade, classNo } = await request.json();

  if (typeof teacherId !== "string" || !teacherId) {
    return NextResponse.json({ error: "대상 교사가 필요합니다." }, { status: 400 });
  }
  if (teacherRole !== "homeroom" && teacherRole !== "admin") {
    return NextResponse.json({ error: "역할을 선택해 주세요." }, { status: 400 });
  }
  if (teacherRole === "homeroom" && (typeof grade !== "number" || typeof classNo !== "number")) {
    return NextResponse.json({ error: "담임교사는 담당 반을 지정해야 합니다." }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("profiles")
    .update({
      teacher_role: teacherRole,
      grade: teacherRole === "homeroom" ? grade : null,
      class_no: teacherRole === "homeroom" ? classNo : null,
    })
    .eq("id", teacherId)
    .eq("role", "teacher");

  if (error) {
    return NextResponse.json({ error: "수정에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
