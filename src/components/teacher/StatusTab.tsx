"use client";

import { useMemo, useState } from "react";
import { CalendarX, FileDown, ListChecks, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useCounselingSlots } from "@/lib/hooks/useCounselingSlots";
import { useActiveClass } from "@/components/providers/ActiveClassProvider";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { DateTabs } from "@/components/ui/DateTabs";
import { EditSlotModal } from "@/components/teacher/EditSlotModal";
import { downloadCsv } from "@/lib/csv";
import { formatTime } from "@/lib/time";
import type { CounselingSlot } from "@/lib/database.types";

export function StatusTab() {
  const { grade, classNo } = useActiveClass();
  const { slots, reload } = useCounselingSlots(
    grade != null && classNo != null ? { grade, classNo } : null,
  );
  const showToast = useToast();
  const confirm = useConfirm();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [editingSlot, setEditingSlot] = useState<CounselingSlot | null>(null);

  const dates = useMemo(
    () => Array.from(new Set(slots.map((s) => s.date))).sort(),
    [slots],
  );
  const activeDate = selectedDate ?? dates[0] ?? null;

  const daySlots = useMemo(
    () =>
      slots
        .filter((s) => s.date === activeDate)
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [slots, activeDate],
  );

  function toggleCheck(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleCheckAll(checkedAll: boolean) {
    setChecked(checkedAll ? new Set(daySlots.map((s) => s.id)) : new Set());
  }

  async function deleteSelected() {
    if (checked.size === 0) {
      showToast("삭제할 슬롯을 선택해 주세요.", "error");
      return;
    }
    const ok = await confirm({
      message: `선택한 ${checked.size}개 슬롯을 삭제하시겠습니까? (예약 내역도 함께 삭제됩니다)`,
      confirmLabel: "삭제",
      danger: true,
    });
    if (!ok) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("counseling_slots")
      .delete()
      .in("id", Array.from(checked));
    if (error) {
      showToast("삭제에 실패했습니다.", "error");
      return;
    }
    showToast("삭제되었습니다.", "success");
    setChecked(new Set());
  }

  async function deleteOne(id: string) {
    const ok = await confirm({ message: "이 슬롯을 삭제하시겠습니까?", danger: true });
    if (!ok) return;
    const supabase = createClient();
    await supabase.from("counseling_slots").delete().eq("id", id);
    showToast("삭제되었습니다.", "success");
  }

  function exportCsv() {
    const sorted = [...slots].sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time));
    const rows: (string | number)[][] = [
      ["날짜", "시작", "종료", "상태", "학번", "이름", "신청일시", "메모"],
      ...sorted.map((s) => [
        s.date,
        formatTime(s.start_time),
        formatTime(s.end_time),
        s.is_booked ? "예약됨" : "가능",
        s.student_id ?? "",
        s.student_name ?? "",
        s.booked_at ? new Date(s.booked_at).toLocaleString("ko-KR") : "",
        s.memo ?? "",
      ]),
    ];
    downloadCsv(`상담현황_전체기간.csv`, rows);
  }

  const allChecked = daySlots.length > 0 && daySlots.every((s) => checked.has(s.id));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-indigo-600" />
            <span>상담 슬롯 및 신청 현황</span>
          </h3>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={deleteSelected}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>선택 삭제</span>
            </button>
            <button
              onClick={exportCsv}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>엑셀 일괄 다운로드</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <DateTabs dates={dates} selected={activeDate} onSelect={setSelectedDate} />
          {daySlots.length > 0 && (
            <button
              onClick={() => toggleCheckAll(!allChecked)}
              className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 underline shrink-0 self-start sm:self-auto"
            >
              {allChecked ? "전체 선택 해제" : "전체 선택"}
            </button>
          )}
        </div>

        {daySlots.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-2">
            {daySlots.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "rounded-2xl border p-4 flex flex-col gap-2.5",
                  s.is_booked
                    ? "bg-indigo-50 border-indigo-300"
                    : "bg-white border-slate-200",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked.has(s.id)}
                      onChange={() => toggleCheck(s.id)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-black text-slate-900">
                      {formatTime(s.start_time)} ~ {formatTime(s.end_time)}
                    </span>
                  </label>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setEditingSlot(s)}
                      className="text-slate-400 hover:text-indigo-600"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteOne(s.id)}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {s.is_booked ? (
                  <div className="text-[11px] font-bold text-indigo-700 space-y-0.5">
                    <div className="bg-indigo-100 text-indigo-700 inline-block px-2 py-0.5 rounded-full">
                      예약됨 · {s.student_id} {s.student_name}
                    </div>
                    {s.booked_at && (
                      <p className="text-slate-400 font-semibold">
                        신청일시: {new Date(s.booked_at).toLocaleString("ko-KR")}
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-100 inline-block px-2 py-0.5 rounded-full w-fit">
                    신청 가능
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {daySlots.length === 0 && (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-2">
              <CalendarX className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-500">
              선택된 날짜에 등록된 상담 슬롯이 없거나 내역이 없습니다.
            </p>
          </div>
        )}
      </div>

      <EditSlotModal slot={editingSlot} onClose={() => setEditingSlot(null)} onSaved={reload} />
    </div>
  );
}
