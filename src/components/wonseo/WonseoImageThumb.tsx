"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getSignedUrl } from "@/lib/wonseo-storage";
import { useImageViewer } from "@/components/providers/ImageViewerProvider";

export function WonseoImageThumb({
  path,
  onRemove,
}: {
  path: string;
  onRemove?: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const openViewer = useImageViewer();

  useEffect(() => {
    let active = true;
    getSignedUrl(path).then((u) => active && setUrl(u));
    return () => {
      active = false;
    };
  }, [path]);

  return (
    <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="첨부 이미지"
          className="w-full h-full object-cover cursor-pointer"
          onClick={() => openViewer(url)}
        />
      ) : (
        <div className="w-full h-full animate-pulse bg-slate-200" />
      )}
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-0.5 right-0.5 bg-slate-900/70 text-white rounded-full w-4 h-4 flex items-center justify-center"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}
