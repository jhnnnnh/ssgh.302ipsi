"use client";

import { LogOut } from "lucide-react";

export function ProfileBar({
  studentId,
  name,
  onLogout,
}: {
  studentId: string;
  name: string;
  onLogout: () => void;
}) {
  return (
    <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-5 shadow-sm flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black tracking-tight text-white">
            {studentId} {name}
          </span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold px-2 py-0.5 rounded-full">
            접속중
          </span>
        </div>
      </div>
      <button
        onClick={onLogout}
        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>로그아웃</span>
      </button>
    </div>
  );
}
