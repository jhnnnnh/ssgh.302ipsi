/**
 * 1회성 스크립트: 테스트 중 만든 데이터를 전부 지우고 깨끗한 상태로 되돌린다.
 * 테이블 구조(스키마)는 건드리지 않고, 각 테이블의 행(row)만 삭제한다.
 * 사용법: npx tsx scripts/reset-test-data.ts
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const teacherEmail = process.env.TEACHER_INTERNAL_EMAIL ?? "teacher@stu.internal";

async function main() {
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1) 학생 계정(Auth) 삭제 — profiles/roster는 FK cascade로 함께 정리됨
  const { data: studentProfiles, error: profilesError } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "student");
  if (profilesError) throw profilesError;

  for (const p of studentProfiles ?? []) {
    const { error } = await admin.auth.admin.deleteUser(p.id);
    if (error) console.error(`계정 삭제 실패 (${p.id}):`, error.message);
  }
  console.log(`학생 계정 ${studentProfiles?.length ?? 0}개 삭제됨.`);

  // 2) 원서 카드 (wonseo_images는 card_id FK cascade로 함께 삭제됨)
  const { error: cardsError, count: cardsCount } = await admin
    .from("wonseo_cards")
    .delete({ count: "exact" })
    .not("id", "is", null);
  if (cardsError) throw cardsError;
  console.log(`원서 카드 ${cardsCount ?? 0}건 삭제됨.`);

  // 3) 상담 슬롯 (신청 내역 포함 — 같은 테이블의 컬럼)
  const { error: slotsError, count: slotsCount } = await admin
    .from("counseling_slots")
    .delete({ count: "exact" })
    .not("id", "is", null);
  if (slotsError) throw slotsError;
  console.log(`상담 슬롯 ${slotsCount ?? 0}건 삭제됨.`);

  // 4) 학생 명단 (혹시 남아있는 행이 있으면 정리)
  const { error: rosterError, count: rosterCount } = await admin
    .from("roster")
    .delete({ count: "exact" })
    .not("student_id", "is", null);
  if (rosterError) throw rosterError;
  console.log(`학생 명단 ${rosterCount ?? 0}건 삭제됨.`);

  // 5) 합격 상태 공개 토글을 기본값(비공개)으로 되돌림
  const { error: settingsError } = await admin
    .from("app_settings")
    .update({ value: { enabled: false } })
    .eq("key", "status_reveal");
  if (settingsError) throw settingsError;
  console.log("합격 상태 공개 토글을 OFF로 재설정함.");

  console.log(`\n완료. 교사 계정(${teacherEmail})과 즐겨찾기는 그대로 유지됩니다.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
