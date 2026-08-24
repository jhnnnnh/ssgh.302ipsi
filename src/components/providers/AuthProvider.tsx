"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/database.types";
import { buildThemeColorVars } from "@/lib/theme-color";
import {
  DEFAULT_FONT_KEY,
  getFontFamilyByKey,
  getFontSizeAdjustByKey,
} from "@/lib/font-options";

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    setProfile(data ?? null);
  };

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshProfile = async () => {
    if (session) await loadProfile(session.user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  // 폰트마다 같은 font-size에서도 실제 보이는 크기가 달라서, rem의 기준인 <html> 루트
  // font-size에 선택한 폰트 고유의 보정 배율(sizeAdjust)을 곱해 "보이는 크기"를 통일한다.
  // (색상/폰트 종류처럼 하위 트리에 CSS 변수를 얹는 방식으로는 rem에 닿지 않아 예외적으로
  // document.documentElement에 직접 적용한다.)
  useEffect(() => {
    const fontAdjust = profile ? getFontSizeAdjustByKey(profile.font_family) : 1;
    document.documentElement.style.setProperty("--font-scale", String(fontAdjust));
  }, [profile]);

  const themeVars = profile?.theme_color ? buildThemeColorVars(profile.theme_color) : null;

  const isCustomFont = profile?.font_family && profile.font_family !== DEFAULT_FONT_KEY;
  const fontVars = isCustomFont
    ? {
        "--font-sans": getFontFamilyByKey(profile!.font_family),
        fontFamily: getFontFamilyByKey(profile!.font_family),
      }
    : null;

  return (
    <AuthContext.Provider value={{ session, profile, loading, refreshProfile, signOut }}>
      {/* display:contents는 레이아웃에 영향을 주지 않으면서 CSS 변수(+폰트)만 자식들에 전파한다. */}
      <div style={{ display: "contents", ...themeVars, ...fontVars }}>{children}</div>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
