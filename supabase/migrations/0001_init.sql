-- 3학년 2반 입시 — 초기 스키마, RLS, RPC 함수
-- Supabase Dashboard > SQL Editor 에서 전체를 실행하세요.

create extension if not exists "pgcrypto";

-- =========================================================
-- 1. 테이블
-- =========================================================

create table if not exists public.roster (
  student_id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('student', 'teacher')),
  student_id text unique references public.roster (student_id) on delete cascade,
  name text,
  created_at timestamptz not null default now()
);

create table if not exists public.counseling_slots (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time time not null,
  end_time time not null,
  is_booked boolean not null default false,
  student_id text,
  student_name text,
  booked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists counseling_slots_date_idx on public.counseling_slots (date);

create table if not exists public.slot_favorites (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('weekday', 'weekend')),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now()
);

create table if not exists public.wonseo_cards (
  id uuid primary key default gen_random_uuid(),
  student_id text not null references public.roster (student_id) on delete cascade,
  rank text,
  level text not null default '적정' check (level in ('상향', '소신', '적정', '하향')),
  status text not null default '지원예정'
    check (status in ('지원예정', '원서접수', '1차합격', '최종합격', '예비번호', '불합격')),
  university text,
  department text,
  category text not null default '학생부종합'
    check (category in ('학생부종합', '학생부교과', '논술', '실기/실적', '기타')),
  sub_category text,
  selection_mode text not null default 'single' check (selection_mode in ('single', 'multi')),
  stage_single text,
  stage_1 text,
  stage_2 text,
  calculated_grade text,
  min_standard text,
  has_exam_date boolean not null default false,
  exam_date text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists wonseo_cards_student_id_idx on public.wonseo_cards (student_id);

create table if not exists public.wonseo_images (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.wonseo_cards (id) on delete cascade,
  student_id text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null
);
insert into public.app_settings (key, value)
values ('status_reveal', '{"enabled": false}'::jsonb)
on conflict (key) do nothing;

-- =========================================================
-- 2. 헬퍼 함수 (RLS 재귀 방지를 위해 security definer)
-- =========================================================

create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'teacher'
  );
$$;

create or replace function public.current_student_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select student_id from public.profiles where id = auth.uid();
$$;

-- =========================================================
-- 3. RLS 활성화 + 정책
-- =========================================================

alter table public.roster enable row level security;
alter table public.profiles enable row level security;
alter table public.counseling_slots enable row level security;
alter table public.slot_favorites enable row level security;
alter table public.wonseo_cards enable row level security;
alter table public.wonseo_images enable row level security;
alter table public.app_settings enable row level security;

-- roster: 교사만 읽기/쓰기
drop policy if exists "roster teacher all" on public.roster;
create policy "roster teacher all" on public.roster
  for all using (public.is_teacher()) with check (public.is_teacher());

-- profiles: 본인 또는 교사만 조회, 쓰기는 서비스 롤 전용 (정책 없음 = 거부)
drop policy if exists "profiles self or teacher select" on public.profiles;
create policy "profiles self or teacher select" on public.profiles
  for select using (id = auth.uid() or public.is_teacher());

-- counseling_slots: 인증된 사용자는 전체 조회, 생성/수정/삭제는 교사만
drop policy if exists "slots select authenticated" on public.counseling_slots;
create policy "slots select authenticated" on public.counseling_slots
  for select using (auth.role() = 'authenticated');

drop policy if exists "slots teacher write" on public.counseling_slots;
create policy "slots teacher write" on public.counseling_slots
  for all using (public.is_teacher()) with check (public.is_teacher());

-- slot_favorites: 교사 전용
drop policy if exists "favorites teacher all" on public.slot_favorites;
create policy "favorites teacher all" on public.slot_favorites
  for all using (public.is_teacher()) with check (public.is_teacher());

-- wonseo_cards: 교사는 전체, 학생은 본인 것만
drop policy if exists "wonseo select" on public.wonseo_cards;
create policy "wonseo select" on public.wonseo_cards
  for select using (public.is_teacher() or student_id = public.current_student_id());

drop policy if exists "wonseo insert" on public.wonseo_cards;
create policy "wonseo insert" on public.wonseo_cards
  for insert with check (public.is_teacher() or student_id = public.current_student_id());

drop policy if exists "wonseo update" on public.wonseo_cards;
create policy "wonseo update" on public.wonseo_cards
  for update using (public.is_teacher() or student_id = public.current_student_id())
  with check (public.is_teacher() or student_id = public.current_student_id());

drop policy if exists "wonseo delete" on public.wonseo_cards;
create policy "wonseo delete" on public.wonseo_cards
  for delete using (public.is_teacher() or student_id = public.current_student_id());

