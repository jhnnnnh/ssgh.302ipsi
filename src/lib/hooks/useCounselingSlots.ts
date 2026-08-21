"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CounselingSlot } from "@/lib/database.types";

export function useCounselingSlots() {
  const supabase = useMemo(() => createClient(), []);
  const [slots, setSlots] = useState<CounselingSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const { data } = await supabase
      .from("counseling_slots")
      .select("*")
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });
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
  }, []);

  return { slots, loading, reload };
}
