"use client";

import { useState } from "react";
import { KeyRound, Trash2, UserPlus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useRoster } from "@/lib/hooks/useRoster";
import { useActiveClass } from "@/components/providers/ActiveClassProvider";
import { parseStudentId, formatClassLabel } from "@/lib/student-id";

export function RosterTab() {
  const showToast = useToast();
  const confirm = useConfirm();
  const { roster, passwordSetIds, reload } = useRoster();
  const { grade, classNo, isAdmin } = useActiveClass();
  const [pasteText, setPasteText] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleAddRoster() {
    const lines = pasteText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const rows = lines
      .map((line) => {
        const parts = line.split(/\s+/);
        if (parts.length < 2) return null;
        const studentId = parts[0].trim();
        const name = parts.slice(1).join(" ").trim();
        if (!studentId || !name) return null;
        return { student_id: studentId, name };
      })
      .filter((r): r is { student_id: string; name: string } => r !== null);

    if (rows.length === 0) {
      showToast("'학번 이름' 형식으로 한 줄에 한 명씩 입력해 주세요.", "error");
      return;
    }

    const malformed = rows.filter((r) => !parseStudentId(r.student_id));
    if (malformed.length > 0) {
      showToast(
        `학번 형식이 올바르지 않습니다: ${malformed.map((r) => r.student_id).join(", ")}`,
        "error",
      );
      return;
    }

    if (!isAdmin) {
      if (grade == null || classNo == null) {
        showToast("담당 반 정보를 확인할 수 없습니다.", "error");
        return;
      }
      const mismatched = rows.filter((r) => {
        const parsed = parseStudentId(r.student_id)!;
        return parsed.grade !== grade || parsed.classNo !== classNo;
      });
      if (mismatched.length > 0) {
        showToast(
          `본인 담당 반(${formatClassLabel(grade, classNo)}) 학번만 등록할 수 있습니다. (${mismatched
            .map((r) => r.student_id)
            .join(", ")})`,
          "error",
        );
        return;
      }
    }

    const supabase = createClient();
    const { error } = await supabase.from("roster").insert(rows);
    if (error) {
      const message = error.code === "23505" ? "이미 등록된 학번이 포함되어 있습니다." : "명단 등록에 실패했습니다.";
      showToast(message, "error");
      return;
    }
    showToast(`${rows.length}명이 등록되었습니다.`, "success");
    setPasteText("");
    reload();
  }

  async function handleResetPassword(studentId: string) {
    const ok = await confirm({
      message: `${studentId} 학생의 비밀번호를 초기화하시겠습니까? (다음 로그인 시 새 비밀번호가 설정됩니다)`,
      confirmLabel: "초기화",
      danger: true,
    });
    if (!ok) return;
    setBusyId(studentId);
    const res = await fetch("/api/teacher/reset-student-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId }),
    });
    setBusyId(null);
    if (!res.ok) {
      showToast("초기화에 실패했습니다.", "error");
      return;
    }
    showToast("비밀번호가 초기화되었습니다.", "success");
    reload();
  }

  async function handleRemoveStudent(studentId: string) {
    const ok = await confirm({
      message: `${studentId} 학생을 명단에서 삭제하시겠습니까? 계정과 데이터 접근 권한이 함께 제거됩니다.`,
      confirmLabel: "삭제",
      danger: true,
    });
    if (!ok) return;
    setBusyId(studentId);
    const res = await fetch("/api/teacher/remove-student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId }),
    });
    setBusyId(null);
    if (!res.ok) {
      showToast("삭제에 실패했습니다.", "error");
      return;
    }
    showToast("명단에서 삭제되었습니다.", "success");
    reload();
  }

  async function handleClearRoster() {
    if (grade == null || classNo == null) {
      showToast("반 정보를 확인할 수 없습니다.", "error");
      return;
    }
    const classLabel = formatClassLabel(grade, classNo);
    const first = await confirm({
      title: "명단 비우기",
      message: `${classLabel}에 등록된 모든 학생 명단과 계정이 삭제됩니다. 계속하시겠습니까?`,
      confirmLabel: "계속",
      danger: true,
    });
    if (!first) return;
    const second = await confirm({
      title: "최종 확인",
      message: `정말로 되돌릴 수 없습니다. ${classLabel} 명단을 비우시겠습니까?`,
      confirmLabel: "전체 삭제",
      danger: true,
    });
    if (!second) return;

    const res = await fetch("/api/teacher/clear-roster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grade, classNo }),
    });
    if (!res.ok) {
      showToast("초기화에 실패했습니다.", "error");
      return;
    }
    showToast("명단이 모두 삭제되었습니다.", "success");
    reload();
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-500" />
            <span>학생 명단 등록</span>
          </h3>
          <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full">
            총 {roster.length}명 등록됨
          </span>
        </div>

        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          rows={4}
          placeholder={"학번 이름\n학번 이름\n학번 이름"}
          className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
        />

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <p className="text-[11px] text-slate-400">
            * 명단에 등록된 학생만 학생 모드 로그인이 허용되며 최초 로그인 시 비밀번호가
            지정됩니다.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearRoster}
              className="px-3 py-2 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-bold transition"
            >
              명단 비우기
            </button>
            <button
              onClick={handleAddRoster}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>명단 추가</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="font-bold text-slate-800 text-sm">
            현재 등록된 학생 명단 및 비밀번호 상태
          </h4>
          <span className="text-xs text-slate-400">총 {roster.length}명</span>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 sticky top-0">
              <tr>
                <th className="px-4 py-2.5">번호</th>
                <th className="px-4 py-2.5">학번</th>
                <th className="px-4 py-2.5">이름</th>
                <th className="px-4 py-2.5">비밀번호</th>
                <th className="px-4 py-2.5 text-left">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roster.map((r, idx) => (
                <tr key={r.student_id}>
                  <td className="px-4 py-2.5">{idx + 1}</td>
                  <td className="px-4 py-2.5 font-bold">{r.student_id}</td>
                  <td className="px-4 py-2.5">{r.name}</td>
                  <td className="px-4 py-2.5">
                    {passwordSetIds.has(r.student_id) ? (
                      <span className="text-emerald-600 font-bold">설정됨</span>
                    ) : (
                      <span className="text-slate-400 font-bold">미설정</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResetPassword(r.student_id)}
                        disabled={busyId === r.student_id}
                        className="text-slate-400 hover:text-indigo-600 disabled:opacity-40"
                        title="비밀번호 초기화"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveStudent(r.student_id)}
                        disabled={busyId === r.student_id}
                        className="text-slate-400 hover:text-rose-500 disabled:opacity-40"
                        title="명단에서 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {roster.length === 0 && (
          <div className="text-center py-8">
            <p className="text-xs font-semibold text-slate-500">등록된 학생 명단이 없습니다.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              상단 상자에 명단을 붙여넣어 등록해 주세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
