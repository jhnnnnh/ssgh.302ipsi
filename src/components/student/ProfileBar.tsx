"use client";

import { LogOut } from "lucide-react";
import { AppearanceSettingsButtons } from "@/components/settings/AppearanceSettingsButtons";

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
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-indigo-200 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-black tracking-tight text-slate-900">
          {studentId} {name}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <AppearanceSettingsButtons />
        <button
          onClick={onLogout}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-200"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>로그아웃</span>
        </button>
      </div>
    </div>
  );
}
