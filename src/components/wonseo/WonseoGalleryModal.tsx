"use client";

import { Images } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { WonseoImageThumb } from "@/components/wonseo/WonseoImageThumb";
import type { WonseoImage } from "@/lib/database.types";

export function WonseoGalleryModal({
  open,
  onClose,
  images,
}: {
  open: boolean;
  onClose: () => void;
  images: WonseoImage[];
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="첨부 이미지"
      icon={<Images className="w-4 h-4 text-indigo-600" />}
      maxWidth="max-w-lg"
      footer={
        <button
          onClick={onClose}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
        >
          닫기
        </button>
      }
    >
      <div className="flex flex-wrap gap-2">
        {images.map((img) => (
          <WonseoImageThumb key={img.id} path={img.storage_path} />
        ))}
      </div>
    </Modal>
  );
}
