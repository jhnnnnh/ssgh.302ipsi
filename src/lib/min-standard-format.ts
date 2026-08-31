/**
 * 전형정보 참고자료의 수능최저학력기준 칸은 대학 하나가 여러 계열/학과를 한 줄에
 * "[라벨] 국,수,영,탐(1) 2합 7" 식으로 다 나열해 놓은 원문이라 매우 길다. 카드 입력칸에
 * 그대로 넣으면 잘려 보이므로, 계열별로 줄을 나누고 각 줄은 핵심 숫자("n합n")만 남기고
 * 수학 포함/한국사 등급 같은 조건은 괄호로 짧게 붙인다. 패턴을 못 알아본 부분은 원문을
 * 그대로 두어 정보가 사라지지 않게 한다.
 */

const BRACKET_RE = /\[([^\]]+)\]/g;
const SUM_RE = /(\d)\s*합\s*(\d+(?:\.\d+)?)/;

function splitSegments(text: string): { label: string | null; body: string }[] {
  const matches = [...text.matchAll(BRACKET_RE)];
  if (matches.length === 0) return [{ label: null, body: text }];

  const segments: { label: string | null; body: string }[] = [];
  const firstStart = matches[0].index ?? 0;
  if (firstStart > 0) {
    const pre = text.slice(0, firstStart).trim();
    if (pre) segments.push({ label: null, body: pre });
  }
  for (let i = 0; i < matches.length; i++) {
    const start = (matches[i].index ?? 0) + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    segments.push({ label: matches[i][1], body: text.slice(start, end) });
  }
  return segments;
}

function summarizeBody(body: string): string {
  const match = body.match(SUM_RE);
  if (!match) return body.trim().replace(/^,\s*/, "");

  const notes: string[] = [];
  if (/수\s*포함/.test(body)) notes.push("수학 포함");
  if (/과탐\s*\d*\s*과목\s*이상\s*필수/.test(body) || /과탐\s*필수/.test(body)) notes.push("과탐 필수");
  const han = body.match(/한\s*(\d)/);
  if (han) notes.push(`한국사 ${han[1]}등급`);
  const inquiryAvg = body.match(/탐\s*\(?\s*(\d)\s*\)?\s*평균/);
  if (inquiryAvg) notes.push(`탐구 ${inquiryAvg[1]}개 평균`);

  const core = `${match[1]}합${match[2]}`;
  return notes.length > 0 ? `${core}(${notes.join(", ")})` : core;
}

export function summarizeMinStandard(raw: string | null | undefined): string | null {
  if (!raw) return raw ?? null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "없음") return trimmed;

  const segments = splitSegments(trimmed);
  if (segments.length === 0) return trimmed;

  return segments
    .map(({ label, body }) => {
      const summary = summarizeBody(body);
      return label ? `[${label}] ${summary}` : summary;
    })
    .filter(Boolean)
    .join("\n");
}
