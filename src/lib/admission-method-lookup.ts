import { createClient } from "@/lib/supabase/client";
import type { AdmissionMethodCategory } from "@/lib/database.types";

export type AdmissionMethodMatch = {
  method: string | null;
  min_standard: string | null;
};

/** 카드의 전형 유형 문자열로 admission_methods의 어느 시트(카테고리)를 볼지 정한다. */
function categoriesForCardCategory(category: string): AdmissionMethodCategory[] {
  if (category.includes("논술")) return ["논술전형"];
  if (category.includes("교과")) return ["학생부교과전형"];
  if (category.includes("종합")) return ["학생부종합전형"];
  return ["학생부교과전형", "학생부종합전형", "논술전형"];
}

function normalize(s: string): string {
  return s.replace(/\s+/g, "").trim();
}

/**
 * 대학명 + 전형 유형(교과/종합/논술) + 세부 전형명으로 전형방법/수능최저학력기준을 찾는다.
 * admission_cutoffs와 admission_methods는 서로 다른 원본 파일이라 세부 전형명 표기가
 * 항상 똑같지는 않다(예: "지역인재" vs "학생부교과/지역인재"). 정확히 같은 이름이 하나만
 * 있으면 그걸 쓰고, 없으면 서로 포함 관계인 후보를 찾아보되 — 그마저 여러 개로 겹치면
 * 잘못 채우느니 그냥 비워 둔다.
 */
export async function findAdmissionMethod(
  university: string,
  category: string,
  subCategory: string,
): Promise<AdmissionMethodMatch | null> {
  const uni = university.trim();
  const sub = subCategory.trim();
  if (!uni || !sub) return null;

  const supabase = createClient();
  const { data } = await supabase
    .from("admission_methods")
    .select("admission_type, method, min_standard")
    .eq("university", uni)
    .in("category", categoriesForCardCategory(category));
  const rows = data ?? [];
  if (rows.length === 0) return null;

  const target = normalize(sub);
  const exact = rows.filter((r) => normalize(r.admission_type) === target);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;

  const partial = rows.filter((r) => {
    const n = normalize(r.admission_type);
    return n.includes(target) || target.includes(n);
  });
  return partial.length === 1 ? partial[0] : null;
}
