"use client";

import { useEffect, useState } from "react";
import { PencilLine } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { autoFormatTime, isValidTime } from "@/lib/time";
import type { CounselingSlot } from "@/lib/database.types";

export function EditSlotModal({
  slot,
  onClose,
  onSaved,
}: {
  slot: CounselingSlot | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const showToast = useToast();
  const confirm = useConfirm();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (slot) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStart(slot.start_time.slice(0, 5));
      setEnd(slot.end_time.slice(0, 5));
    }
  }, [slot]);

  if (!slot) return null;

  async function handleSave() {
    if (!isValidTime(start) || !isValidTime(end) || start >= end) {
      showToast("올바른 시간 형식(HH:MM), 종료 > 시작을 확인해 주세요.", "error");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("counseling_slots")
      .update({ start_time: start, end_time: end })
      .eq("id", slot!.id);
    setSaving(false);
    if (error) {
      showToast("저장에 실패했습니다.", "error");
      return;
    }
    showToast("슬롯 정보가 수정되었습니다.", "success");
    onSaved();
    onClose();
  }

  async function handleForceCancel() {
    const ok = await confirm({
      message: "이 슬롯의 예약을 강제로 취소하시겠습니까?",
      confirmLabel: "예약 취소",
      danger: true,
    });
    if (!ok) return;
    const supabase = createClient();
    const { error } = await supabase.rpc("cancel_slot", { p_slot_id: slot!.id });
    if (error) {
      showToast(error.message, "error");
      return;
    }
    showToast("예약이 취소되었습니다.", "success");
    onSaved();
  }

  return (
    <Modal
      open={!!slot}
      onClose={onClose}
      title="상담 슬롯 정보 수정"
      icon={<PencilLine className="w-4 h-4 text-indigo-600" />}
      maxWidth="max-w-md"
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
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-60"
          >
            저장하기
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">시작 시간</label>
          <input
            value={start}
            onChange={(e) => setStart(autoFormatTime(e.target.value))}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">종료 시간</label>
          <input
            value={end}
            onChange={(e) => setEnd(autoFormatTime(e.target.value))}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800"
          />
        </div>
      </div>

      <div className="border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-bold text-slate-700">예약 학생 정보</label>
          {slot.is_booked && (
            <button
              onClick={handleForceCancel}
              className="text-[11px] font-bold text-rose-600 hover:underline"
            >
              예약 강제 취소
            </button>
          )}
        </div>
        {slot.is_booked ? (
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 font-semibold">
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              {slot.student_id}
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              {slot.student_name}
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400">예약된 학생이 없습니다.</p>
        )}
      </div>
    </Modal>
  );
}
