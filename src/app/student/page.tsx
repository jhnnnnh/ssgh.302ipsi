"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSignature, MessageCircle, School } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { ProfileBar } from "@/components/student/ProfileBar";
import { Tabs } from "@/components/ui/Tabs";
import { SlotBookingTab } from "@/components/student/SlotBookingTab";
import { WonseoTab } from "@/components/student/WonseoTab";

export default function StudentPage() {
  const router = useRouter();
  const { session, profile, loading, signOut } = useAuth();
  const [tab, setTab] = useState<"consulting" | "wonseo">("consulting");

  useEffect(() => {
    if (loading) return;
    if (!session || !profile) {
      router.replace("/");
      return;
    }
    if (profile.role !== "student" || !profile.student_id) {
      router.replace("/teacher");
    }
  }, [loading, session, profile, router]);

  if (loading || !profile || profile.role !== "student" || !profile.student_id) {
    return (
      <div className="max-w-4xl mx-auto w-full px-4 py-10 flex-1 flex items-center justify-center">
        <p className="text-sm text-slate-400">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-6 sm:py-10 flex-1 space-y-6">
      <header className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
          <School className="w-6 h-6" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          3학년 2반 입시
        </h1>
      </header>

      <ProfileBar
        studentId={profile.student_id}
        name={profile.name ?? ""}
        onLogout={async () => {
          await signOut();
          router.replace("/");
        }}
      />

      <Tabs
        items={[
          { key: "consulting", label: "상담 신청", icon: <MessageCircle className="w-4 h-4" /> },
          { key: "wonseo", label: "수시 원서", icon: <FileSignature className="w-4 h-4" /> },
        ]}
        active={tab}
        onChange={(k) => setTab(k as "consulting" | "wonseo")}
      />

      {tab === "consulting" ? (
        <SlotBookingTab studentId={profile.student_id} />
      ) : (
        <WonseoTab studentId={profile.student_id} />
      )}

      <footer className="mt-6 text-center text-xs text-slate-400 pb-6 border-t border-slate-200/60 pt-6">
        <p>© 3학년 2반 수시 상담 및 입시 관리 시스템</p>
      </footer>
    </div>
  );
}