-- wonseo_images: wonseo_cards와 동일한 규칙 (student_id 비정규화 컬럼 사용)
drop policy if exists "wonseo images select" on public.wonseo_images;
create policy "wonseo images select" on public.wonseo_images
  for select using (public.is_teacher() or student_id = public.current_student_id());

drop policy if exists "wonseo images insert" on public.wonseo_images;
create policy "wonseo images insert" on public.wonseo_images
  for insert with check (public.is_teacher() or student_id = public.current_student_id());

drop policy if exists "wonseo images delete" on public.wonseo_images;
create policy "wonseo images delete" on public.wonseo_images
  for delete using (public.is_teacher() or student_id = public.current_student_id());

-- app_settings: 인증된 모두 읽기, 교사만 쓰기
drop policy if exists "settings select authenticated" on public.app_settings;
create policy "settings select authenticated" on public.app_settings
  for select using (auth.role() = 'authenticated');

drop policy if exists "settings teacher write" on public.app_settings;
create policy "settings teacher write" on public.app_settings
  for all using (public.is_teacher()) with check (public.is_teacher());

-- =========================================================
-- 4. 예약 RPC (동시성 안전)
-- =========================================================

create or replace function public.book_slot(p_slot_id uuid)
returns public.counseling_slots
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id text;
  v_student_name text;
  v_slot public.counseling_slots;
begin
  select student_id, name into v_student_id, v_student_name
  from public.profiles where id = auth.uid();

  if v_student_id is null then
    raise exception '학생 계정만 예약할 수 있습니다.';
  end if;

  select * into v_slot from public.counseling_slots
  where id = p_slot_id
  for update;

  if not found then
    raise exception '존재하지 않는 슬롯입니다.';
  end if;

  if v_slot.is_booked then
    raise exception '이미 다른 학생이 신청한 슬롯입니다.';
  end if;

  if exists (
    select 1 from public.counseling_slots
    where date = v_slot.date and student_id = v_student_id and is_booked = true
  ) then
    raise exception '해당 날짜에는 이미 신청한 상담이 있습니다. (하루 최대 1개)';
  end if;

  update public.counseling_slots
  set is_booked = true,
      student_id = v_student_id,
      student_name = v_student_name,
      booked_at = now()
  where id = p_slot_id
  returning * into v_slot;

  return v_slot;
end;
$$;

create or replace function public.cancel_slot(p_slot_id uuid)
returns public.counseling_slots
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id text;
  v_slot public.counseling_slots;
begin
  select student_id into v_student_id from public.profiles where id = auth.uid();

  select * into v_slot from public.counseling_slots
  where id = p_slot_id
  for update;

  if not found then
    raise exception '존재하지 않는 슬롯입니다.';
  end if;

  if not v_slot.is_booked then
    raise exception '예약되지 않은 슬롯입니다.';
  end if;

  if not public.is_teacher() and v_slot.student_id is distinct from v_student_id then
    raise exception '본인의 예약만 취소할 수 있습니다.';
  end if;

  update public.counseling_slots
  set is_booked = false,
      student_id = null,
      student_name = null,
      booked_at = null
  where id = p_slot_id
  returning * into v_slot;

  return v_slot;
end;
$$;

grant execute on function public.book_slot(uuid) to authenticated;
grant execute on function public.cancel_slot(uuid) to authenticated;

-- =========================================================
-- 5. Realtime 발행 (Supabase 기본 supabase_realtime publication에 추가)
-- =========================================================
alter publication supabase_realtime add table public.counseling_slots;
alter publication supabase_realtime add table public.wonseo_cards;

-- =========================================================
-- 6. Storage 버킷 (원서 첨부 이미지) — 비공개 버킷
-- =========================================================
insert into storage.buckets (id, name, public)
values ('wonseo-attachments', 'wonseo-attachments', false)
on conflict (id) do nothing;

-- 경로 규칙: {student_id}/{card_id}/{filename}
drop policy if exists "wonseo attachments select" on storage.objects;
create policy "wonseo attachments select" on storage.objects
  for select using (
    bucket_id = 'wonseo-attachments'
    and (public.is_teacher() or (storage.foldername(name))[1] = public.current_student_id())
  );

drop policy if exists "wonseo attachments insert" on storage.objects;
create policy "wonseo attachments insert" on storage.objects
  for insert with check (
    bucket_id = 'wonseo-attachments'
    and (public.is_teacher() or (storage.foldername(name))[1] = public.current_student_id())
  );

drop policy if exists "wonseo attachments delete" on storage.objects;
create policy "wonseo attachments delete" on storage.objects
  for delete using (
    bucket_id = 'wonseo-attachments'
    and (public.is_teacher() or (storage.foldername(name))[1] = public.current_student_id())
  );
