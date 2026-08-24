"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Eye, EyeOff, FileSpreadsheet, GraduationCap, LayoutGrid, Plus, Table2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useRoster } from "@/lib/hooks/useRoster";
import { useStatusReveal } from "@/lib/hooks/useStatusReveal";
import { useEqualHeights } from "@/lib/hooks/useEqualHeights";
import { useActiveClass } from "@/components/providers/ActiveClassProvider";
import { SortableWonseoCard } from "@/components/wonseo/SortableWonseoCard";
import { WonseoCardView } from "@/components/wonseo/WonseoCardView";
import { WonseoCardModal } from "@/components/wonseo/WonseoCardModal";
import { WonseoTableView } from "@/components/teacher/WonseoTableView";
import { exportWonseoExcel } from "@/lib/wonseo-excel";
import type { WonseoCard } from "@/lib/database.types";

type ViewMode = "cards" | "table";

export function WonseoManageTab() {
  const showToast = useToast();
  const confirm = useConfirm();
  const { roster } = useRoster();
  const { enabled: statusVisible, toggle } = useStatusReveal();
  const { isAdmin } = useActiveClass();

  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [cards, setCards] = useState<WonseoCard[]>([]);
  const [allCards, setAllCards] = useState<WonseoCard[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<WonseoCard | null>(null);
  const [exporting, setExporting] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);
  const { setRef, maxHeight } = useEqualHeights(
    cards.map((c) => c.id).join("|"),
    cards.length,
  );

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const reload = async (studentId: string) => {
    if (!studentId) {
      setCards([]);
      return;
    }
    const { data } = await supabase
      .from("wonseo_cards")
      .select("*")
      .eq("student_id", studentId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    setCards(data ?? []);
  };

  const reloadAll = async () => {
    const { data } = await supabase.from("wonseo_cards").select("*");
    setAllCards(data ?? []);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload(selectedStudentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId]);

  useEffect(() => {
    if (viewMode === "table") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      reloadAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

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

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = cards.findIndex((c) => c.id === active.id);
    const newIndex = cards.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(cards, oldIndex, newIndex).map((card, index) => ({
      ...card,
      sort_order: index,
    }));
    setCards(reordered);

    const results = await Promise.all(
      reordered.map((card) =>
        supabase.from("wonseo_cards").update({ sort_order: card.sort_order }).eq("id", card.id),
      ),
    );
    if (results.some((r) => r.error)) {
      showToast("순서 저장에 실패했습니다.", "error");
      reload(selectedStudentId);
    }
  }

  async function handleExportExcel() {
    setExporting(true);
    const { data, error } = await supabase.from("wonseo_cards").select("*");
    if (error || !data) {
      showToast("엑셀 데이터를 불러오지 못했습니다.", "error");
      setExporting(false);
      return;
    }
    if (data.length === 0) {
      showToast("등록된 원서 카드가 없습니다.", "error");
      setExporting(false);
      return;
    }
    await exportWonseoExcel(roster, data);
    setExporting(false);
  }

  async function handleToggleStatus() {
    const ok = await toggle();
    showToast(
      ok ? (statusVisible ? "합격 상태가 비공개로 전환되었습니다." : "합격 상태가 공개되었습니다.") : "변경에 실패했습니다.",
      ok ? "success" : "error",
    );
  }

  const activeCard = cards.find((c) => c.id === activeId) ?? null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            <span>학생 수시 원서 지도 및 관리</span>
          </h3>
          {isAdmin && (
            <button
              onClick={handleToggleStatus}
              className={cn(
                "w-[168px] shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5",
                statusVisible
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-slate-200 hover:bg-slate-300 text-slate-700",
              )}
            >
              {statusVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>합격 상태</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("cards")}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5",
              viewMode === "cards"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>카드 보기</span>
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5",
              viewMode === "table"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            )}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>전체 보기</span>
          </button>
        </div>

        {viewMode === "cards" ? (
          <>
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
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={(e) => setActiveId(String(e.active.id))}
                  onDragCancel={() => setActiveId(null)}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={cards.map((c) => c.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                      {cards.map((card, index) => (
                        <SortableWonseoCard
                          key={card.id}
                          id={card.id}
                          setEqualHeightRef={setRef(index)}
                          minHeight={maxHeight}
                          isDragging={activeId === card.id}
                          card={card}
                          showStatus={statusVisible}
                          onEdit={() => openEdit(card)}
                          onDelete={() => handleDelete(card)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeCard && (
                      <div className="shadow-2xl shadow-indigo-900/30 rounded-3xl rotate-1 scale-[1.03]">
                        <WonseoCardView
                          card={activeCard}
                          showStatus={statusVisible}
                          onEdit={() => {}}
                          onDelete={() => {}}
                        />
                      </div>
                    )}
                  </DragOverlay>
                </DndContext>
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
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button
                onClick={handleExportExcel}
                disabled={exporting}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-60"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{exporting ? "생성 중..." : "엑셀 일괄 다운로드"}</span>
              </button>
            </div>
            <WonseoTableView roster={roster} cards={allCards} />
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
          nextSortOrder={cards.length}
          onSaved={() => reload(selectedStudentId)}
        />
      )}
    </div>
  );
}
