-- =========================================================
-- 입시 일정 캘린더: 4가지 유형을 한 테이블에서 관리한다.
--   wonseo_linked : 원서 카드 면접/고사 일정을 "불러오기"로 생성. title/date는
--                    저장하지 않고 항상 wonseo_cards를 조인해 읽는다(항상 최신 보장).
--   personal      : 학생 본인만 보임(담임/관리자도 못 봄).
--   class         : 담임 반 학생 전체 + 담임 + 관리자에게 보임. 등록/수정/삭제는 담임·관리자만.
--   grade         : 전체 학생·교사에게 보임. 등록/수정/삭제는 전체관리자만.
-- =========================================================

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('wonseo_linked', 'personal', 'class', 'grade')),
  title text,
  date date,
  color text not null,
  student_id text references public.roster(student_id) on delete cascade,
  grade smallint,
  class_no smallint,
  wonseo_card_id uuid references public.wonseo_cards(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_shape check (
    (
      type = 'wonseo_linked'
      and wonseo_card_id is not null
      and student_id is not null
      and title is null
      and date is null
    )
    or (
      type = 'personal'
      and student_id is not null
      and wonseo_card_id is null
      and title is not null
      and date is not null
    )
    or (
      type = 'class'
      and grade is not null
      and class_no is not null
      and student_id is null
      and wonseo_card_id is null
      and title is not null
      and date is not null
    )
    or (
      type = 'grade'
      and grade is null
      and class_no is null
      and student_id is null
      and wonseo_card_id is null
      and title is not null
      and date is not null
    )
  )
);

-- 같은 원서 카드를 두 번 "불러오기"해도 중복 생성되지 않도록 막는다.
create unique index calendar_events_wonseo_card_id_key
  on public.calendar_events (wonseo_card_id)
  where wonseo_card_id is not null;

create index calendar_events_student_id_idx on public.calendar_events (student_id) where student_id is not null;
create index calendar_events_class_idx on public.calendar_events (grade, class_no) where grade is not null;
create index calendar_events_date_idx on public.calendar_events (date) where date is not null;

alter table public.calendar_events enable row level security;

-- 조회 범위(학생은 class/grade 유형을 볼 수는 있지만 관리는 못 함)
create or replace function public.calendar_events_can_view(
  p_type text, p_student_id text, p_grade smallint, p_class_no smallint
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
      p_student_id = public.current_student_id()
    when 'class' then
      public.is_admin()
      or public.is_homeroom_for(p_grade, p_class_no)
      or (public.current_student_grade() = p_grade and public.current_student_class_no() = p_class_no)
    when 'grade' then
      true
    else false
  end;
$$;

-- 등록/수정/삭제 범위(학생은 class/grade 유형을 관리할 수 없음)
create or replace function public.calendar_events_can_manage(
  p_type text, p_student_id text, p_grade smallint, p_class_no smallint
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
      p_student_id = public.current_student_id()
    when 'class' then
      public.is_admin() or public.is_homeroom_for(p_grade, p_class_no)
    when 'grade' then
      public.is_admin()
    else false
  end;
$$;

create policy "calendar_events select" on public.calendar_events
  for select using (public.calendar_events_can_view(type, student_id, grade, class_no));

create policy "calendar_events insert" on public.calendar_events
  for insert with check (public.calendar_events_can_manage(type, student_id, grade, class_no));

create policy "calendar_events update" on public.calendar_events
  for update
  using (public.calendar_events_can_manage(type, student_id, grade, class_no))
  with check (public.calendar_events_can_manage(type, student_id, grade, class_no));

create policy "calendar_events delete" on public.calendar_events
  for delete using (public.calendar_events_can_manage(type, student_id, grade, class_no));

alter publication supabase_realtime add table public.calendar_events;
