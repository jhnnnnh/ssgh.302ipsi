-- 담임을 겸하는 관리자(dual_admin)가 관리자 모드를 켜도 다른 반의 학생/원서/상담/캘린더 데이터를
-- 볼 수 없게 한다. is_admin()은 이제 "다른 반 데이터 열람" 기준으로는 순수 전체관리자(teacher_role='admin')
-- 계정만 인정하고, dual_admin의 관리자 모드는 새 has_admin_capabilities()로 옮겨서
-- (교사 계정 관리 / 학년 공통 캘린더 등록 / 전역 설정처럼) 반 스코프와 무관한 기능에만 계속 쓰게 한다.

create or replace function public.has_admin_capabilities()
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
      and teacher_role = 'admin'
  );
$$;

-- calendar_events: 학년 공통(grade) 일정 등록은 여전히 dual_admin의 관리자 모드에서도 가능해야 한다.
create or replace function public.calendar_events_can_manage(
  p_type text, p_student_id text, p_grade smallint, p_class_no smallint, p_created_by uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case p_type
    when 'wonseo_linked' then
      public.is_admin()
      or (p_grade is not null and p_class_no is not null and public.is_homeroom_for(p_grade, p_class_no))
      or p_student_id = public.current_student_id()
    when 'personal' then
      p_created_by = auth.uid()
    when 'class' then
      public.is_admin() or public.is_homeroom_for(p_grade, p_class_no)
    when 'grade' then
      public.has_admin_capabilities()
    else false
  end;
$$;

-- app_settings(합격 상태 공개 등 학교 전체 설정)는 반 스코프가 없는 전역 설정이라 그대로 유지.
drop policy "settings teacher write" on public.app_settings;
create policy "settings teacher write" on public.app_settings
  for all using (public.has_admin_capabilities()) with check (public.has_admin_capabilities());

-- profiles: 교사 계정 목록(교사 계정 관리 화면)은 dual_admin도 계속 볼 수 있어야 하지만,
-- 학생 프로필은 순수 전체관리자만 반 제한 없이 볼 수 있게 좁힌다.
drop policy "profiles select" on public.profiles;
create policy "profiles select" on public.profiles
  for select using (
    id = auth.uid()
    or (role = 'teacher' and public.has_admin_capabilities())
    or (
      role = 'student'
      and (
        public.is_admin()
        or exists (
          select 1 from public.roster r
          where r.student_id = profiles.student_id
            and public.is_homeroom_for(r.grade, r.class_no)
        )
      )
    )
  );
