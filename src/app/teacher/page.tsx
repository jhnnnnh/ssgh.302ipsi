"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarPlus,
  GraduationCap,
  KeyRound,
  ListChecks,
  LogOut,
  ShieldUser,
  UsersRound,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { AppearanceSettingsButtons } from "@/components/settings/AppearanceSettingsButtons";
import { Tabs } from "@/components/ui/Tabs";
import { SlotCreateTab } from "@/components/teacher/SlotCreateTab";
import { StatusTab } from "@/components/teacher/StatusTab";
import { WonseoManageTab } from "@/components/teacher/WonseoManageTab";
import { RosterTab } from "@/components/teacher/RosterTab";
import { ChangePasswordModal } from "@/components/teacher/ChangePasswordModal";

type TeacherTab = "create" | "status" | "wonseo" | "roster";

export default function TeacherPage() {
  const router = useRouter();
  const { session, profile, loading, signOut } = useAuth();
  const [tab, setTab] = useState<TeacherTab>("create");
  const [pwModalOpen, setPwModalOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!session || !profile) {
      router.replace("/");
      return;
    }
    if (profile.role !== "teacher") {
      router.replace("/student");
    }
  }, [loading, session, profile, router]);

  if (loading || !profile || profile.role !== "teacher") {
    return (
      <div className="max-w-5xl mx-auto w-full px-4 py-10 flex-1 flex items-center justify-center">
        <p className="text-sm text-slate-400">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-6 sm:py-10 flex-1 space-y-6">
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center">
            <ShieldUser className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>선생님 관리 모드</span>
            <span className="text-[10px] bg-indigo-500 text-white font-bold px-2 py-0.5 rounded-full">
              인증됨
            </span>
          </h2>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <AppearanceSettingsButtons className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition border border-slate-700" />
          <button
            onClick={() => setPwModalOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition border border-slate-700 flex items-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>비밀번호 변경</span>
          </button>
          <button
            onClick={async () => {
              await signOut();
              router.replace("/");
            }}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>나가기</span>
          </button>
        </div>
      </div>

      <Tabs
        items={[
          { key: "create", label: "슬롯 개설", icon: <CalendarPlus className="w-4 h-4" /> },
          { key: "status", label: "학생 신청 현황", icon: <ListChecks className="w-4 h-4" /> },
          { key: "wonseo", label: "수시 원서 관리", icon: <GraduationCap className="w-4 h-4" /> },
          { key: "roster", label: "학생 명단 관리", icon: <UsersRound className="w-4 h-4" /> },
        ]}
        active={tab}
        onChange={(k) => setTab(k as TeacherTab)}
      />

      {tab === "create" && <SlotCreateTab />}
      {tab === "status" && <StatusTab />}
      {tab === "wonseo" && <WonseoManageTab />}
      {tab === "roster" && <RosterTab />}

      <ChangePasswordModal open={pwModalOpen} onClose={() => setPwModalOpen(false)} />
    </div>
  );
}
