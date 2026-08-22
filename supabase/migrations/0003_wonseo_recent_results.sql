-- 수시 원서 카드에 "최근 입결" 정보를 저장할 컬럼 추가
-- 연도별 자유 항목이라 고정 스키마 대신 JSONB 배열로 저장한다.
-- 예: [{"year":"2026","enrollment":"10","competitionRate":"5.2","fillCount":"3","cut50":"3,4","cut70":"5.00","myPosition":"중상위권 예상"}, ...]
-- Supabase Dashboard > SQL Editor 에서 실행하세요.

alter table public.wonseo_cards
  add column if not exists recent_results jsonb not null default '[]'::jsonb;
