/**
 * 학생이 고를 수 있는 웹폰트 14종. 화면 표시 순서와 동일한 순서로 정의한다(임의 정렬 금지).
 * `key`는 DB(profiles.font_family)에 저장되는 값이고, `cssFamily`는 실제
 * font-family CSS 값(항상 "해당 폰트 → Pretendard → sans-serif" 순 폴백)이다.
 * 폰트 파일 자체는 Noto Sans KR/Hahmlet만 next/font/google(layout.tsx)로 로드하고,
 * 나머지는 모두 자체 호스팅(globals.css의 @font-face, /public/fonts/*)이다.
 */
export type FontOption = {
  key: string;
  label: string;
  cssFamily: string;
  /**
   * 폰트마다 같은 font-size에서도 실제로 보이는 크기(글자 높이/너비)가 달라서
   * 눈에 보이는 크기를 Pretendard 기준으로 맞추기 위한 보정 배율.
   * Canvas 2D의 actualBoundingBox 측정치(다양한 한글/영문/숫자 샘플 텍스트 기준)로
   * 각 폰트를 실측해 Pretendard 대비 비율의 기하평균으로 산출했다.
   */
  sizeAdjust: number;
};

export const DEFAULT_FONT_KEY = "pretendard";

export const FONT_OPTIONS: FontOption[] = [
  {
    key: "pretendard",
    label: "Pretendard (기본값)",
    cssFamily: "'Pretendard', sans-serif",
    sizeAdjust: 1,
  },
  {
    key: "noto-sans-kr",
    label: "Noto Sans KR",
    cssFamily: "var(--font-noto-sans-kr), 'Pretendard', sans-serif",
    sizeAdjust: 0.98,
  },
  {
    key: "scdream",
    label: "에스코어 드림 (SCDream)",
    cssFamily: "'SCDream', 'Pretendard', sans-serif",
    sizeAdjust: 0.92,
  },
  {
    key: "nanum-square",
    label: "나눔스퀘어 (NanumSquare)",
    cssFamily: "'NanumSquare', 'Pretendard', sans-serif",
    sizeAdjust: 0.95,
  },
  {
    key: "hahmlet",
    label: "함렡 (Hahmlet)",
    cssFamily: "var(--font-hahmlet), 'Pretendard', sans-serif",
    sizeAdjust: 0.97,
  },
  {
    key: "joseon-gungseo",
    label: "조선궁서체 (Joseon Gungseo)",
    cssFamily: "'JoseonGungseo', 'Pretendard', sans-serif",
    sizeAdjust: 0.95,
  },
  {
    key: "sd-unicef-dodam",
    label: "SD 유니세프 도담체",
    cssFamily: "'SDUnicefDodam', 'Pretendard', sans-serif",
    sizeAdjust: 1.16,
  },
  {
    key: "gyeonggi-cheonnyeon-batang",
    label: "경기천년바탕",
    cssFamily: "'GyeonggiCheonnyeonBatang', 'Pretendard', sans-serif",
    sizeAdjust: 0.95,
  },
  {
    key: "lee-seoyoon",
    label: "이서윤체",
    cssFamily: "'LeeSeoyoon', 'Pretendard', sans-serif",
    sizeAdjust: 1.11,
  },
  {
    key: "moneygraphy",
    label: "머니그라피",
    cssFamily: "'Moneygraphy', 'Pretendard', sans-serif",
    sizeAdjust: 0.96,
  },
  {
    key: "gmarket-sans",
    label: "G마켓 산스",
    cssFamily: "'GmarketSans', 'Pretendard', sans-serif",
    sizeAdjust: 0.93,
  },
  {
    key: "bm-dohyeon",
    label: "배민 도현체",
    cssFamily: "'BMDoHyeon', 'Pretendard', sans-serif",
    sizeAdjust: 0.9,
  },
  {
    key: "okdd-gothic",
    label: "Ok단단체",
    cssFamily: "'OKDDGothic', 'Pretendard', sans-serif",
    sizeAdjust: 1.11,
  },
];

export function getFontOptionByKey(key: string | null | undefined): FontOption {
  return FONT_OPTIONS.find((f) => f.key === key) ?? FONT_OPTIONS[0];
}

export function getFontFamilyByKey(key: string | null | undefined): string {
  return getFontOptionByKey(key).cssFamily;
}

export function getFontSizeAdjustByKey(key: string | null | undefined): number {
  return getFontOptionByKey(key).sizeAdjust;
}
