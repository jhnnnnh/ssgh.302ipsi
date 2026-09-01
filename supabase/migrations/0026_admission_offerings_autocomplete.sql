-- 원서 카드의 대학명/모집단위/세부전형명 자동완성 데이터 소스를 admission_cutoffs(역대
-- 입결)에서 admission_offerings(이투스 이번 입시 연도 모집요강)로 옮긴다. 최근 입결 표
-- 기능은 그대로 admission_cutoffs를 쓰므로 search_admission_cutoff_candidates는 남겨두고,
-- 입력칸 자동완성 전용이던 3개 RPC만 정리한다.

drop function if exists public.autocomplete_universities(text, int);
drop function if exists public.autocomplete_departments(text, text, int);
drop function if exists public.autocomplete_admission_types(text, text, text, int);

create function public.autocomplete_offering_universities(p_query text, p_limit int default 6)
returns table(university text)
language sql
stable
set search_path = public, extensions
as $$
  select distinct university
  from public.admission_offerings
  where university ilike '%' || p_query || '%'
  order by university
  limit p_limit;
$$;

create function public.autocomplete_offering_departments(
  p_query text, p_university text default null, p_limit int default 6
)
returns table(university text, department text)
language sql
stable
set search_path = public, extensions
as $$
  select distinct university, department
  from public.admission_offerings
  where department ilike '%' || p_query || '%'
    and (p_university is null or university = p_university)
  order by university, department
  limit p_limit;
$$;

create function public.autocomplete_offering_admission_types(
  p_query text, p_university text default null, p_department text default null,
  p_track text default null, p_limit int default 6
)
returns table(admission_type text, department text, track text)
language sql
stable
set search_path = public, extensions
as $$
  select distinct admission_type, department, track
  from public.admission_offerings
  where admission_type ilike '%' || p_query || '%'
    and (p_university is null or university = p_university)
    and (p_department is null or department = p_department)
    and (p_track is null or track = p_track)
  order by admission_type
  limit p_limit;
$$;
