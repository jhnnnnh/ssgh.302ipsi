-- "내 원서 일정": 원서 카드 하나에 논술/면접/실기/원서접수/서류제출/합격자발표 등 여러 개의
-- 일정이 있을 수 있는데, 기존 wonseo_linked는 카드당 1행만 허용해서(unique) 이런 다건을
-- 담을 수 없었다. wonseo_linked는 그대로 두고(수동 "일정 등록" 1건 전용), 이투스
-- 전형데이터에서 자동으로 뽑아낸 여러 일정을 담을 새 유형 wonseo_schedule을 추가한다.
-- wonseo_linked와 달리 title/date/kind를 그 자리에서 직접 저장한다(원본 전형데이터가
-- 나중에 바뀌어도 이미 캘린더에 넣은 일정은 그대로 유지되는 스냅샷 방식).

alter table public.calendar_events add column kind text;

alter table public.calendar_events drop constraint calendar_events_type_check;
alter table public.calendar_events add constraint calendar_events_type_check
  check (type in ('wonseo_linked', 'wonseo_schedule', 'personal', 'class', 'grade'));

alter table public.calendar_events drop constraint calendar_events_shape;
alter table public.calendar_events add constraint calendar_events_shape check (
  (
    type = 'wonseo_linked'
    and wonseo_card_id is not null
    and student_id is not null
    and title is null
    and date is null
    and kind is null
  )
  or (
    type = 'wonseo_schedule'
    and wonseo_card_id is not null
    and student_id is not null
    and title is not null
    and date is not null
    and kind is not null
  )
  or (
    type = 'personal'
    and wonseo_card_id is null
    and title is not null
    and date is not null
    and kind is null
  )
  or (
    type = 'class'
    and grade is not null
    and class_no is not null
    and student_id is null
    and wonseo_card_id is null
    and title is not null
    and date is not null
    and kind is null
  )
  or (
    type = 'grade'
    and grade is null
    and class_no is null
    and student_id is null
    and wonseo_card_id is null
    and title is not null
    and date is not null
    and kind is null
  )
);

-- 기존 유니크 인덱스는 "카드당 wonseo_card_id 하나"를 강제해서 wonseo_linked 전용이었다.
-- wonseo_schedule은 카드 하나에 여러 kind(논술/면접/...)가 있어야 하므로 유형별로 좁힌다.
drop index public.calendar_events_wonseo_card_id_key;
create unique index calendar_events_wonseo_card_id_key
  on public.calendar_events (wonseo_card_id)
  where wonseo_card_id is not null and type = 'wonseo_linked';

-- wonseo_schedule은 같은 카드에 같은 kind가 중복 추가되지 않게 막는다(재조회해도 안전).
create unique index calendar_events_wonseo_schedule_key
  on public.calendar_events (wonseo_card_id, kind)
  where type = 'wonseo_schedule';

drop policy "calendar_events select" on public.calendar_events;
drop policy "calendar_events insert" on public.calendar_events;
drop policy "calendar_events update" on public.calendar_events;
drop policy "calendar_events delete" on public.calendar_events;

drop function public.calendar_events_can_view(text, text, smallint, smallint, uuid);
drop function public.calendar_events_can_manage(text, text, smallint, smallint, uuid);

create function public.calendar_events_can_view(
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
    when 'wonseo_schedule' then
      public.is_admin()
      or (p_grade is not null and p_class_no is not null and public.is_homeroom_for(p_grade, p_class_no))
      or p_student_id = public.current_student_id()
    when 'personal' then
      p_created_by = auth.uid()
    when 'class' then
      public.is_admin()
      or public.is_homeroom_for(p_grade, p_class_no)
      or (public.current_student_grade() = p_grade and public.current_student_class_no() = p_class_no)
    when 'grade' then
      true
    else false
  end;
$$;

create function public.calendar_events_can_manage(
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
    when 'wonseo_schedule' then
      public.is_admin()
      or (p_grade is not null and p_class_no is not null and public.is_homeroom_for(p_grade, p_class_no))
      or p_student_id = public.current_student_id()
    when 'personal' then
      p_created_by = auth.uid()
    when 'class' then
      public.is_admin() or public.is_homeroom_for(p_grade, p_class_no)
    when 'grade' then
      public.is_admin()
    else false
  end;
$$;

create policy "calendar_events select" on public.calendar_events
  for select using (public.calendar_events_can_view(type, student_id, grade, class_no, created_by));

create policy "calendar_events insert" on public.calendar_events
  for insert with check (public.calendar_events_can_manage(type, student_id, grade, class_no, created_by));

create policy "calendar_events update" on public.calendar_events
  for update
  using (public.calendar_events_can_manage(type, student_id, grade, class_no, created_by))
  with check (public.calendar_events_can_manage(type, student_id, grade, class_no, created_by));

create policy "calendar_events delete" on public.calendar_events
  for delete using (public.calendar_events_can_manage(type, student_id, grade, class_no, created_by));
