import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { teacherId, newPassword } = await request.json();
  if (typeof teacherId !== "string" || !teacherId) {
    return NextResponse.json({ error: "대상 교사가 필요합니다." }, { status: 400 });
  }
  if (typeof newPassword !== "string" || newPassword.length < 6) {
    return NextResponse.json({ error: "비밀번호는 6자 이상이어야 합니다." }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(teacherId, {
    password: newPassword,
  });
  if (error) {
    return NextResponse.json({ error: "비밀번호 변경에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
