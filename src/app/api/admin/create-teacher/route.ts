import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient, randomStaffEmail } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { name, password, teacherRole, grade, classNo } = await request.json();

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "이름을 입력해 주세요." }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "비밀번호는 6자 이상이어야 합니다." }, { status: 400 });
  }
  if (teacherRole !== "homeroom" && teacherRole !== "admin") {
    return NextResponse.json({ error: "역할을 선택해 주세요." }, { status: 400 });
  }
  if (teacherRole === "homeroom" && (typeof grade !== "number" || typeof classNo !== "number")) {
    return NextResponse.json({ error: "담임교사는 담당 반을 지정해야 합니다." }, { status: 400 });
  }

  const trimmedName = name.trim();
  const adminClient = createAdminClient();

  const { data: existing } = await adminClient
    .from("profiles")
    .select("id")
    .eq("role", "teacher")
    .eq("name", trimmedName)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "이미 등록된 교사 이름입니다." }, { status: 409 });
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: randomStaffEmail(),
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    return NextResponse.json(
      { error: `계정 생성에 실패했습니다: ${createError?.message ?? "알 수 없는 오류"}` },
      { status: 500 },
    );
  }

  const { error: profileError } = await adminClient.from("profiles").insert({
    id: created.user.id,
    role: "teacher",
    name: trimmedName,
    teacher_role: teacherRole,
    grade: teacherRole === "homeroom" ? grade : null,
    class_no: teacherRole === "homeroom" ? classNo : null,
  });
  if (profileError) {
    await adminClient.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: "프로필 생성에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
