-- 학생별 테마 색상 저장 컬럼 + 본인 프로필 수정 권한
-- (theme_color 외의 role/student_id/name은 계속 수정 불가하도록 제한)
-- Supabase Dashboard > SQL Editor 에서 실행하세요.

alter table public.profiles
  add column if not exists theme_color text;

drop policy if exists "profiles self update theme" on public.profiles;
create policy "profiles self update theme" on public.profiles
  for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from public.profiles where id = auth.uid())
    and student_id is not distinct from (select student_id from public.profiles where id = auth.uid())
    and name is not distinct from (select name from public.profiles where id = auth.uid())
  );
