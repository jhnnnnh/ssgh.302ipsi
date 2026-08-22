/**
 * 1회성 스크립트: 공용 비밀번호 교사 계정을 폐지하고, 담당 반 없는
 * 전체관리자 계정을 새로 만든다.
 *
 * 사용법: npx tsx scripts/setup-multi-class-auth.ts
 * .env.local 에 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * ADMIN_NAME, ADMIN_INITIAL_PASSWORD 가 설정되어 있어야 한다.
 * (마이그레이션 0009를 먼저 SQL Editor에서 실행해야 한다.)
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const oldTeacherEmail = process.env.TEACHER_INTERNAL_EMAIL ?? "teacher@stu.internal";
const adminName = process.env.ADMIN_NAME;
const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;

async function main() {
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 .env.local에 필요합니다.");
  }
  if (!adminName || !adminPassword) {
    throw new Error("ADMIN_NAME / ADMIN_INITIAL_PASSWORD가 .env.local에 필요합니다.");
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1) 기존 공용 교사 계정 제거
  const { data: listData, error: listError } = await admin.auth.admin.listUsers();
  if (listError) throw listError;
  const oldUser = listData.users.find((u) => u.email === oldTeacherEmail);
  if (oldUser) {
    const { error } = await admin.auth.admin.deleteUser(oldUser.id);
    if (error) throw error;
    console.log(`기존 공용 교사 계정(${oldTeacherEmail})을 삭제했습니다.`);
  } else {
    console.log("기존 공용 교사 계정이 없어 건너뜁니다.");
  }

  // 2) 새 전체관리자 계정 생성 (이미 있으면 비밀번호만 갱신)
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "teacher")
    .eq("name", adminName)
    .maybeSingle();

  if (existingProfile) {
    const { error } = await admin.auth.admin.updateUserById(existingProfile.id, {
      password: adminPassword,
    });
    if (error) throw error;
    const { error: profileError } = await admin
      .from("profiles")
      .update({ teacher_role: "admin", grade: null, class_no: null })
      .eq("id", existingProfile.id);
    if (profileError) throw profileError;
    console.log(`기존 전체관리자 계정(${adminName})의 비밀번호를 갱신했습니다.`);
  } else {
    const email = `staff-${crypto.randomUUID()}@staff.internal`;
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: adminPassword,
      email_confirm: true,
    });
    if (error || !created.user) throw error;
    const { error: profileError } = await admin.from("profiles").insert({
      id: created.user.id,
      role: "teacher",
      name: adminName,
      teacher_role: "admin",
    });
    if (profileError) throw profileError;
    console.log(`전체관리자 계정(${adminName})을 새로 생성했습니다.`);
  }

  console.log("\n완료. 이제 로그인 화면에서 이름/비밀번호로 로그인할 수 있습니다.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
