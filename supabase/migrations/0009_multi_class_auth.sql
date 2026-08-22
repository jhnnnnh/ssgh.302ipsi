-- 다중 반(여러 담임 + 전체관리자) 로그인/권한 구조로 전환
-- Supabase Dashboard > SQL Editor 에서 전체를 실행하세요.
-- 학번 5자리 규칙: 1자리 학년 / 2번째 자리는 항상 0(무시) / 3번째 자리 반 / 4~5번째 자리 번호

-- =========================================================
-- 1. profiles: 교사 역할/담당 반 컬럼
-- =========================================================

alter table public.profiles
  add column if not exists teacher_role text check (teacher_role in ('homeroom', 'admin')),
  add column if not exists grade smallint,
  add column if not exists class_no smallint;

-- 기존 공용 교사 계정 등 teacher_role이 아직 없는 교사 행을 임시로 admin으로 채운다.
-- (이 행은 setup-multi-class-auth 스크립트가 곧 삭제하므로 값 자체는 중요하지 않고,
--  아래 체크 제약을 통과시키기 위한 백필일 뿐이다.)
update public.profiles set teacher_role = 'admin' where role = 'teacher' and teacher_role is null;

alter table public.profiles drop constraint if exists profiles_teacher_role_check2;
alter table public.profiles add constraint profiles_teacher_role_check2 check (
  (role = 'teacher' and teacher_role is not null)
  or (role = 'student' and teacher_role is null and grade is null and class_no is null)
);

alter table public.profiles drop constraint if exists profiles_homeroom_class_check;
alter table public.profiles add constraint profiles_homeroom_class_check check (
  (teacher_role = 'homeroom' and grade is not null and class_no is not null)
  or (teacher_role = 'admin' and grade is null and class_no is null)
  or teacher_role is null
);

-- 교사 이름 중복 방지 (동명이인 없다는 전제)
drop index if exists profiles_teacher_name_unique;
create unique index profiles_teacher_name_unique on public.profiles (name)
  where role = 'teacher';

-- =========================================================
-- 2. roster: 학번에서 학년/반을 뽑아내는 생성 컬럼
-- =========================================================

alter table public.roster drop constraint if exists roster_student_id_format;
alter table public.roster add constraint roster_student_id_format check (student_id ~ '^[0-9]{5}$');

alter table public.roster
  add column if not exists grade smallint generated always as (substring(student_id from 1 for 1)::smallint) stored,
  add column if not exists class_no smallint generated always as (substring(student_id from 3 for 1)::smallint) stored;

-- =========================================================
-- 3. counseling_slots / slot_favorites: 반 컬럼 추가 + 기존 데이터 백필
-- =========================================================

alter table public.counseling_slots add column if not exists grade smallint;
alter table public.counseling_slots add column if not exists class_no smallint;
update public.counseling_slots set grade = 3, class_no = 2 where grade is null;
alter table public.counseling_slots alter column grade set not null;
alter table public.counseling_slots alter column class_no set not null;

alter table public.slot_favorites add column if not exists grade smallint;
alter table public.slot_favorites add column if not exists class_no smallint;
update public.slot_favorites set grade = 3, class_no = 2 where grade is null;
alter table public.slot_favorites alter column grade set not null;
alter table public.slot_favorites alter column class_no set not null;

-- =========================================================
-- 4. 헬퍼 함수
-- =========================================================

create or replace function public.current_teacher_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select teacher_role from public.profiles where id = auth.uid() and role = 'teacher';
$$;

create or replace function public.current_teacher_grade()
returns smallint
language sql
stable
security definer
set search_path = public
as $$
  select grade from public.profiles where id = auth.uid() and role = 'teacher';
$$;

create or replace function public.current_teacher_class_no()
returns smallint
language sql
stable
security definer
set search_path = public
as $$
  select class_no from public.profiles where id = auth.uid() and role = 'teacher';
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
    where id = auth.uid() and role = 'teacher' and teacher_role = 'admin'
  );
$$;

