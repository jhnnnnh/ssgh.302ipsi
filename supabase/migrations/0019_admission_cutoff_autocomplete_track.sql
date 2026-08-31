-- 세부 전형명 자동완성이 전형 유형(교과/종합)으로도 걸러낼 수 있도록 track을 같이 반환한다.
drop function if exists public.autocomplete_admission_types(text, text, text, int);

create function public.autocomplete_admission_types(
  p_query text, p_university text default null, p_department text default null, p_limit int default 6
)
returns table(admission_type text, department text, track text)
language sql
stable
set search_path = public, extensions
as $$
  select distinct admission_type, department, track
  from public.admission_cutoffs
  where admission_type ilike '%' || p_query || '%'
    and (p_university is null or university = p_university)
    and (p_department is null or department = p_department)
  order by admission_type
  limit p_limit;
$$;
