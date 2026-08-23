"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { todayDateString } from "@/lib/time";

export function AddDateModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (date: string) => void;
}) {
  const [date, setDate] = useState(todayDateString);

  function handleAdd() {
    if (!date) return;
    onAdd(date);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="날짜 추가"
      icon={<CalendarPlus className="w-4 h-4 text-indigo-600" />}
      maxWidth="max-w-xs"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
          >
            취소
          </button>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            추가하기
          </button>
        </>
      }
    >
      <div>
        <label className="block font-bold text-slate-700 mb-1">날짜 선택</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    </Modal>
  );
}
