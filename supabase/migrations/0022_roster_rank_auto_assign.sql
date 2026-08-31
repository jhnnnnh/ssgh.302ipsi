-- 학생별로 "지망 순위 자동 배정" 스위치 상태를 저장한다. 켜져 있으면(기본값) 원서 카드
-- 목록 화면에서 드래그 순서로 지망 번호를 자동 계산하고, 꺼지면 각 카드의 rank 텍스트를
-- 학생/교사가 자유롭게 직접 입력한다.
alter table public.roster add column rank_auto_assign boolean not null default true;
