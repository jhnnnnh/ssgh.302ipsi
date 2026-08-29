"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CalendarEvent } from "@/lib/database.types";

export type ResolvedCalendarEvent = CalendarEvent & {
  /** wonseo_linked는 title이 없으므로 항상 이 값(연결된 원서 카드 기준)을 화면에 쓴다. */
  resolvedTitle: string;
  /** wonseo_linked는 date가 없으므로 항상 이 값(연결된 원서 카드 기준)을 화면에 쓴다. */
  resolvedDate: string | null;
  studentName: string | null;
};

type RawRow = CalendarEvent & {
  roster: { name: string } | null;
  wonseo_cards: {
    university: string | null;
    exam_date_at: string | null;
    exam_memo: string | null;
  } | null;
};

/** RLS가 이미 보이는 범위를 걸러주므로, 여기서는 그냥 전부 불러와서 화면에서 월별로 나눠 쓴다. */
export function useCalendarEvents() {
  const supabase = useMemo(() => createClient(), []);
  const [events, setEvents] = useState<ResolvedCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const { data } = await supabase
      .from("calendar_events")
      .select("*, roster(name), wonseo_cards(university, exam_date_at, exam_memo)")
      .returns<RawRow[]>();

    const resolved: ResolvedCalendarEvent[] = (data ?? []).map((row) => {
      const { roster, wonseo_cards, ...event } = row;
      if (event.type === "wonseo_linked") {
        const label = [wonseo_cards?.university, wonseo_cards?.exam_memo].filter(Boolean).join(" ");
        return {
          ...event,
          resolvedTitle: label || "일정",
          resolvedDate: wonseo_cards?.exam_date_at ?? null,
          studentName: roster?.name ?? null,
        };
      }
      return {
        ...event,
        resolvedTitle: event.title ?? "",
        resolvedDate: event.date,
        studentName: roster?.name ?? null,
      };
    });
    setEvents(resolved);
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    const channel = supabase
      .channel("calendar_events_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "calendar_events" }, () => reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "wonseo_cards" }, () => reload())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { events, loading, reload };
}
