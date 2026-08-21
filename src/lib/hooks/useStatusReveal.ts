"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useStatusReveal() {
  const supabase = useMemo(() => createClient(), []);
  const [enabled, setEnabled] = useState(false);

  const reload = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "status_reveal")
      .maybeSingle();
    setEnabled(Boolean((data?.value as { enabled?: boolean } | undefined)?.enabled));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    const channel = supabase
      .channel("app_settings_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        () => reload(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggle() {
    const { error } = await supabase
      .from("app_settings")
      .update({ value: { enabled: !enabled } })
      .eq("key", "status_reveal");
    if (!error) setEnabled((v) => !v);
    return !error;
  }

  return { enabled, toggle };
}
