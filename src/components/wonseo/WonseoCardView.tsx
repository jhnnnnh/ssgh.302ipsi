"use client";

import { forwardRef, useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { WonseoAttachmentPreview } from "@/components/wonseo/WonseoAttachmentPreview";
import { WonseoImageLightbox } from "@/components/wonseo/WonseoImageLightbox";
import { RecentResultsSection } from "@/components/wonseo/RecentResultsSection";
import { RankBadge } from "@/components/wonseo/RankBadge";
import { LEVEL_EMPHASIS_STYLE, STATUS_BADGE_STYLE, STATUS_OPTIONS } from "@/lib/wonseo-constants";
import { formatDateLabel } from "@/lib/time";
import type { RankMode, WonseoCard, WonseoImage } from "@/lib/database.types";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="text-slate-500">{label} </span>
      <span className="font-semibold text-slate-800 whitespace-pre-line">{value}</span>
    </p>
  );
}

export const WonseoCardView = forwardRef<
  HTMLDivElement,
  {
    card: WonseoCard;
    showStatus: boolean;
    onEdit: () => void;
    onDelete: () => void;
    minHeight?: number;
    style?: React.CSSProperties;
    className?: string;
    dragHandle?: React.ReactNode;
    /** 이 카드에 보여줄 지망 순위 라벨(형제 카드들과 함께 계산되므로 부모가 넘겨준다). */
    rankLabel?: string;
    onRankUpdate?: (patch: { rank_mode: RankMode; rank?: string | null }) => void | Promise<void>;
  }
>(function WonseoCardView(
  { card, showStatus, onEdit, onDelete, minHeight, style, className, dragHandle, rankLabel, onRankUpdate },
  ref,
) {
  const [images, setImages] = useState<WonseoImage[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);

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

  const methodValue =
    card.selection_mode === "single"
      ? card.stage_single
      : [card.stage_1 && `1단계 ${card.stage_1}`, card.stage_2 && `2단계 ${card.stage_2}`]
          .filter(Boolean)
          .join(" · ");

  return (
    <div
      ref={ref}
      style={{ ...(minHeight ? { minHeight } : undefined), ...style }}
      className={`bg-white rounded-3xl border-2 ${emphasis.border} shadow-sm overflow-hidden flex ${className ?? ""}`}
    >
      <div className={`w-2 shrink-0 ${emphasis.bar}`} />
      <div className="flex-1 p-5 space-y-3 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {dragHandle}
          <RankBadge card={card} label={rankLabel ?? "미지정"} onUpdate={onRankUpdate ?? (() => {})} />
          <span
            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${emphasis.badge}`}
          >
            {card.level}
          </span>
          {showStatus && (
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${STATUS_BADGE_STYLE[card.status]}`}
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

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-baseline gap-2 min-w-0">
            <h4
              className="text-lg font-bold text-slate-900 truncate shrink-0"
              style={{ maxWidth: "58%" }}
            >
              {card.university}
            </h4>
            <span className="text-lg font-bold text-slate-900 truncate min-w-0">
              {card.department}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 text-xs font-bold">
            <span className="border border-slate-300 text-slate-700 px-2 py-1 rounded-lg">
              {card.category}
            </span>
            {card.sub_category && (
              <span className="border border-slate-300 text-slate-700 px-2 py-1 rounded-lg">
                {card.sub_category}
              </span>
            )}
          </div>
        </div>
        <WonseoAttachmentPreview images={images} onClick={() => setLightboxOpen(true)} />
      </div>

      <div className="text-[13px] space-y-1 border-t border-slate-100 pt-3">
        {methodValue && <InfoRow label="전형방법" value={methodValue} />}
        {(card.calculated_grade || card.min_standard || card.enrollment != null) && (
          <div className="flex flex-wrap gap-x-4">
            {card.enrollment != null && (
              <InfoRow label="모집인원" value={`${card.enrollment}명`} />
            )}
            {card.calculated_grade && <InfoRow label="등급" value={card.calculated_grade} />}
            {card.min_standard && <InfoRow label="최저" value={card.min_standard} />}
          </div>
        )}
        {card.has_exam_date && card.exam_date_at && (
          <InfoRow
            label="일정"
            value={`${card.exam_memo ? `${card.exam_memo} ` : ""}${formatDateLabel(card.exam_date_at)}`}
          />
        )}
      </div>

      <RecentResultsSection years={card.recent_results ?? []} />

      {card.memo && (
        <p className="text-xs text-amber-900 bg-amber-100 rounded-xl p-3 whitespace-pre-wrap shadow-md shadow-amber-900/5 -rotate-1">
          {card.memo}
        </p>
      )}

      </div>
      <WonseoImageLightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={images}
      />
    </div>
  );
});
