-- 지망 순위를 더 이상 자유 텍스트로만 관리하지 않는다. 기본은 카드의 드래그 순서(sort_order)에
-- 따라 화면에서 자동으로 "N지망"이 매겨지고(auto), 배지를 눌러 미지정(unassigned)이나 직접
-- 텍스트를 입력하는 상태(custom, 이때만 rank 컬럼의 텍스트가 실제로 쓰인다)로 순환한다.
alter table public.wonseo_cards
  add column rank_mode text not null default 'auto' check (rank_mode in ('auto', 'unassigned', 'custom'));

-- 기존에 rank가 비어 있던 카드(화면에 "지망 미지정"으로 보이던 카드)는 미지정으로,
-- 뭔가 텍스트가 있던 카드는 자동배정으로 전환한다. 자동배정은 순서 기반으로 새로 번호가
-- 매겨지므로 기존에 입력했던 텍스트 값 자체는 더 이상 의미가 없어 비운다.
update public.wonseo_cards
set rank_mode = case when rank is null or trim(rank) = '' then 'unassigned' else 'auto' end;

update public.wonseo_cards set rank = null;
