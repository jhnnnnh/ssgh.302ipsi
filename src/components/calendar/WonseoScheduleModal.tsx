"use client";

import { useEffect, useState } from "react";
import { Check, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/providers/ToastProvider";
import {
  findWonseoScheduleGroups,
  getScheduleItemsForAdmissionType,
  addScheduleEvent,
  type CardScheduleGroup,
} from "@/lib/wonseo-schedule";

/** "내 원서 일정": 원서 카드의 전형데이터에서 뽑아낸 논술/면접/원서접수 등 일정을 훑어보고, 항목별로 캘린더에 넣는다. */
export function WonseoScheduleModal({
  open,
  onClose,
  scope,
  createdBy,
  showStudentName,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  scope: { studentId?: string; classScope?: { grade: number; classNo: number } };
  createdBy: string;
  /** 교사 화면처럼 "(학생이름)"을 그룹 제목에 같이 보여줄지 여부. */
  showStudentName?: boolean;
  onImported: () => void;
}) {
  const showToast = useToast();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<CardScheduleGroup[]>([]);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Record<string, string>>({});
  const [loadingSuggestion, setLoadingSuggestion] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    findWonseoScheduleGroups(scope).then((result) => {
      if (cancelled) return;
      setGroups(result);
      setSelectedSuggestion({});
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, scope.studentId, scope.classScope?.grade, scope.classScope?.classNo]);

  async function handlePickSuggestion(group: CardScheduleGroup, admissionType: string) {
    setLoadingSuggestion(group.cardId);
    try {
      const items = await getScheduleItemsForAdmissionType(
        group.cardId,
        group.university,
        group.department ?? "",
        admissionType,
      );
      setSelectedSuggestion((prev) => ({ ...prev, [group.cardId]: admissionType }));
      setGroups((prev) =>
        prev.map((g) => {
          if (g.cardId !== group.cardId) return g;
          // 추천 전형 기반 항목만 교체하고, 직접 등록한 일정은 그대로 둔다.
          const manual = g.items.filter((it) => it.kind === "직접등록");
          return { ...g, items: [...items, ...manual] };
        }),
      );
      if (items.length === 0) {
        showToast("이 전형에도 날짜 데이터가 없어요.", "error");
      }
    } catch {
      showToast("전형 정보를 불러오지 못했습니다.", "error");
    } finally {
      setLoadingSuggestion(null);
    }
  }

  async function handleAdd(group: CardScheduleGroup, item: CardScheduleGroup["items"][number]) {
    const key = `${group.cardId}::${item.kind}`;
    setAddingKey(key);
    try {
      await addScheduleEvent({
        cardId: group.cardId,
        studentId: group.studentId,
        grade: group.grade,
        classNo: group.classNo,
        university: group.university,
        kind: item.kind,
        label: item.label,
        date: item.date,
        createdBy,
      });
      setGroups((prev) =>
        prev.map((g) =>
          g.cardId !== group.cardId
            ? g
            : { ...g, items: g.items.map((it) => (it.kind === item.kind ? { ...it, added: true } : it)) },
        ),
      );
      onImported();
    } catch {
      showToast("캘린더에 추가하지 못했습니다.", "error");
    } finally {
      setAddingKey(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="내 원서 일정" maxWidth="max-w-md">
      {loading ? (
        <p className="text-[11px] text-slate-400 text-center py-6">불러오는 중...</p>
      ) : groups.length === 0 ? (
        <p className="text-[11px] text-slate-400 text-center py-6">
          찾을 수 있는 일정이 없어요. 원서 카드에 대학·학과·세부 전형명이 입력돼 있어야 전형데이터에서
          일정을 찾을 수 있어요.
        </p>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {groups.map((group) => {
            const picked = selectedSuggestion[group.cardId];
            return (
              <div key={group.cardId} className="border border-slate-200 rounded-xl p-3">
                <p className="text-xs font-bold text-slate-800">
                  {showStudentName && group.studentName ? `${group.studentName} · ` : ""}
                  {group.university}
                  {group.department ? ` · ${group.department}` : ""}
                  {group.subCategory ? ` · ${group.subCategory}` : ""}
                </p>

                {group.suggestions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[11px] text-slate-400">
                      &ldquo;{group.subCategory}&rdquo;과(와) 정확히 일치하는 전형을 못 찾았어요. 비슷한 전형 중
                      맞는 걸 골라주세요.
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {group.suggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handlePickSuggestion(group, s)}
                          disabled={loadingSuggestion === group.cardId}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition disabled:opacity-60 ${
                            picked === s
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-2 space-y-1.5">
                  {group.items.map((item) => {
                    const key = `${group.cardId}::${item.kind}`;
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
                      >
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold text-slate-700">{item.label}</span>
                          <span className="text-[10px] text-slate-400 ml-1.5">{item.date}</span>
                        </div>
                        {item.added ? (
                          <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                            <Check className="w-3 h-3" />
                            추가됨
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAdd(group, item)}
                            disabled={addingKey === key}
                            className="shrink-0 flex items-center gap-1 px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition disabled:opacity-60"
                          >
                            <Plus className="w-3 h-3" />
                            캘린더에 추가
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
