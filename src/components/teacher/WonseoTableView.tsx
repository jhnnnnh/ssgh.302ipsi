"use client";

import { cn } from "@/lib/cn";
import { LEVEL_TABLE_CELL_STYLE } from "@/lib/wonseo-constants";
import { WONSEO_TABLE_ROW_LABELS, buildWonseoTableData, wonseoTableCellValue } from "@/lib/wonseo-table-data";
import type { Roster, WonseoCard } from "@/lib/database.types";

export function WonseoTableView({ roster, cards }: { roster: Roster[]; cards: WonseoCard[] }) {
  const { maxChoices, students } = buildWonseoTableData(roster, cards);

  if (students.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-xs font-semibold text-slate-500">등록된 원서 카드가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="text-xs border-collapse w-full min-w-max">
        <thead>
          <tr>
            {["학번", "이름", "구분"].map((h) => (
              <th
                key={h}
                className="bg-slate-900 text-white font-bold px-3 py-2.5 whitespace-nowrap sticky top-0"
              >
                {h}
              </th>
            ))}
            {Array.from({ length: maxChoices }, (_, i) => (
              <th
                key={i}
                className="bg-slate-900 text-white font-bold px-3 py-2.5 whitespace-nowrap sticky top-0"
              >
                {i + 1}지망
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <StudentRows key={student.studentId} student={student} maxChoices={maxChoices} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StudentRows({
  student,
  maxChoices,
}: {
  student: { studentId: string; name: string; cards: WonseoCard[] };
  maxChoices: number;
}) {
  return (
    <>
      {WONSEO_TABLE_ROW_LABELS.map((label, li) => (
        <tr key={label} className="border-t border-slate-100">
          {li === 0 && (
            <>
              <td
                rowSpan={WONSEO_TABLE_ROW_LABELS.length}
                className="bg-indigo-50 text-slate-800 font-bold text-center align-middle px-3 py-2 border-r border-slate-200 whitespace-nowrap"
              >
                {student.studentId}
              </td>
              <td
                rowSpan={WONSEO_TABLE_ROW_LABELS.length}
                className="bg-indigo-50 text-slate-800 font-bold text-center align-middle px-3 py-2 border-r border-slate-200 whitespace-nowrap"
              >
                {student.name}
              </td>
            </>
          )}
          <td className="text-slate-500 font-bold px-3 py-2 whitespace-nowrap">{label}</td>
          {Array.from({ length: maxChoices }, (_, i) => {
            const card = student.cards[i];
            const value = wonseoTableCellValue(card, label);
            const isLevel = label === "지원정도" && card;
            return (
              <td
                key={i}
                className={cn(
                  "px-3 py-2 text-center whitespace-nowrap",
                  isLevel ? `font-bold ${LEVEL_TABLE_CELL_STYLE[card.level]}` : "text-slate-700",
                )}
              >
                {value || "-"}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
