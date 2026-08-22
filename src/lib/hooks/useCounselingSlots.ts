"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CounselingSlot } from "@/lib/database.types";

/**
 * 상담 슬롯 목록을 구독한다.
 * `classFilter`를 생략하면(학생 쪽 호출) 필터 없이 전체를 조회하되, RLS가
 * 학생 본인 반 슬롯만 돌려주므로 결과적으로 자기 반만 보인다.
 * 교사 화면(특히 전체관리자)은 한 번에 여러 반을 볼 수 있어 명시적으로
 * `{grade, classNo}`를 넘겨 지금 보고 있는 반으로 좁혀야 한다. `null`을 넘기면
 * (아직 반이 정해지지 않은 상태) 조회하지 않고 빈 목록을 유지한다.
 */
export function useCounselingSlots(
  classFilter?: { grade: number; classNo: number } | null,
) {
  const supabase = useMemo(() => createClient(), []);
  const [slots, setSlots] = useState<CounselingSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const filterPending = classFilter === null;

  const reload = async () => {
    if (filterPending) {
      setSlots([]);
      setLoading(false);
      return;
    }
    let query = supabase
      .from("counseling_slots")
      .select("*")
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });
    if (classFilter) {
      query = query.eq("grade", classFilter.grade).eq("class_no", classFilter.classNo);
    }
    const { data } = await query;
    setSlots(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();

    const channel = supabase
      .channel("counseling_slots_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "counseling_slots" },
        () => reload(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classFilter?.grade, classFilter?.classNo, filterPending]);

  return { slots, loading, reload };
}
