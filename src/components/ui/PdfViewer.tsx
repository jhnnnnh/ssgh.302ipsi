"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 브라우저의 내장 PDF 뷰어(설정에 따라 항상 다운로드되거나 iframe 안에서 렌더링에
 * 실패하는 경우가 있다)에 기대지 않고, pdf.js로 각 페이지를 캔버스에 직접 그린다.
 * 어떤 브라우저·설정에서도 동일하게 보이도록 하기 위함이다.
 */
export function PdfViewer({ src, className }: { src: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;

    (async () => {
      setStatus("loading");
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const pdf = await pdfjsLib.getDocument({ url: src }).promise;
        if (cancelled || !container) return;
        container.innerHTML = "";

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          if (cancelled) return;
          const scale = ((container.clientWidth || 800) / page.getViewport({ scale: 1 }).width) * 1.5;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.className = "rounded-lg border border-slate-200 shadow-sm mb-3";
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          if (cancelled) return;
          container.appendChild(canvas);
        }
        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <div className={className}>
      {status === "loading" && (
        <p className="text-xs text-slate-400 text-center py-10">매뉴얼을 불러오는 중...</p>
      )}
      {status === "error" && (
        <p className="text-xs text-rose-500 text-center py-10">
          매뉴얼을 불러오지 못했습니다. 아래 버튼으로 새 탭에서 열거나 다운로드해 주세요.
        </p>
      )}
      <div ref={containerRef} />
    </div>
  );
}
