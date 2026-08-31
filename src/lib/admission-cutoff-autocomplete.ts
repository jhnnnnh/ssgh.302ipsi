import { createClient } from "@/lib/supabase/client";
import type { AutocompleteOption } from "@/components/ui/AutocompleteInput";

/** 대학명 자동완성 — 입력한 글자를 포함하는 대학명(중복 제거). */
export async function searchUniversities(query: string): Promise<AutocompleteOption[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("autocomplete_universities", { p_query: query });
  return (data ?? []).map((r) => ({ value: r.university, label: r.university }));
}

/**
 * 학과명 자동완성. university가 채워져 있으면 그 대학 안에서만, 비어 있으면 전체 대학에서
 * 찾고 후보 옆에 소속 대학명을 같이 보여준다.
 */
export async function searchDepartments(query: string, university: string): Promise<AutocompleteOption[]> {
  const supabase = createClient();
  const trimmed = university.trim();
  const { data } = await supabase.rpc("autocomplete_departments", {
    p_query: query,
    p_university: trimmed || null,
  });
  return (data ?? []).map((r) => ({
    value: r.department,
    label: r.department,
    hint: trimmed ? undefined : r.university,
  }));
}

/**
 * 세부 전형명 자동완성. university+department가 다 채워져 있으면 그 조합에 실제로 있는
 * 전형명만, university만 있으면 그 대학 전체 전형명(후보 옆에 학과명 표시)을 보여준다.
 * university 자체가 없으면 호출하지 않는 게 맞다(자유 입력만 허용).
 */
export async function searchAdmissionTypes(
  query: string,
  university: string,
  department: string,
): Promise<AutocompleteOption[]> {
  const supabase = createClient();
  const trimmedDept = department.trim();
  const { data } = await supabase.rpc("autocomplete_admission_types", {
    p_query: query,
    p_university: university.trim() || null,
    p_department: trimmedDept || null,
  });
  return (data ?? []).map((r) => ({
    value: r.admission_type,
    label: r.admission_type,
    hint: trimmedDept ? undefined : r.department,
  }));
}
