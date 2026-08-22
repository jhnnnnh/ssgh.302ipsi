"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useActiveClass } from "@/components/providers/ActiveClassProvider";
import type { Profile, Roster } from "@/lib/database.types";

export function useRoster() {
  const supabase = useMemo(() => createClient(), []);
  const { grade, classNo } = useActiveClass();
  const [roster, setRoster] = useState<Roster[]>([]);
  const [studentProfiles, setStudentProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (grade == null || classNo == null) {
      setRoster([]);
      setStudentProfiles([]);
      setLoading(false);
      return;
    }
    const [{ data: rosterData }, { data: profileData }] = await Promise.all([
      supabase
        .from("roster")
        .select("*")
        .eq("grade", grade)
        .eq("class_no", classNo)
        .order("student_id", { ascending: true }),
      supabase.from("profiles").select("*").eq("role", "student"),
    ]);
    setRoster(rosterData ?? []);
    setStudentProfiles(profileData ?? []);
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    const channel = supabase
      .channel("roster_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "roster" }, () => reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => reload())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grade, classNo]);

  const passwordSetIds = useMemo(
    () => new Set(studentProfiles.map((p) => p.student_id)),
    [studentProfiles],
  );

  return { roster, passwordSetIds, loading, reload };
}
