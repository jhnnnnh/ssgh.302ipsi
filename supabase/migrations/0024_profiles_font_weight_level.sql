-- 폰트 굵기를 3단계(-1~+1, 0=보통)로 조절한다. 실제로 로드된 굵기 파일이 있는 만큼만
-- 의미 있게 달라지고, 굵기가 1종류뿐인 폰트는 세 단계가 모두 같은 값으로 수렴한다.
alter table public.profiles
  add column font_weight_level smallint not null default 0
    check (font_weight_level between -1 and 1);
