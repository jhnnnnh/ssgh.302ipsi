import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient, studentEmail } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { studentId, name, password } = await request.json();

  if (
    typeof studentId !== "string" ||
    typeof name !== "string" ||
    typeof password !== "string" ||
    !studentId.trim() ||
    !name.trim() ||
    !password
  ) {
    return NextResponse.json(
      { error: "학번, 이름, 비밀번호를 모두 입력해 주세요." },
      { status: 400 },
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "비밀번호는 6자 이상이어야 합니다." },
      { status: 400 },
    );
  }

  const trimmedId = studentId.trim();
  const trimmedName = name.trim();
  const admin = createAdminClient();

  const { data: rosterRow, error: rosterError } = await admin
    .from("roster")
    .select("student_id, name")
    .eq("student_id", trimmedId)
    .maybeSingle();

  if (rosterError) {
    return NextResponse.json({ error: "명단 조회에 실패했습니다." }, { status: 500 });
  }
  if (!rosterRow || rosterRow.name !== trimmedName) {
    return NextResponse.json(
      { error: "명단에 등록되지 않은 학번 또는 이름입니다. 선생님께 문의하세요." },
      { status: 401 },
    );
  }

  const email = studentEmail(trimmedId);
  const supabase = await createServerClient();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("student_id", trimmedId)
    .maybeSingle();

  if (!existingProfile) {
    // 최초 로그인: 계정을 생성하고 입력한 비밀번호로 저장
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
    if (createError || !created.user) {
      return NextResponse.json(
        { error: `계정 생성에 실패했습니다: ${createError?.message ?? "알 수 없는 오류"}` },
        { status: 500 },
      );
    }
    const { error: profileError } = await admin.from("profiles").insert({
      id: created.user.id,
      role: "student",
      student_id: trimmedId,
      name: trimmedName,
    });
    if (profileError) {
      return NextResponse.json(
        { error: "프로필 생성에 실패했습니다." },
        { status: 500 },
      );
    }
  }

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({ email, password });

  if (signInError || !signInData.session) {
    return NextResponse.json(
      { error: "비밀번호가 일치하지 않습니다." },
      { status: 401 },
    );
  }

  return NextResponse.json({
    session: signInData.session,
    profile: { studentId: trimmedId, name: trimmedName },
  });
}
