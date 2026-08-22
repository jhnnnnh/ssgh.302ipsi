"use client";

import { useState } from "react";
import { Palette, Type } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/providers/ToastProvider";
import { ThemeColorModal } from "@/components/settings/ThemeColorModal";
import { FontModal } from "@/components/settings/FontModal";

/** 테마 색상/폰트/글씨 크기 설정 진입점. 학생·교사 화면 양쪽에서 동일하게 사용한다. */
export function AppearanceSettingsButtons({
  className = "p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition border border-indigo-200",
}: {
  className?: string;
}) {
  const { session, profile, refreshProfile } = useAuth();
  const showToast = useToast();
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [fontModalOpen, setFontModalOpen] = useState(false);

  async function handleSaveThemeColor(hex: string | null) {
    if (!session) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ theme_color: hex })
      .eq("id", session.user.id);
    if (error) {
      showToast("테마 색상 저장에 실패했습니다.", "error");
      return;
    }
    await refreshProfile();
    showToast("테마 색상이 적용되었습니다.", "success");
  }

  async function handleSaveFont(fontKey: string | null, scaleKey: string | null) {
    if (!session) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ font_family: fontKey, font_scale: scaleKey })
      .eq("id", session.user.id);
    if (error) {
      showToast("폰트 저장에 실패했습니다.", "error");
      return;
    }
    await refreshProfile();
    showToast("폰트가 적용되었습니다.", "success");
  }

  return (
    <>
      <button onClick={() => setThemeModalOpen(true)} title="테마 색상 설정" className={className}>
        <Palette className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => setFontModalOpen(true)} title="폰트 설정" className={className}>
        <Type className="w-3.5 h-3.5" />
      </button>

      <ThemeColorModal
        open={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
        currentColor={profile?.theme_color ?? null}
        onSave={handleSaveThemeColor}
      />
      <FontModal
        open={fontModalOpen}
        onClose={() => setFontModalOpen(false)}
        currentFontKey={profile?.font_family ?? null}
        currentScaleKey={profile?.font_scale ?? null}
        onSave={handleSaveFont}
      />
    </>
  );
}
