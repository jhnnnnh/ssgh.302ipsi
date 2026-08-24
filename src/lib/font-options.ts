/**
 * 학생이 고를 수 있는 웹폰트 10종. 화면 표시 순서와 동일한 순서로 정의한다.
 * `key`는 DB(profiles.font_family)에 저장되는 값이고, `cssFamily`는 실제
 * font-family CSS 값(폴백 포함)이다. 폰트 파일 자체는 layout.tsx(Google
 * Fonts, Pretendard CDN)와 globals.css(카페24 아네모네, Gmarket Sans의
 * @font-face)에서 전역으로 미리 로드해 둔다.
 */
export type FontOption = {
  key: string;
  label: string;
  cssFamily: string;
  /**
   * 폰트마다 같은 font-size에서도 실제로 보이는 크기(글자 높이/너비)가 달라서
   * 눈에 보이는 크기를 Pretendard 기준으로 맞추기 위한 보정 배율.
   * Canvas 2D의 actualBoundingBox 측정치("가나다라마바사" 기준 높이·평균 너비)로
   * 각 폰트를 실측해 Pretendard 대비 비율의 기하평균으로 산출했다.
   */
  sizeAdjust: number;
};

export const DEFAULT_FONT_KEY = "pretendard";

export const FONT_OPTIONS: FontOption[] = [
  {
    key: "pretendard",
    label: "Pretendard (기본값)",
    cssFamily: "'Pretendard', system-ui, sans-serif",
    sizeAdjust: 1,
  },
  { key: "song-myung", label: "Song Myung", cssFamily: "'Song Myung', serif", sizeAdjust: 1 },
  {
    key: "gowun-batang",
    label: "고운바탕 (Gowun Batang)",
    cssFamily: "'Gowun Batang', serif",
    sizeAdjust: 0.97,
  },
  {
    key: "gowun-dodum",
    label: "고운돋움 (Gowun Dodum)",
    cssFamily: "'Gowun Dodum', sans-serif",
    sizeAdjust: 0.98,
  },
  {
    key: "cafe24-anemone",
    label: "카페24 아네모네",
    cssFamily: "'Cafe24Anemone', sans-serif",
    sizeAdjust: 1,
  },
  {
    key: "nanum-pen-script",
    label: "나눔손글씨 펜체 (Nanum Pen Script)",
    cssFamily: "'Nanum Pen Script', cursive",
    sizeAdjust: 1.41,
  },
  { key: "gaegu", label: "Gaegu", cssFamily: "'Gaegu', cursive", sizeAdjust: 1.37 },
  {
    key: "gmarket-sans",
    label: "Gmarket Sans",
    cssFamily: "'GMarketSans', sans-serif",
    sizeAdjust: 0.96,
  },
  { key: "do-hyeon", label: "Do Hyeon", cssFamily: "'Do Hyeon', sans-serif", sizeAdjust: 1.14 },
  {
    key: "jua",
    label: "배민 주아체 (Jua)",
    cssFamily: "'Jua', sans-serif",
    sizeAdjust: 1.06,
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
