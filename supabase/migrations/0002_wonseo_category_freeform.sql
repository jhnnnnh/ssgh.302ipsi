-- 전형 유형(category)을 자유 텍스트로 변경 (교사/학생 화면에서 "직접입력" 허용)
-- Supabase Dashboard > SQL Editor 에서 실행하세요.

alter table public.wonseo_cards
  drop constraint if exists wonseo_cards_category_check;
