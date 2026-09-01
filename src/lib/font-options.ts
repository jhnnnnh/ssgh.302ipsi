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
   * 실제 화면 문구 10종 × font-weight 700(앱 UI 대부분이 font-bold라 이 굵기로
   * 측정해야 실제 렌더링과 맞음)으로 Canvas 2D actualBoundingBox를 측정해
   * 표본별 Pretendard 대비 비율의 기하평균을 낸 뒤, 높이 비중 0.65 · 너비 비중
   * 0.35로 가중 평균해 산출했다(사람이 "크기"를 판단할 때 높이 영향이 더 커서).
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
    sizeAdjust: 0.976,
  },
  {
    key: "scdream",
    label: "에스코어 드림 (SCDream)",
    cssFamily: "'SCDream', 'Pretendard', sans-serif",
    sizeAdjust: 0.916,
  },
  {
    key: "nanum-square",
    label: "나눔스퀘어 (NanumSquare)",
    cssFamily: "'NanumSquare', 'Pretendard', sans-serif",
    sizeAdjust: 0.954,
  },
  {
    key: "hahmlet",
    label: "함렡 (Hahmlet)",
    cssFamily: "var(--font-hahmlet), 'Pretendard', sans-serif",
    sizeAdjust: 0.979,
  },
  {
    key: "joseon-gungseo",
    label: "조선궁서체 (Joseon Gungseo)",
    cssFamily: "'JoseonGungseo', 'Pretendard', sans-serif",
    sizeAdjust: 0.923,
  },
  {
    key: "sd-unicef-dodam",
    label: "SD 유니세프 도담체",
    cssFamily: "'SDUnicefDodam', 'Pretendard', sans-serif",
    sizeAdjust: 1.111,
  },
  {
    key: "gyeonggi-cheonnyeon-batang",
    label: "경기천년바탕",
    cssFamily: "'GyeonggiCheonnyeonBatang', 'Pretendard', sans-serif",
    sizeAdjust: 0.927,
  },
  {
    key: "lee-seoyoon",
    label: "이서윤체",
    cssFamily: "'LeeSeoyoon', 'Pretendard', sans-serif",
    sizeAdjust: 1.1,
  },
  {
    key: "moneygraphy",
    label: "머니그라피",
    cssFamily: "'Moneygraphy', 'Pretendard', sans-serif",
    sizeAdjust: 0.955,
  },
  {
    key: "gmarket-sans",
    label: "G마켓 산스",
    cssFamily: "'GmarketSans', 'Pretendard', sans-serif",
    sizeAdjust: 0.965,
  },
  {
    key: "bm-dohyeon",
    label: "배민 도현체",
    cssFamily: "'BMDoHyeon', 'Pretendard', sans-serif",
    sizeAdjust: 0.883,
  },
  {
    key: "okdd-gothic",
    label: "Ok단단체",
    cssFamily: "'OKDDGothic', 'Pretendard', sans-serif",
    sizeAdjust: 1.126,
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

/**
 * 폰트 종류와 별개로 글자 크기만 조절하는 5단계. 한 단계당 7%씩 바뀐다
 * (전체 범위 -2~+2단계 = 약 87.3%~114.5%).
 */
export const FONT_SIZE_LEVELS = [-2, -1, 0, 1, 2] as const;
export type FontSizeLevel = (typeof FONT_SIZE_LEVELS)[number];
export const DEFAULT_FONT_SIZE_LEVEL: FontSizeLevel = 0;

const FONT_SIZE_STEP = 1.07;

export function getFontSizeMultiplierByLevel(level: number | null | undefined): number {
  const clamped = Math.min(2, Math.max(-2, level ?? 0));
  return FONT_SIZE_STEP ** clamped;
}
