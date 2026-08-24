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
          title="로그아웃"
          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-xl transition border border-slate-200"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
