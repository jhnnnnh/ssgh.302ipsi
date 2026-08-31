"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { formatClassLabel } from "@/lib/student-id";

export type ClassOption = { grade: number; classNo: number; label: string };

interface ActiveClassContextValue {
  grade: number | null;
  classNo: number | null;
  isAdmin: boolean;
  /** 다른 반으로 전환해 볼 수 있는지 여부. 담임을 겸하는 관리자는 켜져 있어도 자기 반에 고정된다. */
  canSwitchClass: boolean;
  classOptions: ClassOption[];
  setActiveClass: (grade: number, classNo: number) => void;
  loading: boolean;
}

const ActiveClassContext = createContext<ActiveClassContextValue | null>(null);

/**
 * 교사 화면에서 "지금 보고 있는 반"을 관리한다.
 * 담임교사는 자기 담당 반으로 고정되고, 전체관리자는 드롭다운으로 반을 선택한다
 * (선택지는 roster에 실제 존재하는 반 ∪ 담임이 배정된 반을 합쳐서 구성).
 */
export function ActiveClassProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const isAdmin =
    profile?.teacher_role === "admin" || Boolean(profile?.dual_admin && profile.admin_mode_enabled);
  // 담임 없는 순수 전체관리자만 다른 반을 넘나들 수 있다. 담임을 겸하는 관리자(dual_admin)는
  // 관리자 모드를 켜도 본인 반에 고정되어 다른 반 정보가 섞이지 않는다.
  const canSwitchClass = profile?.teacher_role === "admin";
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [selected, setSelected] = useState<{ grade: number; classNo: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    if (!canSwitchClass) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected(
        profile.grade != null && profile.class_no != null
          ? { grade: profile.grade, classNo: profile.class_no }
          : null,
      );
      setLoading(false);
      return;
    }

    const supabase = createClient();
    (async () => {
      const [{ data: rosterClasses }, { data: teacherClasses }] = await Promise.all([
        supabase.from("roster").select("grade, class_no"),
        supabase
          .from("profiles")
          .select("grade, class_no")
          .eq("role", "teacher")
          .eq("teacher_role", "homeroom"),
      ]);

      const map = new Map<string, ClassOption>();
      for (const row of [...(rosterClasses ?? []), ...(teacherClasses ?? [])]) {
        if (row.grade == null || row.class_no == null) continue;
        const key = `${row.grade}-${row.class_no}`;
        if (!map.has(key)) {
          map.set(key, {
            grade: row.grade,
            classNo: row.class_no,
            label: formatClassLabel(row.grade, row.class_no),
          });
        }
      }
      const options = Array.from(map.values()).sort(
        (a, b) => a.grade - b.grade || a.classNo - b.classNo,
      );
      setClassOptions(options);
      setSelected((prev) =>
        prev ?? (options[0] ? { grade: options[0].grade, classNo: options[0].classNo } : null),
      );
      setLoading(false);
    })();
  }, [profile, canSwitchClass]);

  const value = useMemo<ActiveClassContextValue>(
    () => ({
      grade: selected?.grade ?? null,
      classNo: selected?.classNo ?? null,
      isAdmin,
      canSwitchClass,
      classOptions,
      setActiveClass: (grade: number, classNo: number) => setSelected({ grade, classNo }),
      loading,
    }),
    [selected, isAdmin, canSwitchClass, classOptions, loading],
  );

  return <ActiveClassContext.Provider value={value}>{children}</ActiveClassContext.Provider>;
}

export function useActiveClass() {
  const ctx = useContext(ActiveClassContext);
  if (!ctx) throw new Error("useActiveClass must be used within ActiveClassProvider");
  return ctx;
}
