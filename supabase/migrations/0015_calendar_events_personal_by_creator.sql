-- 개인 일정(personal)을 학생뿐 아니라 교사도 등록할 수 있게 한다.
-- 교사는 student_id가 없으므로, 공개 범위를 student_id 대신 created_by(작성자 본인) 기준으로 바꾼다.

alter table public.calendar_events drop constraint calendar_events_shape;

alter table public.calendar_events add constraint calendar_events_shape check (
  (
    type = 'wonseo_linked'
    and wonseo_card_id is not null
    and student_id is not null
    and title is null
    and date is null
  )
  or (
    type = 'personal'
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
);

drop policy "calendar_events select" on public.calendar_events;
drop policy "calendar_events insert" on public.calendar_events;
drop policy "calendar_events update" on public.calendar_events;
drop policy "calendar_events delete" on public.calendar_events;

drop function public.calendar_events_can_view(text, text, smallint, smallint);
drop function public.calendar_events_can_manage(text, text, smallint, smallint);

create or replace function public.calendar_events_can_view(
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
      public.is_admin()
      or public.is_homeroom_for(p_grade, p_class_no)
      or (public.current_student_grade() = p_grade and public.current_student_class_no() = p_class_no)
    when 'grade' then
      true
    else false
  end;
$$;

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
