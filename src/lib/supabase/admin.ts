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