-- 담당 반이 없는(=admin) 교사에겐 항상 false를 돌려줘서 "일치" 비교가 절대 우연히 참이 되지 않게 한다.
create or replace function public.is_homeroom_for(p_grade smallint, p_class_no smallint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_teacher_role() = 'homeroom'
    and public.current_teacher_grade() = p_grade
    and public.current_teacher_class_no() = p_class_no;
$$;

create or replace function public.current_student_grade()
returns smallint
language sql
stable
security definer
set search_path = public
as $$
  select r.grade from public.profiles p
  join public.roster r on r.student_id = p.student_id
  where p.id = auth.uid();
$$;

create or replace function public.current_student_class_no()
returns smallint
language sql
stable
security definer
set search_path = public
as $$
  select r.class_no from public.profiles p
  join public.roster r on r.student_id = p.student_id
  where p.id = auth.uid();
$$;

-- =========================================================
-- 5. RLS 정책 재작성
-- =========================================================

-- roster: admin 전체 / 담임은 자기 반만
drop policy if exists "roster teacher all" on public.roster;
drop policy if exists "roster select" on public.roster;
create policy "roster select" on public.roster
  for select using (public.is_admin() or public.is_homeroom_for(grade, class_no));
drop policy if exists "roster insert" on public.roster;
create policy "roster insert" on public.roster
  for insert with check (public.is_admin() or public.is_homeroom_for(grade, class_no));
drop policy if exists "roster update" on public.roster;
create policy "roster update" on public.roster
  for update using (public.is_admin() or public.is_homeroom_for(grade, class_no))
  with check (public.is_admin() or public.is_homeroom_for(grade, class_no));
drop policy if exists "roster delete" on public.roster;
create policy "roster delete" on public.roster
  for delete using (public.is_admin() or public.is_homeroom_for(grade, class_no));

-- profiles: 본인 / admin / (담임이고 대상이 같은 반 학생)인 경우만 조회
drop policy if exists "profiles self or teacher select" on public.profiles;
create policy "profiles select" on public.profiles
  for select using (
    id = auth.uid()
    or public.is_admin()
    or (
      role = 'student'
      and exists (
        select 1 from public.roster r
        where r.student_id = profiles.student_id
          and public.is_homeroom_for(r.grade, r.class_no)
      )
    )
  );

-- profiles 자기수정: role/student_id/name/teacher_role/grade/class_no는 변경 불가 (테마/폰트 설정만 허용)
drop policy if exists "profiles self update theme" on public.profiles;
create policy "profiles self update theme" on public.profiles
  for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from public.profiles where id = auth.uid())
    and student_id is not distinct from (select student_id from public.profiles where id = auth.uid())
    and name is not distinct from (select name from public.profiles where id = auth.uid())
    and teacher_role is not distinct from (select teacher_role from public.profiles where id = auth.uid())
    and grade is not distinct from (select grade from public.profiles where id = auth.uid())
    and class_no is not distinct from (select class_no from public.profiles where id = auth.uid())
  );

-- counseling_slots: admin 전체 / 담임 자기 반 / 학생 자기 반만
drop policy if exists "slots select authenticated" on public.counseling_slots;
drop policy if exists "slots select" on public.counseling_slots;
create policy "slots select" on public.counseling_slots
  for select using (
    public.is_admin()
    or public.is_homeroom_for(grade, class_no)
    or (grade = public.current_student_grade() and class_no = public.current_student_class_no())
  );
drop policy if exists "slots teacher write" on public.counseling_slots;
create policy "slots teacher write" on public.counseling_slots
  for all using (public.is_admin() or public.is_homeroom_for(grade, class_no))
  with check (public.is_admin() or public.is_homeroom_for(grade, class_no));

-- slot_favorites: admin 전체 / 담임 자기 반만
drop policy if exists "favorites teacher all" on public.slot_favorites;
create policy "favorites teacher all" on public.slot_favorites
  for all using (public.is_admin() or public.is_homeroom_for(grade, class_no))
  with check (public.is_admin() or public.is_homeroom_for(grade, class_no));

-- wonseo_cards: admin 전체 / 담임 자기 반 학생 / 학생 본인
drop policy if exists "wonseo select" on public.wonseo_cards;
create policy "wonseo select" on public.wonseo_cards
  for select using (
    public.is_admin()
    or public.is_homeroom_for(substring(student_id from 1 for 1)::smallint, substring(student_id from 3 for 1)::smallint)
    or student_id = public.current_student_id()
  );
drop policy if exists "wonseo insert" on public.wonseo_cards;
create policy "wonseo insert" on public.wonseo_cards
  for insert with check (
    public.is_admin()
    or public.is_homeroom_for(substring(student_id from 1 for 1)::smallint, substring(student_id from 3 for 1)::smallint)
    or student_id = public.current_student_id()
  );
drop policy if exists "wonseo update" on public.wonseo_cards;
create policy "wonseo update" on public.wonseo_cards
  for update using (
    public.is_admin()
    or public.is_homeroom_for(substring(student_id from 1 for 1)::smallint, substring(student_id from 3 for 1)::smallint)
    or student_id = public.current_student_id()
  )
  with check (
    public.is_admin()
    or public.is_homeroom_for(substring(student_id from 1 for 1)::smallint, substring(student_id from 3 for 1)::smallint)
    or student_id = public.current_student_id()
  );
