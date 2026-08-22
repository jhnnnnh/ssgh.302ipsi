import "server-only";
import { createClient as createServerClient } from "@/lib/supabase/server";

/** 현재 요청의 세션이 전체관리자(teacher_role='admin')인지 서버에서 검증한다. 아니면 null. */
export async function requireAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, teacher_role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "teacher" || profile.teacher_role !== "admin") return null;
  return user;
}
