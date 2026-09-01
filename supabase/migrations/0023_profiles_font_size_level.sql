-- 폰트 종류와 별개로 글자 크기 자체를 5단계(-2~+2)로 조절할 수 있게 한다. 0이 기본(보통)이고,
-- 한 단계당 체감 차이가 크지 않도록 작은 배율(5%)로 둔다.
alter table public.profiles
  add column font_size_level smallint not null default 0
    check (font_size_level between -2 and 2);
