"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * 학생별 "지망 순위 자동 배정" 스위치 상태를 roster에서 읽어온다. 실제 켜고/끄는 동작(카드
 * rank 값을 미리 채워 넣거나 확인창을 띄우는 등)은 카드 목록을 들고 있는 화면이 직접
 * 처리해야 해서, 이 훅은 값을 읽고 로컬 상태를 갱신하는 것까지만 담당한다.
 */
export function useRankAutoAssign(studentId: string) {
  const [autoAssign, setAutoAssign] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("roster")
      .select("rank_auto_assign")
      .eq("student_id", studentId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setAutoAssign(data?.rank_auto_assign ?? true);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  return { autoAssign, setAutoAssign };
}
