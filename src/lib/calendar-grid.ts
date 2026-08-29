/** "YYYY-MM-DD" 로컬 날짜 문자열로 변환한다(UTC 변환에 의한 하루 밀림 방지). */
export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type MonthGridCell = {
  dateStr: string;
  day: number;
  dayOfWeek: number;
  inMonth: boolean;
};

/** year/month(1~12) 기준 6주(42칸) 캘린더 그리드를 만든다. 일요일 시작. */
export function getMonthGridCells(year: number, month: number): MonthGridCell[] {
  const firstOfMonth = new Date(year, month - 1, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(year, month - 1, 1 - startOffset);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return {
      dateStr: toDateString(d),
      day: d.getDate(),
      dayOfWeek: d.getDay(),
      inMonth: d.getMonth() === month - 1,
    };
  });
}
