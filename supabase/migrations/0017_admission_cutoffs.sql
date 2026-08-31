create extension if not exists pg_trgm;

-- "대학어디가" 형식 엑셀의 대학자료 시트를 그대로 저장한다. 매년 전체관리자가
-- 새 파일을 올리면 통째로 교체(delete + insert)하는 방식이라, 화면에 안 쓰는
-- 컬럼도 원본 그대로 다 보관해 둔다(추후 매칭/표시에 활용 가능).
create table public.admission_cutoffs (
  id uuid primary key default gen_random_uuid(),
  region text,
  university text not null,
  year smallint not null,
  admission_period text,
  track text,
  admission_type text,
  department text not null,
  humanities_science text,
  enrollment text,
  competition_rate text,
  additional_pass text,
  converted_50 text,
  converted_70 text,
  max_score text,
  grade_50 text,
  grade_70 text,
  korean text,
  math text,
  inquiry text,
  average text,
  english text,
  total_applicants text,
  passers text,
  actual_competition_rate text,
  admission_department text,
  sub_category text,
  created_at timestamptz not null default now()
);

create index admission_cutoffs_lookup_idx on public.admission_cutoffs (university, department, year desc);
create index admission_cutoffs_university_trgm_idx on public.admission_cutoffs using gin (university gin_trgm_ops);
create index admission_cutoffs_department_trgm_idx on public.admission_cutoffs using gin (department gin_trgm_ops);

alter table public.admission_cutoffs enable row level security;

-- 대학 입결은 특정 학생 개인정보가 아니라 공개 입시 통계라 로그인한 사용자 누구나 조회 가능.
create policy "admission_cutoffs select" on public.admission_cutoffs
  for select using (auth.uid() is not null);

create policy "admission_cutoffs write" on public.admission_cutoffs
  for all using (public.has_admin_capabilities()) with check (public.has_admin_capabilities());

-- 정확히 일치하는 데이터가 없을 때 보여줄 유사 후보 검색.
create or replace function public.search_admission_cutoff_candidates(
  p_university text, p_department text, p_limit int default 8
)
returns table(university text, department text, score real)
language sql
stable
set search_path = public, extensions
as $$
  select university, department, score
  from (
    select distinct on (university, department)
      university, department,
      (similarity(university, p_university) * 0.5 + similarity(department, p_department) * 0.5)::real as score
    from public.admission_cutoffs
    where admission_period = '수시'
      and (university % p_university or department % p_department)
    order by university, department
  ) s
  where score > 0.1
  order by score desc
  limit p_limit;
$$;

alter extension pg_trgm set schema extensions;
