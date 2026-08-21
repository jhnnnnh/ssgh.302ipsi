/**
 * 1회성 스크립트: 교사(선생님 모드) 계정을 Supabase Auth에 생성한다.
 * 사용법: npm run seed:teacher
 * .env.local 에 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * TEACHER_INTERNAL_EMAIL, TEACHER_INITIAL_PASSWORD 가 설정되어 있어야 한다.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.TEACHER_INTERNAL_EMAIL ?? "teacher@stu.internal";
const password = process.env.TEACHER_INITIAL_PASSWORD;

async function main() {
  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 .env.local에 필요합니다.",
    );
  }
  if (!password) {
    throw new Error("TEACHER_INITIAL_PASSWORD가 .env.local에 필요합니다.");
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existingList, error: listError } =
    await admin.auth.admin.listUsers();
  if (listError) throw listError;

  const existing = existingList.users.find((u) => u.email === email);

  let userId: string;
  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(
      existing.id,
      { password },
    );
    if (error) throw error;
    userId = data.user.id;
    console.log(`기존 교사 계정(${email})의 비밀번호를 갱신했습니다.`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(`교사 계정(${email})을 새로 생성했습니다.`);
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    role: "teacher",
    student_id: null,
    name: "선생님",
  });
  if (profileError) throw profileError;

  console.log("완료: 교사 계정이 준비되었습니다.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
