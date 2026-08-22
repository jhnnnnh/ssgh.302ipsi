-- 상담 슬롯(예약)에 교사가 남기는 메모 컬럼 추가
-- Supabase Dashboard > SQL Editor 에서 실행하세요.

alter table public.counseling_slots
  add column if not exists memo text;
