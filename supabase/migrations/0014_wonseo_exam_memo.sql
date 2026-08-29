-- 일정(면접/고사)에 짧은 메모(예: "면접", "고사", "실기")를 붙여
-- 카드와 캘린더에 "면접 11/19(목)"처럼 표시할 수 있게 한다.
alter table public.wonseo_cards
  add column if not exists exam_memo text;
