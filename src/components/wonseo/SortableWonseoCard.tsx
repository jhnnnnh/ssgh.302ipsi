"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { WonseoCardView } from "@/components/wonseo/WonseoCardView";
import type { WonseoCard } from "@/lib/database.types";

export function SortableWonseoCard({
  id,
  card,
  showStatus,
  onEdit,
  onDelete,
  minHeight,
  setEqualHeightRef,
  isDragging,
}: {
  id: string;
  card: WonseoCard;
  showStatus: boolean;
  onEdit: () => void;
  onDelete: () => void;
  minHeight?: number;
  setEqualHeightRef: (el: HTMLElement | null) => void;
  isDragging: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  return (
    <WonseoCardView
      ref={(el) => {
        setNodeRef(el);
        setEqualHeightRef(el);
      }}
      card={card}
      showStatus={showStatus}
      onEdit={onEdit}
      onDelete={onDelete}
      minHeight={minHeight}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={isDragging ? "opacity-30" : undefined}
      dragHandle={
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="text-slate-300 hover:text-indigo-500 cursor-grab active:cursor-grabbing touch-none p-0.5 -ml-1"
          aria-label="카드 순서 변경"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      }
    />
  );
}
