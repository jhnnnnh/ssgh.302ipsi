"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useActiveClass } from "@/components/providers/ActiveClassProvider";
import type { SlotFavorite } from "@/lib/database.types";

export function useFavorites() {
  const supabase = useMemo(() => createClient(), []);
  const { grade, classNo } = useActiveClass();
  const [favorites, setFavorites] = useState<SlotFavorite[]>([]);

  const reload = async () => {
    if (grade == null || classNo == null) {
      setFavorites([]);
      return;
    }
    const { data } = await supabase
      .from("slot_favorites")
      .select("*")
      .eq("grade", grade)
      .eq("class_no", classNo)
      .order("start_time", { ascending: true });
    setFavorites(data ?? []);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grade, classNo]);

  return { favorites, reload };
}
