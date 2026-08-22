import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * 서비스 롤 키를 사용하는 관리자 클라이언트.
 * RLS를 우회하므로 반드시 서버 전용 코드(API 라우트)에서만, 그리고
 * 호출자가 교사 세션임을 직접 검증한 뒤에만 사용해야 한다.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

export function studentEmail(studentId: string) {
  return `${studentId.trim()}@stu.internal`;
}

/**
 * 교사 계정용 합성 이메일. 이름을 그대로 쓰지 않고 무작위 값으로 발급한다 —
 * 로그인은 항상 이름으로 profiles를 조회해 id를 찾은 뒤 getUserById로 이메일을
 * 알아내는 경로를 타므로, 이메일 자체는 사람이 읽을 필요가 없다.
 */
export function randomStaffEmail() {
  return `staff-${crypto.randomUUID()}@staff.internal`;
}
