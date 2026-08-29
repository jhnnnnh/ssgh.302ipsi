"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, Check } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { cn } from "@/lib/cn";
import {
  EVENT_COLOR_PALETTE,
  EVENT_TYPE_DEFAULT_COLOR,
  EVENT_TYPE_LABELS,
} from "@/lib/calendar-constants";
import type { CalendarEventType } from "@/lib/database.types";
import type { ResolvedCalendarEvent } from "@/lib/hooks/useCalendarEvents";

export function CalendarEventModal({
  open,
  onClose,
  editingEvent,
  allowedTypes,
  defaultDate,
  scope,
  createdBy,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  /** null이면 새 일정 추가, 값이 있으면 그 일정 수정(wonseo_linked면 색상만 수정 가능). */
  editingEvent: ResolvedCalendarEvent | null;
  allowedTypes: CalendarEventType[];
  defaultDate?: string;
  scope: { studentId?: string; grade?: number; classNo?: number };
  createdBy: string;
  onSaved: () => void;
}) {
  const showToast = useToast();
  const isWonseoLinked = editingEvent?.type === "wonseo_linked";

  const [type, setType] = useState<CalendarEventType>(allowedTypes[0] ?? "personal");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [color, setColor] = useState<string>(EVENT_TYPE_DEFAULT_COLOR.personal);
  const [titleError, setTitleError] = useState(false);
  const [dateError, setDateError] = useState(false);
  const [saving, setSaving] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    if (editingEvent) {
      setType(editingEvent.type);
      setTitle(editingEvent.resolvedTitle);
      setDate(editingEvent.resolvedDate ?? "");
      setColor(editingEvent.color);
    } else {
      const initialType = allowedTypes[0] ?? "personal";
      setType(initialType);
      setTitle("");
      setDate(defaultDate ?? "");
      setColor(EVENT_TYPE_DEFAULT_COLOR[initialType]);
    }
    setTitleError(false);
    setDateError(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingEvent]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleTypeChange(next: CalendarEventType) {
    setType(next);
    setColor(EVENT_TYPE_DEFAULT_COLOR[next]);
  }

  async function handleSave() {
    if (isWonseoLinked) {
      // 색상만 수정
      setSaving(true);
      const supabase = createClient();
      const { error } = await supabase
        .from("calendar_events")
        .update({ color, updated_at: new Date().toISOString() })
        .eq("id", editingEvent!.id);
      setSaving(false);
      if (error) {
        showToast("색상 변경에 실패했습니다.", "error");
        return;
      }
      showToast("색상이 변경되었습니다.", "success");
      onSaved();
      onClose();
      return;
    }

    const hasTitle = title.trim().length > 0;
    const hasDate = date.trim().length > 0;
    setTitleError(!hasTitle);
    setDateError(!hasDate);
    if (!hasTitle || !hasDate) {
      showToast("제목과 날짜를 입력해 주세요.", "error");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    if (editingEvent) {
      const { error } = await supabase
        .from("calendar_events")
        .update({ title: title.trim(), date, color, updated_at: new Date().toISOString() })
        .eq("id", editingEvent.id);
      setSaving(false);
      if (error) {
        showToast("저장에 실패했습니다.", "error");
        return;
      }
    } else {
      const payload = {
        type,
        title: title.trim(),
        date,
        color,
        created_by: createdBy,
        student_id: type === "personal" ? (scope.studentId ?? null) : null,
        grade: type === "class" ? (scope.grade ?? null) : null,
        class_no: type === "class" ? (scope.classNo ?? null) : null,
      };
      const { error } = await supabase.from("calendar_events").insert(payload);
      setSaving(false);
      if (error) {
        showToast("저장에 실패했습니다.", "error");
        return;
      }
    }

    showToast("저장되었습니다.", "success");
    onSaved();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingEvent ? "일정 수정" : "일정 추가"}
      icon={<CalendarPlus className="w-4 h-4 text-indigo-600" />}
      maxWidth="max-w-sm"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-60"
          >
            {saving ? "저장 중..." : "저장하기"}
          </button>
        </>
      }
    >
      {isWonseoLinked ? (
        <div className="space-y-3">
          <p className="text-[11px] text-slate-400">
            원서 카드에 연결된 일정은 제목·날짜를 여기서 직접 바꿀 수 없어요. 색상만 바꿀 수 있습니다.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
            <p className="font-bold text-slate-800">{title}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{date}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {allowedTypes.length > 1 && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">유형</label>
              <div className="grid grid-cols-2 gap-1.5">
                {allowedTypes.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className={cn(
                      "py-2 rounded-xl border font-bold text-xs transition",
                      type === t
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
                    )}
                  >
                    {EVENT_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              제목 {titleError && <span className="text-rose-500">(필수)</span>}
            </label>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError(false);
              }}
              placeholder="예: 수시 원서 접수 마감"
              className={cn(
                "w-full bg-slate-50 border rounded-xl px-3 py-2.5 font-semibold text-slate-800 focus:outline-none focus:ring-2",
                titleError
                  ? "border-rose-400 focus:ring-rose-400"
                  : "border-slate-300 focus:ring-indigo-500",
              )}
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              날짜 {dateError && <span className="text-rose-500">(필수)</span>}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (dateError) setDateError(false);
              }}
              className={cn(
                "w-full bg-slate-50 border rounded-xl px-3 py-2.5 font-semibold text-slate-800 focus:outline-none focus:ring-2",
                dateError
                  ? "border-rose-400 focus:ring-rose-400"
                  : "border-slate-300 focus:ring-indigo-500",
              )}
            />
          </div>
        </div>
      )}

      <div>
        <label className="block font-bold text-slate-700 mb-1.5">색상</label>
        <div className="flex items-center gap-2">
          {EVENT_COLOR_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 ring-offset-2 transition"
              title={c}
            >
              {color === c && <Check className="w-3.5 h-3.5 text-white" />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block font-bold text-slate-700 mb-1.5">미리보기</label>
        <span
          className="inline-block text-[11px] font-bold text-white px-2.5 py-1 rounded-lg truncate max-w-full"
          style={{ backgroundColor: color }}
        >
          {isWonseoLinked ? title : title.trim() || "제목 미입력"}
        </span>
      </div>
    </Modal>
  );
}
