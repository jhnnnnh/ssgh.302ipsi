import { createClient } from "@/lib/supabase/client";
import type { AutocompleteOption } from "@/components/ui/AutocompleteInput";

/**
 * 매 글자마다 서버에 물어보면 네트워크 왕복 시간만큼 느리게 느껴진다. 대신 해당 범위
 * (대학 전체 / 특정 대학의 학과 / 특정 대학·학과의 전형)를 한 번만 통째로 받아서 메모리에
 * 캐시해 두고, 그다음부터는 타이핑할 때마다 그 안에서 순수 JS로 걸러낸다 — 네트워크 요청이
 * 아예 없어져서 체감 속도가 바로 반응하는 수준이 된다. 캐시는 탭을 새로고침하기 전까지 유지된다.
 */

let universityCache: string[] | null = null;
let universityPromise: Promise<string[]> | null = null;

function loadUniversities(): Promise<string[]> {
  if (universityCache) return Promise.resolve(universityCache);
  if (!universityPromise) {
    universityPromise = (async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc("autocomplete_universities", { p_query: "", p_limit: 500 });
      const list = (data ?? []).map((r) => r.university);
      universityCache = list;
      return list;
    })();
  }
  return universityPromise;
}

/** 모달이 열리자마자 미리 불러 둬서, 학생이 첫 글자를 치기 전에 이미 캐시가 준비되게 한다. */
export function prefetchUniversities() {
  void loadUniversities();
}

/** 대학명 자동완성 — 입력한 글자를 포함하는 대학명(중복 제거). */
export async function searchUniversities(query: string): Promise<AutocompleteOption[]> {
  const q = query.trim();
  if (!q) return [];
  const all = await loadUniversities();
  return all.filter((u) => u.includes(q)).map((u) => ({ value: u, label: u }));
}

type DeptRow = { university: string; department: string };
const departmentCache = new Map<string, DeptRow[]>();
const departmentPromises = new Map<string, Promise<DeptRow[]>>();

function loadDepartments(university: string): Promise<DeptRow[]> {
  const key = university; // "" = 전체 대학 대상
  const cached = departmentCache.get(key);
  if (cached) return Promise.resolve(cached);
  let promise = departmentPromises.get(key);
  if (!promise) {
    promise = (async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc("autocomplete_departments", {
        p_query: "",
        p_university: key || null,
        p_limit: key ? 500 : 5000,
      });
      const list = data ?? [];
      departmentCache.set(key, list);
      return list;
    })();
    departmentPromises.set(key, promise);
  }
  return promise;
}

/**
 * 학과명 자동완성. university가 채워져 있으면 그 대학 안에서만, 비어 있으면 전체 대학에서
 * 찾고 후보 옆에 소속 대학명을 같이 보여준다.
 */
export async function searchDepartments(query: string, university: string): Promise<AutocompleteOption[]> {
  const q = query.trim();
  if (!q) return [];
  const trimmed = university.trim();
  const all = await loadDepartments(trimmed);
  return all
    .filter((r) => r.department.includes(q))
    .map((r) => ({
      value: r.department,
      label: r.department,
      hint: trimmed ? undefined : r.university,
    }));
}

type TypeRow = { admission_type: string; department: string };
const typeCache = new Map<string, TypeRow[]>();
const typePromises = new Map<string, Promise<TypeRow[]>>();

function loadAdmissionTypes(university: string, department: string): Promise<TypeRow[]> {
  const key = `${university}::${department}`;
  const cached = typeCache.get(key);
  if (cached) return Promise.resolve(cached);
  let promise = typePromises.get(key);
  if (!promise) {
    promise = (async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc("autocomplete_admission_types", {
        p_query: "",
        p_university: university || null,
        p_department: department || null,
        p_limit: 500,
      });
      const list = data ?? [];
      typeCache.set(key, list);
      return list;
    })();
    typePromises.set(key, promise);
  }
  return promise;
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
  const q = query.trim();
  if (!q) return [];
  const trimmedUni = university.trim();
  const trimmedDept = department.trim();
  const all = await loadAdmissionTypes(trimmedUni, trimmedDept);
  return all
    .filter((r) => r.admission_type.includes(q))
    .map((r) => ({
      value: r.admission_type,
      label: r.admission_type,
      hint: trimmedDept ? undefined : r.department,
    }));
}
