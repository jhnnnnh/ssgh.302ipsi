-- admission_methods(울산교육청 전형정보 3시트 참고자료)를 이투스 "전형데이터"
-- (admission_offerings)로 완전히 대체한다. 두 소스를 같이 두면 카드의 전형방법/
-- 수능최저학력기준 자동 채움이 어느 쪽을 따라야 할지 꼬이기 때문에 정리한다.
drop table if exists public.admission_methods;
