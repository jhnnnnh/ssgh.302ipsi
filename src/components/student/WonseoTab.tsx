"use client";

import { useEffect, useMemo, useState } from "react";
import { Layers, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useStatusReveal } from "@/lib/hooks/useStatusReveal";
import { WonseoCardView } from "@/components/wonseo/WonseoCardView";
import { WonseoCardModal } from "@/components/wonseo/WonseoCardModal";
import type { WonseoCard } from "@/lib/database.types";

export function WonseoTab({ studentId }: { studentId: string }) {
  const showToast = useToast();
  const confirm = useConfirm();
  const { enabled: statusVisible } = useStatusReveal();
  const [cards, setCards] = useState<WonseoCard[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<WonseoCard | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const reload = async () => {
    const { data } = await supabase
      .from("wonseo_cards")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: true });
    setCards(data ?? []);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

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
    reload();
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-sm border border-indigo-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
            {cards.length}개 등록됨
          </span>
          <h3 className="text-lg font-black tracking-tight text-white">나의 수시 카드</h3>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl text-xs font-bold transition shadow-md shadow-indigo-900/50 flex items-center gap-2 shrink-0 border border-indigo-400/40"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>수시 원서 카드 추가</span>
        </button>
      </div>

      {cards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {cards.map((card) => (
            <WonseoCardView
              key={card.id}
              card={card}
              showStatus={statusVisible}
              onEdit={() => openEdit(card)}
              onDelete={() => handleDelete(card)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 space-y-3">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-3xl flex items-center justify-center mx-auto text-2xl shadow-xs">
            <Layers className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-800">
            등록된 수시 원서 카드가 없습니다.
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            상단의 <strong className="text-indigo-600">[수시 원서 카드 추가]</strong> 버튼을
            눌러 지망 순위별 대학 및 모집단위 정보를 등록해 보세요.
          </p>
        </div>
      )}

      <WonseoCardModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        studentId={studentId}
        editingCard={editingCard}
        canEditStatus={false}
        onSaved={reload}
      />
    </div>
  );
}
