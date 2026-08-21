const WEEKDAY_KR = ["일", "월", "화", "수", "목", "금", "토"];

export function formatDateLabel(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAY_KR[d.getDay()]})`;
}

export function formatDateFull(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일(${WEEKDAY_KR[d.getDay()]})`;
}

export function isWeekendDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDay();
  return day === 0 || day === 6;
}

/** 사용자가 시간 입력창에 숫자만 입력해도 "HH:MM" 형태로 자동 정리한다. */
export function autoFormatTime(raw: string) {
  const digits = raw.replace(/[^0-9]/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/** DB에서 오는 "HH:MM:SS" 형태의 time 값을 화면 표시용 "HH:MM"으로 자른다. */
export function formatTime(value: string) {
  return value.slice(0, 5);
}

export function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function addMinutesToTime(time: string, minutes: number) {
  if (!isValidTime(time)) return "";
  const [h, m] = time.split(":").map(Number);
  const total = (h * 60 + m + minutes + 24 * 60) % (24 * 60);
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

export function compareTime(a: string, b: string) {
  return a.localeCompare(b);
}

/** 로컬 타임존 기준 오늘 날짜를 "YYYY-MM-DD"로 반환한다. */
export function todayDateString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
