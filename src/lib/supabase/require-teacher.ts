import "server-only";
import { createClient as createServerClient } from "@/lib/supabase/server";

/** 현재 요청의 세션이 교사인지 서버에서 검증한다. 아니면 null. */
export async function requireTeacher() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "teacher") return null;
  return user;
}
