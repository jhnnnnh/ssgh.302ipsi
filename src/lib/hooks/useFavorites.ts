"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SlotFavorite } from "@/lib/database.types";

export function useFavorites() {
  const supabase = useMemo(() => createClient(), []);
  const [favorites, setFavorites] = useState<SlotFavorite[]>([]);

  const reload = async () => {
    const { data } = await supabase
      .from("slot_favorites")
      .select("*")
      .order("start_time", { ascending: true });
    setFavorites(data ?? []);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { favorites, reload };
}
