-- 수시 원서 카드에 "모집인원" 항목 추가. 기존 카드는 전부 NULL(미입력)로 남는다.
alter table public.wonseo_cards
  add column if not exists enrollment integer;
