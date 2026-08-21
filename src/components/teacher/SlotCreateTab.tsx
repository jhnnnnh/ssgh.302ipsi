"use client";

import { useState } from "react";
import { Bolt, Bookmark, SquarePlus, Star, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useFavorites } from "@/lib/hooks/useFavorites";
import {
  autoFormatTime,
  isValidTime,
  addMinutesToTime,
  formatTime,
  todayDateString,
} from "@/lib/time";
import type { FavoriteCategory } from "@/lib/database.types";

export function SlotCreateTab() {
  const showToast = useToast();
  const confirm = useConfirm();
  const { favorites, reload } = useFavorites();

  const [date, setDate] = useState(todayDateString);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [endTouched, setEndTouched] = useState(false);

  function handleStartChange(value: string) {
    const formatted = autoFormatTime(value);
    setStart(formatted);
    if (!endTouched && isValidTime(formatted)) {
      setEnd(addMinutesToTime(formatted, 30));
    }
  }

  function handleEndChange(value: string) {
    setEndTouched(true);
    setEnd(autoFormatTime(value));
  }

  const [favCategory, setFavCategory] = useState<FavoriteCategory>("weekday");
  const [favStart, setFavStart] = useState("");
  const [favEnd, setFavEnd] = useState("");

  const weekdayFavorites = favorites.filter((f) => f.category === "weekday");
  const weekendFavorites = favorites.filter((f) => f.category === "weekend");

  async function createNewSlot() {
    if (!date) {
      showToast("상담 날짜를 선택해 주세요.", "error");
      return;
    }
    if (!isValidTime(start) || !isValidTime(end)) {
      showToast("시작/종료 시간을 HH:MM 형식으로 입력해 주세요.", "error");
      return;
    }
    if (start >= end) {
      showToast("종료 시간은 시작 시간보다 늦어야 합니다.", "error");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase
      .from("counseling_slots")
      .insert({ date, start_time: start, end_time: end });
    if (error) {
      showToast("슬롯 생성에 실패했습니다.", "error");
      return;
    }
    showToast("상담 슬롯이 추가되었습니다.", "success");
    setStart("");
    setEnd("");
    setEndTouched(false);
  }

  async function addFavoriteSlot() {
    if (!isValidTime(favStart) || !isValidTime(favEnd)) {
      showToast("즐겨찾기 시간을 HH:MM 형식으로 입력해 주세요.", "error");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase
      .from("slot_favorites")
      .insert({ category: favCategory, start_time: favStart, end_time: favEnd });
    if (error) {
      showToast("즐겨찾기 추가에 실패했습니다.", "error");
      return;
    }
    showToast("즐겨찾기가 추가되었습니다.", "success");
    setFavStart("");
    setFavEnd("");
    reload();
  }

  async function removeFavorite(id: string) {
    const supabase = createClient();
    await supabase.from("slot_favorites").delete().eq("id", id);
    reload();
  }

  async function generateAllFavorites(category: FavoriteCategory) {
    if (!date) {
      showToast("먼저 상담 날짜를 선택해 주세요.", "error");
      return;
    }
    const list = category === "weekday" ? weekdayFavorites : weekendFavorites;
    if (list.length === 0) {
      showToast("등록된 즐겨찾기가 없습니다.", "error");
      return;
    }
    const ok = await confirm({
      message: `${date} 날짜에 ${category === "weekday" ? "평일" : "휴일"} 즐겨찾기 ${list.length}개를 일괄 생성하시겠습니까?`,
      confirmLabel: "일괄 생성",
    });
    if (!ok) return;

    const supabase = createClient();
    const { error } = await supabase.from("counseling_slots").insert(
      list.map((f) => ({ date, start_time: f.start_time, end_time: f.end_time })),
    );
    if (error) {
      showToast("일괄 생성에 실패했습니다.", "error");
      return;
    }
    showToast(`${list.length}개 슬롯이 생성되었습니다.`, "success");
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <SquarePlus className="w-4 h-4 text-indigo-600" />
            <span>새 상담 슬롯 생성</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">상담 날짜</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              시작 시간 (HH:MM)
            </label>
            <input
              value={start}
              onChange={(e) => handleStartChange(e.target.value)}
              placeholder="13:00"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              종료 시간 (HH:MM)
            </label>
            <input
              value={end}
              onChange={(e) => handleEndChange(e.target.value)}
              placeholder="13:30"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={createNewSlot}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2"
          >
            <SquarePlus className="w-3.5 h-3.5" />
            <span>상담 슬롯 추가</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-6">
        <div>
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            <span>자주 사용하는 시간 (즐겨찾기)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            위에서 선택한 날짜에 즐겨찾기 시간대를 한 번에 생성할 수 있습니다.
          </p>
        </div>

        <FavoriteGroup
          label="평일 즐겨찾기"
          items={weekdayFavorites}
          onGenerate={() => generateAllFavorites("weekday")}
          onRemove={removeFavorite}
        />
        <FavoriteGroup
          label="휴일 즐겨찾기"
          items={weekendFavorites}
          onGenerate={() => generateAllFavorites("weekend")}
          onRemove={removeFavorite}
        />

        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">구분</label>
            <select
              value={favCategory}
              onChange={(e) => setFavCategory(e.target.value as FavoriteCategory)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
            >
              <option value="weekday">평일</option>
              <option value="weekend">휴일</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">시작 시간</label>
            <input
              value={favStart}
              onChange={(e) => {
                const v = autoFormatTime(e.target.value);
                setFavStart(v);
                if (isValidTime(v) && !favEnd) setFavEnd(addMinutesToTime(v, 30));
              }}
              placeholder="16:00"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">종료 시간</label>
            <input
              value={favEnd}
              onChange={(e) => setFavEnd(autoFormatTime(e.target.value))}
              placeholder="16:30"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800"
            />
          </div>
          <button
            onClick={addFavoriteSlot}
            className="py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>즐겨찾기 추가</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function FavoriteGroup({
  label,
  items,
  onGenerate,
  onRemove,
}: {
  label: string;
  items: { id: string; start_time: string; end_time: string }[];
  onGenerate: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-amber-500" />
          <span>{label}</span>
        </span>
        <button
          onClick={onGenerate}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1"
        >
          <Bolt className="w-3 h-3" />
          <span>전체 일괄 생성</span>
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.length === 0 && (
          <p className="text-[11px] text-slate-400">등록된 즐겨찾기가 없습니다.</p>
        )}
        {items.map((f) => (
          <span
            key={f.id}
            className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700"
          >
            {formatTime(f.start_time)}~{formatTime(f.end_time)}
            <button onClick={() => onRemove(f.id)} className="text-slate-400 hover:text-rose-500">
              <Trash2 className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
