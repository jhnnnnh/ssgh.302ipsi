set search_path = public, extensions;

-- 이투스 "2027학년도 수시전형모음" 엑셀의 "전형데이터" 시트(93열)를 저장한다.
-- 실제로 매칭·자동 채움에 쓰는 필드만 타입 있는 컬럼으로 두고, 나머지 열은 raw jsonb에
-- 원본 헤더 이름 그대로 통째로 보관한다. admission_cutoffs(입결)와 달리 이 테이블은
-- 이번 입시 연도의 공식 모집요강 원본이라 카드의 전형방법/최저학력기준/모집인원을
-- 전담한다.
create table public.admission_offerings (
  id uuid primary key default gen_random_uuid(),
  offering_code text not null,
  university text not null,
  department text not null,
  admission_type text not null,
  admission_type_group text,
  track text not null,
  plan_kind text,
  field text,
  field_detail text,
  enrollment integer,
  selection_model text not null,
  method_text text,
  method_academic_quant numeric,
  method_academic_qual numeric,
  method_interview numeric,
  method_essay numeric,
  method_practical numeric,
  method_document numeric,
  method_stage1_score numeric,
  method_etc numeric,
  min_standard_applied text,
  min_standard_text text,
  raw jsonb not null,
  uploaded_at timestamptz not null,
  created_at timestamptz not null default now()
);

create unique index admission_offerings_code_idx on public.admission_offerings (offering_code);
create index admission_offerings_lookup_idx on public.admission_offerings (university, department, admission_type);
create index admission_offerings_university_trgm_idx on public.admission_offerings using gin (university gin_trgm_ops);
create index admission_offerings_department_trgm_idx on public.admission_offerings using gin (department gin_trgm_ops);

alter table public.admission_offerings enable row level security;

create policy "admission_offerings select" on public.admission_offerings
  for select using (auth.uid() is not null);

create policy "admission_offerings write" on public.admission_offerings
  for all using (public.has_admin_capabilities()) with check (public.has_admin_capabilities());
