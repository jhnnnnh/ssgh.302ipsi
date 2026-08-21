"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, GraduationCap, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useRoster } from "@/lib/hooks/useRoster";
import { useStatusReveal } from "@/lib/hooks/useStatusReveal";
import { WonseoCardView } from "@/components/wonseo/WonseoCardView";
import { WonseoCardModal } from "@/components/wonseo/WonseoCardModal";
import type { WonseoCard } from "@/lib/database.types";

export function WonseoManageTab() {
  const showToast = useToast();
  const confirm = useConfirm();
  const { roster } = useRoster();
  const { enabled: statusVisible, toggle } = useStatusReveal();

  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [cards, setCards] = useState<WonseoCard[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<WonseoCard | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const reload = async (studentId: string) => {
    if (!studentId) {
      setCards([]);
      return;
    }
    const { data } = await supabase
      .from("wonseo_cards")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: true });
    setCards(data ?? []);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload(selectedStudentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId]);

  function openCreate() {
    setEditingCard(null);
    setModalOpen(true);
  }
  function openEdit(card: WonseoCard) {
    setEditingCard(card);
    setModalOpen(true);
  }

  async function handleDelete(card: WonseoCard) {
    const ok = await confirm({
      message: `${card.university || "해당"} 원서 카드를 삭제하시겠습니까?`,
      confirmLabel: "삭제",
      danger: true,
    });
    if (!ok) return;
    const { error } = await supabase.from("wonseo_cards").delete().eq("id", card.id);
    if (error) {
      showToast("삭제에 실패했습니다.", "error");
      return;
    }
    showToast("삭제되었습니다.", "success");
    reload(selectedStudentId);
  }

  async function handleToggleStatus() {
    const ok = await toggle();
    showToast(
      ok ? (statusVisible ? "합격 상태가 비공개로 전환되었습니다." : "합격 상태가 공개되었습니다.") : "변경에 실패했습니다.",
      ok ? "success" : "error",
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              <span>학생 수시 원서 지도 및 관리</span>
            </h3>
            <p className="text-xs text-slate-400">
              학생을 선택하여 작성한 원서 카드를 실시간 조회/수정하거나, 합격 상태 공개 모드를
              제어할 수 있습니다.
            </p>
          </div>
          <button
            onClick={handleToggleStatus}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusVisible
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-slate-200 hover:bg-slate-300 text-slate-700"
            }`}
          >
            {statusVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>합격 상태 {statusVisible ? "공개 (ON)" : "비공개 (OFF)"}</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="text-xs font-bold text-slate-700 shrink-0">대상 학생 선택:</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full sm:w-64 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- 학생을 선택하세요 --</option>
              {roster.map((r) => (
                <option key={r.student_id} value={r.student_id}>
                  {r.student_id} {r.name}
                </option>
              ))}
            </select>
          </div>
          {selectedStudentId && (
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-2xs flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>수시 원서 추가</span>
            </button>
          )}
        </div>

        {selectedStudentId ? (
          cards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {cards.map((card) => (
                <WonseoCardView
                  key={card.id}
                  card={card}
                  showStatus
                  onEdit={() => openEdit(card)}
                  onDelete={() => handleDelete(card)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-xs font-semibold text-slate-500">
                이 학생은 아직 등록한 원서 카드가 없습니다.
              </p>
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-2">
              <GraduationCap className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-500">
              상단에서 학생을 선택하면 해당 학생의 수시 원서 카드가 표시됩니다.
            </p>
          </div>
        )}
      </div>

      {selectedStudentId && (
        <WonseoCardModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          studentId={selectedStudentId}
          editingCard={editingCard}
          canEditStatus
          onSaved={() => reload(selectedStudentId)}
        />
      )}
    </div>
  );
}
