-- 전형정보(전형방법/수능최저학력기준 등) 참고자료 엑셀의 3개 시트(학생부교과전형/학생부종합전형/논술전형)를
-- 그대로 저장한다. admission_cutoffs와 마찬가지로 매년 새 파일을 올리면 통째로 교체된다.
create table public.admission_methods (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('학생부교과전형', '학생부종합전형', '논술전형')),
  region text,
  area text not null,
  university text not null,
  admission_type text not null,
  method text,
  min_standard text,
  note text,
  review_elements text,
  created_at timestamptz not null default now()
);

create index admission_methods_lookup_idx on public.admission_methods (university, admission_type);

alter table public.admission_methods enable row level security;

create policy "admission_methods select" on public.admission_methods
  for select using (auth.uid() is not null);

create policy "admission_methods write" on public.admission_methods
  for all using (public.has_admin_capabilities()) with check (public.has_admin_capabilities());
