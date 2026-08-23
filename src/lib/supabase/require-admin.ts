import "server-only";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * 현재 요청의 세션이 전체관리자 권한을 가지는지 서버에서 검증한다. 아니면 null.
 * teacher_role='admin'이거나, 겸용 계정(dual_admin)이 관리자 모드를 켠 경우 모두 인정한다.
 */
export async function requireAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, teacher_role, dual_admin, admin_mode_enabled")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "teacher") return null;
  const isAdmin = profile.teacher_role === "admin" || (profile.dual_admin && profile.admin_mode_enabled);
  if (!isAdmin) return null;
  return user;
}
