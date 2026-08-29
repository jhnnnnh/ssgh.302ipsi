"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { createClient } from "@/lib/supabase/client";
import { useCalendarEvents, type ResolvedCalendarEvent } from "@/lib/hooks/useCalendarEvents";
import { importWonseoCalendarEvents } from "@/lib/calendar-import";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { CalendarEventModal } from "@/components/calendar/CalendarEventModal";

export function StudentCalendarTab({ studentId }: { studentId: string }) {
  const { profile } = useAuth();
  const showToast = useToast();
  const confirm = useConfirm();
  const { events, reload } = useCalendarEvents();
  const [importing, setImporting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ResolvedCalendarEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();

  async function handleImport() {
    if (!profile) return;
    setImporting(true);
    try {
      const count = await importWonseoCalendarEvents({ studentId, createdBy: profile.id });
      showToast(count > 0 ? `${count}건을 새로 불러왔어요.` : "새로 불러올 일정이 없어요.", "success");
      reload();
    } catch {
      showToast("불러오기에 실패했습니다.", "error");
    } finally {
      setImporting(false);
    }
  }

  function handleAdd(date?: string) {
    setEditingEvent(null);
    setDefaultDate(date);
    setModalOpen(true);
  }

  function handleEdit(event: ResolvedCalendarEvent) {
    setEditingEvent(event);
    setModalOpen(true);
  }

  async function handleDelete(event: ResolvedCalendarEvent) {
    const ok = await confirm({
      message: `"${event.resolvedTitle}" 일정을 삭제하시겠습니까?`,
      confirmLabel: "삭제",
      danger: true,
    });
    if (!ok) return;
    const supabase = createClient();
    const { error } = await supabase.from("calendar_events").delete().eq("id", event.id);
    if (error) {
      showToast("삭제에 실패했습니다.", "error");
      return;
    }
    showToast("삭제되었습니다.", "success");
    reload();
  }

  function canManage(event: ResolvedCalendarEvent) {
    return event.type === "wonseo_linked" || event.type === "personal";
  }

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <CalendarGrid
        events={events}
        onImport={handleImport}
        importing={importing}
        onAddEvent={handleAdd}
        onEditEvent={handleEdit}
        onDeleteEvent={handleDelete}
        canManageEvent={canManage}
      />
      <CalendarEventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editingEvent={editingEvent}
        allowedTypes={["personal"]}
        defaultDate={defaultDate}
        scope={{ studentId }}
        createdBy={profile.id}
        onSaved={reload}
      />
    </div>
  );
}
