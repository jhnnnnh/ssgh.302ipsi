"use client";

import { useMemo, useState } from "react";
import { CalendarX, CircleCheck, Clock, X } from "lucide-react";
import { useCounselingSlots } from "@/lib/hooks/useCounselingSlots";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { DateTabs } from "@/components/ui/DateTabs";
import { formatDateFull, formatTime } from "@/lib/time";
import { cn } from "@/lib/cn";

export function SlotBookingTab({ studentId }: { studentId: string }) {
  const { slots, loading } = useCounselingSlots();
  const showToast = useToast();
  const confirm = useConfirm();
  const [busyId, setBusyId] = useState<string | null>(null);

  const dates = useMemo(
    () => Array.from(new Set(slots.map((s) => s.date))).sort(),
    [slots],
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const activeDate = selectedDate ?? dates[0] ?? null;

  const daySlots = useMemo(
    () =>
      slots
        .filter((s) => s.date === activeDate)
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [slots, activeDate],
  );

  const myReservations = useMemo(
    () =>
      slots
        .filter((s) => s.is_booked && s.student_id === studentId)
        .sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time)),
    [slots, studentId],
  );

  async function handleBook(slotId: string) {
    setBusyId(slotId);
    const supabase = createClient();
    const { error } = await supabase.rpc("book_slot", { p_slot_id: slotId });
    setBusyId(null);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    showToast("상담이 신청되었습니다.", "success");
  }

  async function handleCancel(slotId: string) {
    const ok = await confirm({
      message: "신청한 상담을 취소하시겠습니까?",
      confirmLabel: "취소하기",
      danger: true,
    });
    if (!ok) return;
    setBusyId(slotId);
    const supabase = createClient();
    const { error } = await supabase.rpc("cancel_slot", { p_slot_id: slotId });
    setBusyId(null);
    if (error) {
      showToast(error.message, "error");
      return;
    }
    showToast("상담 신청이 취소되었습니다.", "success");
  }

  return (
    <div className="space-y-6">
      {myReservations.length > 0 && (
        <div className="bg-white border-2 border-indigo-500/80 rounded-3xl p-5 shadow-xs">
          <h3 className="text-xs font-bold text-indigo-900 mb-3 flex items-center gap-2">
            <CircleCheck className="w-4 h-4 text-indigo-600" />
            <span>내가 신청한 상담 내역</span>
          </h3>
          <div className="space-y-2.5">
            {myReservations.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between bg-indigo-50/60 border border-indigo-100 rounded-2xl px-4 py-3"
              >
                <div className="text-xs font-bold text-indigo-900">
                  {formatDateFull(r.date)} · {formatTime(r.start_time)}~{formatTime(r.end_time)}
                </div>
                <button
                  onClick={() => handleCancel(r.id)}
                  disabled={busyId === r.id}
                  className="text-[11px] font-bold text-rose-600 hover:underline disabled:opacity-50 flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  취소
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-indigo-200 space-y-4">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>상담 가능 시간 슬롯</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            * 원하는 날짜 탭을 선택한 후 시간을 확인해 신청해 주세요. (하루 최대 1개 가능)
          </p>
        </div>

        <DateTabs dates={dates} selected={activeDate} onSelect={setSelectedDate} />

        {!loading && daySlots.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-2">
            {daySlots.map((slot) => {
              const isMine = slot.is_booked && slot.student_id === studentId;
              const isTaken = slot.is_booked && !isMine;
              return (
                <div
                  key={slot.id}
                  className={cn(
                    "rounded-2xl border p-4 flex flex-row items-center justify-between gap-3 sm:flex-col sm:items-stretch",
                    isMine && "bg-indigo-50 border-indigo-300",
                    isTaken && "bg-slate-100 border-indigo-200",
                    !slot.is_booked && "bg-white border-indigo-200",
                  )}
                >
                  <div
                    className={cn(
                      "text-sm font-black",
                      isTaken ? "text-slate-400" : "text-slate-900",
                    )}
                  >
                    {formatTime(slot.start_time)} ~ {formatTime(slot.end_time)}
                  </div>

                  {isMine && (
                    <button
                      onClick={() => handleCancel(slot.id)}
                      disabled={busyId === slot.id}
                      className="shrink-0 w-24 h-9 sm:w-full flex items-center justify-center bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-60"
                    >
                      취소하기
                    </button>
                  )}
                  {isTaken && (
                    <span className="shrink-0 w-24 h-9 sm:w-full flex items-center justify-center bg-slate-200 text-slate-500 rounded-xl text-xs font-bold text-center">
                      신청 마감
                    </span>
                  )}
                  {!slot.is_booked && (
                    <button
                      onClick={() => handleBook(slot.id)}
                      disabled={busyId === slot.id}
                      className="shrink-0 w-24 h-9 sm:w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-60"
                    >
                      신청하기
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && daySlots.length === 0 && (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-2">
              <CalendarX className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-slate-600">개설된 상담 슬롯이 없습니다.</p>
            <p className="text-xs text-slate-400 mt-1">
              선생님께서 상담 일정을 개설할 때까지 기다려 주세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
