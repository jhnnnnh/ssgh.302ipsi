-- 원서 카드의 면접/고사 일정을 캘린더와 연동하려면 실제 날짜 값이 필요하다.
-- 기존 exam_date(자유 텍스트, 예: "11/19(목) 14:00 면접")는 시간·메모용 보조 설명으로 그대로 두고,
-- 캘린더 연동에 쓸 실제 날짜만 이 컬럼에 별도로 저장한다.
alter table public.wonseo_cards
  add column if not exists exam_date_at date;
