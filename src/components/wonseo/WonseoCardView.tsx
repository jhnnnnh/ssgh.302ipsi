"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { WonseoImageThumb } from "@/components/wonseo/WonseoImageThumb";
import { LEVEL_EMPHASIS_STYLE, STATUS_BADGE_STYLE, STATUS_OPTIONS } from "@/lib/wonseo-constants";
import type { WonseoCard, WonseoImage } from "@/lib/database.types";

export function WonseoCardView({
  card,
  showStatus,
  onEdit,
  onDelete,
}: {
  card: WonseoCard;
  showStatus: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [images, setImages] = useState<WonseoImage[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("wonseo_images")
      .select("*")
      .eq("card_id", card.id)
      .then(({ data }) => setImages(data ?? []));
  }, [card.id]);

  const statusLabel = STATUS_OPTIONS.find((o) => o.value === card.status)?.label ?? card.status;

  const emphasis = LEVEL_EMPHASIS_STYLE[card.level];

  return (
    <div
      className={`bg-white rounded-3xl border-2 ${emphasis.border} shadow-sm overflow-hidden flex`}
    >
      <div className={`w-2 shrink-0 ${emphasis.bar}`} />
      <div className="flex-1 p-5 space-y-3 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-black text-slate-900">{card.rank || "지망 미지정"}</span>
          <span
            className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${emphasis.badge}`}
          >
            {card.level}
          </span>
          {showStatus && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_BADGE_STYLE[card.status]}`}
            >
              {statusLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div>
        <h4 className="text-base font-black text-slate-900">{card.university}</h4>
        <p className="text-xs text-slate-500 font-semibold">{card.department}</p>
      </div>

      <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">{card.category}</span>
        {card.sub_category && (
          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
            {card.sub_category}
          </span>
        )}
      </div>

      <div className="text-xs text-slate-600 space-y-1 border-t border-slate-100 pt-3">
        {card.selection_mode === "single" ? (
          card.stage_single && <p>· {card.stage_single}</p>
        ) : (
          <>
            {card.stage_1 && <p>· 1단계: {card.stage_1}</p>}
            {card.stage_2 && <p>· 2단계: {card.stage_2}</p>}
          </>
        )}
        {card.calculated_grade && <p>· 산출 등급: {card.calculated_grade}</p>}
        {card.min_standard && <p>· 수능 최저: {card.min_standard}</p>}
        {card.has_exam_date && card.exam_date && (
          <p className="flex items-center gap-1 text-indigo-600 font-bold">
            <CalendarClock className="w-3 h-3" />
            {card.exam_date}
          </p>
        )}
      </div>

      {card.memo && (
        <p className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3 whitespace-pre-wrap">
          {card.memo}
        </p>
      )}

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {images.map((img) => (
            <WonseoImageThumb key={img.id} path={img.storage_path} />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