drop policy if exists "wonseo delete" on public.wonseo_cards;
create policy "wonseo delete" on public.wonseo_cards
  for delete using (
    public.is_admin()
    or public.is_homeroom_for(substring(student_id from 1 for 1)::smallint, substring(student_id from 3 for 1)::smallint)
    or student_id = public.current_student_id()
  );

-- wonseo_images: wonseo_cards와 동일 규칙 (student_id 비정규화 컬럼 사용)
drop policy if exists "wonseo images select" on public.wonseo_images;
create policy "wonseo images select" on public.wonseo_images
  for select using (
    public.is_admin()
    or public.is_homeroom_for(substring(student_id from 1 for 1)::smallint, substring(student_id from 3 for 1)::smallint)
    or student_id = public.current_student_id()
  );
drop policy if exists "wonseo images insert" on public.wonseo_images;
create policy "wonseo images insert" on public.wonseo_images
  for insert with check (
    public.is_admin()
    or public.is_homeroom_for(substring(student_id from 1 for 1)::smallint, substring(student_id from 3 for 1)::smallint)
    or student_id = public.current_student_id()
  );
drop policy if exists "wonseo images delete" on public.wonseo_images;
create policy "wonseo images delete" on public.wonseo_images
  for delete using (
    public.is_admin()
    or public.is_homeroom_for(substring(student_id from 1 for 1)::smallint, substring(student_id from 3 for 1)::smallint)
    or student_id = public.current_student_id()
  );

-- app_settings: 인증된 모두 읽기, 쓰기는 (관례상) admin/담임 모두 계속 허용 — 반별 개념이 없는 전역 설정
drop policy if exists "settings teacher write" on public.app_settings;
create policy "settings teacher write" on public.app_settings
  for all using (public.is_teacher()) with check (public.is_teacher());

-- storage.objects (wonseo-attachments): wonseo_images와 동일 규칙
drop policy if exists "wonseo attachments select" on storage.objects;
create policy "wonseo attachments select" on storage.objects
  for select using (
    bucket_id = 'wonseo-attachments'
    and (
      public.is_admin()
      or public.is_homeroom_for(
        substring((storage.foldername(name))[1] from 1 for 1)::smallint,
        substring((storage.foldername(name))[1] from 3 for 1)::smallint
      )
      or (storage.foldername(name))[1] = public.current_student_id()
    )
  );
drop policy if exists "wonseo attachments insert" on storage.objects;
create policy "wonseo attachments insert" on storage.objects
  for insert with check (
    bucket_id = 'wonseo-attachments'
    and (
      public.is_admin()
      or public.is_homeroom_for(
        substring((storage.foldername(name))[1] from 1 for 1)::smallint,
        substring((storage.foldername(name))[1] from 3 for 1)::smallint
      )
      or (storage.foldername(name))[1] = public.current_student_id()
    )
  );
drop policy if exists "wonseo attachments delete" on storage.objects;
create policy "wonseo attachments delete" on storage.objects
  for delete using (
    bucket_id = 'wonseo-attachments'
    and (
      public.is_admin()
      or public.is_homeroom_for(
        substring((storage.foldername(name))[1] from 1 for 1)::smallint,
        substring((storage.foldername(name))[1] from 3 for 1)::smallint
      )
      or (storage.foldername(name))[1] = public.current_student_id()
    )
  );

-- =========================================================
-- 6. book_slot RPC: 다른 반 슬롯을 예약할 수 없도록 보강
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
  v_student_grade smallint;
  v_student_class_no smallint;
  v_slot public.counseling_slots;
begin
  select p.student_id, p.name, r.grade, r.class_no
  into v_student_id, v_student_name, v_student_grade, v_student_class_no
  from public.profiles p
  join public.roster r on r.student_id = p.student_id
  where p.id = auth.uid();

  if v_student_id is null then
    raise exception '학생 계정만 예약할 수 있습니다.';
  end if;

  select * into v_slot from public.counseling_slots
  where id = p_slot_id
  for update;

  if not found then
    raise exception '존재하지 않는 슬롯입니다.';
  end if;

  if v_slot.grade is distinct from v_student_grade or v_slot.class_no is distinct from v_student_class_no then
    raise exception '본인 반의 상담 슬롯만 신청할 수 있습니다.';
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

grant execute on function public.book_slot(uuid) to authenticated;

-- cancel_slot도 담임이 다른 반 슬롯까지 취소할 수 있던 부분을 보강
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

  if not (public.is_admin() or public.is_homeroom_for(v_slot.grade, v_slot.class_no))
     and v_slot.student_id is distinct from v_student_id then
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

grant execute on function public.cancel_slot(uuid) to authenticated;
