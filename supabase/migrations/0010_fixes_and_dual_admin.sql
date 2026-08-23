-- 여러 수정사항을 한 번에 반영:
-- 1) profiles 자기수정 정책의 무한 재귀 버그 수정 (테마/폰트 저장 실패 원인)
-- 2) 겸용 계정(담임 기본 + 관리자 모드 온오프) 지원
-- 3) 합격 상태 공개 토글을 전체관리자 전용으로 제한
-- Supabase Dashboard > SQL Editor 에서 전체를 실행하세요.

-- =========================================================
-- 1. 겸용 계정 컬럼
-- =========================================================

alter table public.profiles
  add column if not exists dual_admin boolean not null default false,
  add column if not exists admin_mode_enabled boolean not null default false;

-- =========================================================
-- 2. 본인 프로필을 RLS 재귀 없이 읽는 security definer 함수
--    (기존 self-update 정책이 profiles를 직접 서브쿼리로 다시 읽으면서
--     "profiles select" 정책을 재귀적으로 태워 무한 재귀 오류가 났다.)
-- =========================================================

create or replace function public.my_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid();
$$;

-- =========================================================
-- 3. is_admin(): 전체관리자이거나, 겸용 계정이 관리자 모드를 켠 경우
-- =========================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'teacher'
      and (
        teacher_role = 'admin'
        or (dual_admin = true and admin_mode_enabled = true)
      )
  );
$$;

-- =========================================================
-- 4. profiles 자기수정 정책 재작성 (재귀 버그 수정 + dual_admin은 고정,
--    admin_mode_enabled는 본인이 자유롭게 켜고 끌 수 있게 허용)
-- =========================================================

drop policy if exists "profiles self update theme" on public.profiles;
create policy "profiles self update theme" on public.profiles
  for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from public.my_profile())
    and student_id is not distinct from (select student_id from public.my_profile())
    and name is not distinct from (select name from public.my_profile())
    and teacher_role is not distinct from (select teacher_role from public.my_profile())
    and grade is not distinct from (select grade from public.my_profile())
    and class_no is not distinct from (select class_no from public.my_profile())
    and dual_admin is not distinct from (select dual_admin from public.my_profile())
  );

-- =========================================================
-- 5. 합격 상태 공개(app_settings) 쓰기는 전체관리자만
-- =========================================================

drop policy if exists "settings teacher write" on public.app_settings;
create policy "settings teacher write" on public.app_settings
  for all using (public.is_admin()) with check (public.is_admin());
