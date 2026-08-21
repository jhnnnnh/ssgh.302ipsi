import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/supabase/require-teacher";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const teacher = await requireTeacher();
  if (!teacher) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "student");
  if (profilesError) {
    return NextResponse.json({ error: "명단 조회에 실패했습니다." }, { status: 500 });
  }

  for (const p of profiles ?? []) {
    await admin.auth.admin.deleteUser(p.id);
  }

  const { error: rosterError } = await admin
    .from("roster")
    .delete()
    .neq("student_id", "");
  if (rosterError) {
    return NextResponse.json({ error: "명단 초기화에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
