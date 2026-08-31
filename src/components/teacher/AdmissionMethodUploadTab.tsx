"use client";

import { useEffect, useState } from "react";
import { FileSpreadsheet, ListChecks, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import {
  AdmissionMethodParseError,
  parseAdmissionMethodExcel,
  type ParsedAdmissionMethodRow,
} from "@/lib/admission-method-excel";
import type { AdmissionMethodCategory } from "@/lib/database.types";

const CHUNK_SIZE = 2000;
const CATEGORIES: { key: AdmissionMethodCategory; label: string }[] = [
  { key: "학생부교과전형", label: "학생부교과" },
  { key: "학생부종합전형", label: "학생부종합" },
  { key: "논술전형", label: "논술" },
];

function useMethodSummary() {
  const [counts, setCounts] = useState<Record<AdmissionMethodCategory, number> | null>(null);

  const reload = async () => {
    const supabase = createClient();
    const results = await Promise.all(
      CATEGORIES.map(({ key }) =>
        supabase.from("admission_methods").select("id", { count: "exact", head: true }).eq("category", key),
      ),
    );
    const next = {} as Record<AdmissionMethodCategory, number>;
    CATEGORIES.forEach(({ key }, i) => {
      next[key] = results[i].count ?? 0;
    });
    setCounts(next);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, []);

  return { counts, reload };
}

async function uploadRows(
  rows: ParsedAdmissionMethodRow[],
  onProgress: (done: number, total: number) => void,
): Promise<number> {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const res = await fetch("/api/admin/upload-admission-methods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: chunk, isFirst: i === 0 }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "업로드에 실패했습니다.");
    inserted += data.count as number;
    onProgress(Math.min(i + CHUNK_SIZE, rows.length), rows.length);
  }
  return inserted;
}

export function AdmissionMethodUploadTab() {
  const showToast = useToast();
  const confirm = useConfirm();
  const { counts, reload } = useMethodSummary();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : null;

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (total && total > 0) {
      const ok = await confirm({
        message: `이미 저장된 전형정보 ${total.toLocaleString()}건이 있습니다. 새 파일로 전부 교체하시겠습니까?`,
        confirmLabel: "교체하기",
        danger: true,
      });
      if (!ok) return;
    }

    setUploading(true);
    setProgress(null);
    try {
      const rows = await parseAdmissionMethodExcel(file);
      const inserted = await uploadRows(rows, (done, t) => setProgress({ done, total: t }));
      showToast(`${inserted.toLocaleString()}건 저장되었습니다.`, "success");
      await reload();
    } catch (err) {
      if (err instanceof AdmissionMethodParseError) {
        showToast(err.message, "error");
      } else {
        showToast(err instanceof Error ? err.message : "업로드에 실패했습니다.", "error");
      }
    } finally {
      setUploading(false);
      setProgress(null);
    }
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          <ListChecks className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">전형정보 업로드</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            학생부교과전형/학생부종합전형/논술전형 시트를 읽어 저장합니다. 새로 업로드하면 기존
            데이터는 전부 교체됩니다.
          </p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-600">
        {counts == null ? (
          "불러오는 중..."
        ) : total === 0 ? (
          "저장된 데이터 없음"
        ) : (
          <>
            현재 저장된 데이터:{" "}
            {CATEGORIES.map(({ key, label }, i) => (
              <span key={key}>
                {i > 0 && ", "}
                {label} <span className="font-bold text-slate-800">{counts[key].toLocaleString()}건</span>
              </span>
            ))}
          </>
        )}
      </div>

      <label
        className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-2xl py-8 cursor-pointer transition ${
          uploading
            ? "border-slate-200 bg-slate-50 cursor-not-allowed"
            : "border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/50"
        }`}
      >
        {uploading ? (
          <div className="text-center space-y-1">
            <p className="text-xs font-bold text-slate-500">
              업로드 중{progress ? ` (${progress.done.toLocaleString()} / ${progress.total.toLocaleString()})` : "..."}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-indigo-600">
            <Upload className="w-4 h-4" />
            <span className="text-xs font-bold">엑셀 파일(.xlsx)을 선택해 업로드</span>
          </div>
        )}
        <input
          type="file"
          accept=".xlsx"
          disabled={uploading}
          onChange={handleFileSelect}
          className="hidden"
        />
      </label>

      <div className="flex items-start gap-1.5 text-[11px] text-slate-400">
        <FileSpreadsheet className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>
          학생부교과전형/학생부종합전형/논술전형 3개 시트를 가진 파일만 읽습니다. (사용안내 시트가
          있으면 무시하고 넘어갑니다.)
        </span>
      </div>
    </div>
  );
}
