-- 글씨 크기 설정 저장 컬럼 (테마 색상/폰트와 동일한 본인 수정 정책이 이미 적용됨)
-- Supabase Dashboard > SQL Editor 에서 실행하세요.

alter table public.profiles
  add column if not exists font_scale text;
