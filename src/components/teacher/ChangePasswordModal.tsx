"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";

export function ChangePasswordModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const showToast = useToast();
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (newPw.length < 6) {
      showToast("비밀번호는 6자 이상이어야 합니다.", "error");
      return;
    }
    if (newPw !== confirmPw) {
      showToast("비밀번호가 일치하지 않습니다.", "error");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSaving(false);
    if (error) {
      showToast(`변경에 실패했습니다: ${error.message}`, "error");
      return;
    }
    showToast("비밀번호가 변경되었습니다.", "success");
    setNewPw("");
    setConfirmPw("");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="선생님 비밀번호 변경"
      icon={<KeyRound className="w-4 h-4 text-indigo-600" />}
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
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-60"
          >
            변경 저장
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">새 비밀번호</label>
          <input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="새 비밀번호"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">비밀번호 확인</label>
          <input
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            placeholder="비밀번호 확인"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
    </Modal>
  );
}
