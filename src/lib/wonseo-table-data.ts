import type { Roster, WonseoCard } from "@/lib/database.types";

export const WONSEO_TABLE_ROW_LABELS = [
  "지원정도",
  "지망대학",
  "학과",
  "전형유형",
  "세부전형명",
] as const;

export type WonseoTableRowLabel = (typeof WONSEO_TABLE_ROW_LABELS)[number];

export function wonseoTableCellValue(
  card: WonseoCard | undefined,
  label: WonseoTableRowLabel,
): string {
  if (!card) return "";
  switch (label) {
    case "지원정도":
      return card.level;
    case "지망대학":
      return card.university ?? "";
    case "학과":
      return card.department ?? "";
    case "전형유형":
      return card.category ?? "";
    case "세부전형명":
      return card.sub_category ?? "";
    default:
      return "";
  }
}

export type WonseoTableStudentRow = {
  studentId: string;
  name: string;
  cards: WonseoCard[];
};

export type WonseoTableData = {
  maxChoices: number;
  students: WonseoTableStudentRow[];
};

/** 수시 원서 표(엑셀/화면 공용)를 위해 학생별로 카드를 그룹핑·정렬한다. */
export function buildWonseoTableData(roster: Roster[], cards: WonseoCard[]): WonseoTableData {
  const nameById = new Map(roster.map((r) => [r.student_id, r.name]));
  const byStudent = new Map<string, WonseoCard[]>();
  for (const c of cards) {
    const list = byStudent.get(c.student_id) ?? [];
    list.push(c);
    byStudent.set(c.student_id, list);
  }
  for (const list of byStudent.values()) {
    list.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  const studentIds = Array.from(byStudent.keys()).sort();
  const maxChoices = Math.max(1, ...studentIds.map((id) => byStudent.get(id)!.length));

  return {
    maxChoices,
    students: studentIds.map((id) => ({
      studentId: id,
      name: nameById.get(id) ?? "",
      cards: byStudent.get(id)!,
    })),
  };
}
