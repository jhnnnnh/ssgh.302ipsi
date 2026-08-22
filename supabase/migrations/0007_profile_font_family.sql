-- 학생별 폰트 선택 저장 컬럼
-- (0005에서 만든 "본인 프로필 수정" 정책이 role/student_id/name 외의
--  컬럼은 자유롭게 수정하도록 허용하므로 별도 정책 추가가 필요 없다.)
-- Supabase Dashboard > SQL Editor 에서 실행하세요.

alter table public.profiles
  add column if not exists font_family text;
