-- 카드별 배지 순환 방식을 폐기하고 목록 전체를 제어하는 스위치 방식으로 다시 설계한다.
alter table public.wonseo_cards drop column rank_mode;
