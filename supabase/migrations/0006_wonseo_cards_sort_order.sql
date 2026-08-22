-- 수시 원서 카드 드래그 앤 드롭 순서 저장용 컬럼
-- Supabase Dashboard > SQL Editor 에서 실행하세요.

alter table public.wonseo_cards
  add column if not exists sort_order integer not null default 0;

-- 기존 카드는 학생별로 생성일 순서를 그대로 초기 sort_order로 백필한다.
with ordered as (
  select id, row_number() over (partition by student_id order by created_at asc) - 1 as rn
  from public.wonseo_cards
)
update public.wonseo_cards w
set sort_order = ordered.rn
from ordered
where w.id = ordered.id;
