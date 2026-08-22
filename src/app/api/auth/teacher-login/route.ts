import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { name, password } = await request.json();
  if (typeof name !== "string" || !name.trim() || typeof password !== "string" || !password) {
    return NextResponse.json({ error: "이름과 비밀번호를 입력해 주세요." }, { status: 400 });
  }

  const trimmedName = name.trim();
  const admin = createAdminClient();

  const { data: profileRow, error: profileError } = await admin
    .from("profiles")
    .select("id, name, teacher_role, grade, class_no")
    .eq("role", "teacher")
    .eq("name", trimmedName)
    .maybeSingle();

  if (profileError || !profileRow) {
    return NextResponse.json(
      { error: "등록되지 않은 교사 계정입니다. 관리자에게 문의하세요." },
      { status: 401 },
    );
  }

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(profileRow.id);
  if (userError || !userData.user?.email) {
    return NextResponse.json({ error: "계정 정보를 확인할 수 없습니다." }, { status: 500 });
  }

  const supabase = await createServerClient();
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: userData.user.email,
    password,
  });

  if (signInError || !signInData.session) {
    return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 401 });
  }

  return NextResponse.json({
    session: signInData.session,
    profile: {
      name: profileRow.name,
      teacherRole: profileRow.teacher_role,
      grade: profileRow.grade,
      classNo: profileRow.class_no,
    },
  });
}
