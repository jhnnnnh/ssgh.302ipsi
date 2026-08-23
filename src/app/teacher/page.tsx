"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  KeyRound,
  ListChecks,
  LogOut,
  ShieldUser,
  UsersRound,
  UserCog,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { ActiveClassProvider, useActiveClass } from "@/components/providers/ActiveClassProvider";
import { AppearanceSettingsButtons } from "@/components/settings/AppearanceSettingsButtons";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { Tabs } from "@/components/ui/Tabs";
import { StatusTab } from "@/components/teacher/StatusTab";
import { WonseoManageTab } from "@/components/teacher/WonseoManageTab";
import { RosterTab } from "@/components/teacher/RosterTab";
import { TeacherManageTab } from "@/components/teacher/TeacherManageTab";
import { ChangePasswordModal } from "@/components/teacher/ChangePasswordModal";
import { formatClassLabel } from "@/lib/student-id";

type TeacherTab = "status" | "wonseo" | "roster" | "teachers";

export default function TeacherPage() {
  const router = useRouter();
  const { session, profile, loading } = useAuth();

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
    <ActiveClassProvider>
      <TeacherDashboard />
    </ActiveClassProvider>
  );
}

function TeacherDashboard() {
  const router = useRouter();
  const { profile, refreshProfile, signOut } = useAuth();
  const { grade, classNo, isAdmin, classOptions, setActiveClass, loading } = useActiveClass();
  const [tab, setTab] = useState<TeacherTab>("status");
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [togglingAdmin, setTogglingAdmin] = useState(false);
  const showToast = useToast();

  const tabs = [
    { key: "status", label: "상담 신청 현황", icon: <ListChecks className="w-4 h-4" /> },
    { key: "wonseo", label: "수시 원서 관리", icon: <GraduationCap className="w-4 h-4" /> },
    { key: "roster", label: "학생 명단 관리", icon: <UsersRound className="w-4 h-4" /> },
    ...(isAdmin
      ? [{ key: "teachers", label: "교사 계정 관리", icon: <UserCog className="w-4 h-4" /> }]
      : []),
  ];

  async function handleToggleAdminMode() {
    if (!profile) return;
    setTogglingAdmin(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ admin_mode_enabled: !profile.admin_mode_enabled })
      .eq("id", profile.id);
    setTogglingAdmin(false);
    if (error) {
      showToast("관리자 모드 전환에 실패했습니다.", "error");
      return;
    }
    await refreshProfile();
  }

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-6 sm:py-10 flex-1 space-y-6">
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center">
            <ShieldUser className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>{profile?.name} 선생님</span>
              <span className="text-[10px] bg-indigo-500 text-white font-bold px-2 py-0.5 rounded-full">
                {isAdmin ? "전체관리자" : "담임교사"}
              </span>
            </h2>
            {!isAdmin && grade != null && classNo != null && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                {formatClassLabel(grade, classNo)} 담임
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {profile?.dual_admin && (
            <button
              onClick={handleToggleAdminMode}
              disabled={togglingAdmin}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 disabled:opacity-60 ${
                profile.admin_mode_enabled
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
              }`}
            >
              <ShieldUser className="w-3.5 h-3.5" />
              <span>관리자 모드 {profile.admin_mode_enabled ? "켜짐" : "꺼짐"}</span>
            </button>
          )}
          {isAdmin && (
            <select
              value={grade != null && classNo != null ? `${grade}-${classNo}` : ""}
              onChange={(e) => {
                const [g, c] = e.target.value.split("-").map(Number);
                setActiveClass(g, c);
              }}
              className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {classOptions.length === 0 && <option value="">등록된 반 없음</option>}
              {classOptions.map((c) => (
                <option key={`${c.grade}-${c.classNo}`} value={`${c.grade}-${c.classNo}`}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
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

      <Tabs items={tabs} active={tab} onChange={(k) => setTab(k as TeacherTab)} />

      {!loading && grade == null && classNo == null && tab !== "teachers" ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 space-y-2">
          <p className="text-sm font-bold text-slate-600">
            {isAdmin ? "아직 등록된 반이 없습니다." : "담당 반 정보를 확인할 수 없습니다."}
          </p>
          {isAdmin && (
            <p className="text-xs text-slate-400">
              &ldquo;교사 계정 관리&rdquo;에서 담임교사를 먼저 등록하거나, 학생 명단이 있는 반을 만들어 주세요.
            </p>
          )}
        </div>
      ) : (
        <>
          {tab === "status" && <StatusTab />}
          {tab === "wonseo" && <WonseoManageTab />}
          {tab === "roster" && <RosterTab />}
        </>
      )}
      {tab === "teachers" && isAdmin && <TeacherManageTab />}

      <ChangePasswordModal open={pwModalOpen} onClose={() => setPwModalOpen(false)} />
    </div>
  );
}
