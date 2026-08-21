import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/supabase/require-teacher";
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

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("student_id", trimmedId)
    .maybeSingle();

  if (profile) {
    const { error: authError } = await admin.auth.admin.deleteUser(profile.id);
    if (authError) {
      return NextResponse.json({ error: "계정 삭제에 실패했습니다." }, { status: 500 });
    }
  }

  const { error: rosterError } = await admin
    .from("roster")
    .delete()
    .eq("student_id", trimmedId);
  if (rosterError) {
    return NextResponse.json({ error: "명단 삭제에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
