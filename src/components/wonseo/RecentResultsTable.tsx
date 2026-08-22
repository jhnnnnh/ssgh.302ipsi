import type { RecentResultYear } from "@/lib/database.types";

export const RESULT_ROWS: { key: keyof Omit<RecentResultYear, "year">; label: string }[] = [
  { key: "enrollment", label: "모집인원" },
  { key: "competitionRate", label: "경쟁률" },
  { key: "fillCount", label: "충원인원" },
  { key: "cut50", label: "50% 컷" },
  { key: "cut70", label: "70% 컷" },
  { key: "myPosition", label: "나의 상대적 위치" },
];

export function emptyResultYear(year: string): RecentResultYear {
  return {
    year,
    enrollment: "",
    competitionRate: "",
    fillCount: "",
    cut50: "",
    cut70: "",
    myPosition: "",
  };
}

/** 읽기 전용 최근 입결 표 (학생/교사 카드 목록에서 조회용). */
export function RecentResultsTable({ years }: { years: RecentResultYear[] }) {
  if (years.length === 0) {
    return (
      <p className="text-[11px] text-slate-400 text-center py-3">
        등록된 입결 정보가 없습니다.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="text-[11px] border-collapse w-full">
        <thead>
          <tr>
            <th className="text-left p-1.5 sticky left-0 bg-white" />
            {years.map((y, i) => (
              <th key={i} className="p-1.5 text-center font-bold text-slate-700">
                {y.year || "-"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {RESULT_ROWS.map((row) => (
            <tr key={row.key} className="border-t border-slate-100">
              <td className="text-slate-500 font-bold p-1.5 whitespace-nowrap sticky left-0 bg-white">
                {row.label}
              </td>
              {years.map((y, i) => (
                <td key={i} className="p-1.5 text-center text-slate-700">
                  {y[row.key] || "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
