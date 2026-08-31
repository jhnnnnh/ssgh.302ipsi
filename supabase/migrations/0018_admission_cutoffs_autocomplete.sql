-- 원서 카드 입력 시 대학명/학과명/전형명 자동완성에 쓰는 함수들.
-- 이미 있는 university/department 트라이그램 GIN 인덱스가 ILIKE '%...%'도 가속해준다.

create or replace function public.autocomplete_universities(p_query text, p_limit int default 6)
returns table(university text)
language sql
stable
set search_path = public, extensions
as $$
  select distinct university
  from public.admission_cutoffs
  where university ilike '%' || p_query || '%'
  order by university
  limit p_limit;
$$;

create or replace function public.autocomplete_departments(
  p_query text, p_university text default null, p_limit int default 6
)
returns table(university text, department text)
language sql
stable
set search_path = public, extensions
as $$
  select distinct university, department
  from public.admission_cutoffs
  where department ilike '%' || p_query || '%'
    and (p_university is null or university = p_university)
  order by university, department
  limit p_limit;
$$;

create or replace function public.autocomplete_admission_types(
  p_query text, p_university text default null, p_department text default null, p_limit int default 6
)
returns table(admission_type text, department text)
language sql
stable
set search_path = public, extensions
as $$
  select distinct admission_type, department
  from public.admission_cutoffs
  where admission_type ilike '%' || p_query || '%'
    and (p_university is null or university = p_university)
    and (p_department is null or department = p_department)
  order by admission_type
  limit p_limit;
$$;
