import type ExcelJS from "exceljs";

const SHEET_NAME = "대학자료";
const EXPECTED_COLUMN_COUNT = 26;

export class AdmissionCutoffParseError extends Error {}

export type ParsedAdmissionCutoffRow = {
  region: string | null;
  university: string;
  year: number;
  admission_period: string | null;
  track: string | null;
  admission_type: string | null;
  department: string;
  humanities_science: string | null;
  enrollment: string | null;
  competition_rate: string | null;
  additional_pass: string | null;
  converted_50: string | null;
  converted_70: string | null;
  max_score: string | null;
  grade_50: string | null;
  grade_70: string | null;
  korean: string | null;
  math: string | null;
  inquiry: string | null;
  average: string | null;
  english: string | null;
  total_applicants: string | null;
  passers: string | null;
  actual_competition_rate: string | null;
  admission_department: string | null;
  sub_category: string | null;
};

function cellToString(v: ExcelJS.CellValue): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    if ("result" in v) return v.result == null ? null : String(v.result);
    if ("text" in v) return String((v as { text: unknown }).text);
    if ("richText" in v) {
      return (v as { richText: { text: string }[] }).richText.map((p) => p.text).join("");
    }
    return null;
  }
  const s = String(v).trim();
  return s === "" ? null : s;
}

/**
 * "대학어디가" 형식 엑셀의 대학자료 시트를 읽어 행 배열로 만든다.
 * 컬럼 순서(지역~소계열, 26개)는 고정이라 헤더 문자열이 아니라 위치로 읽는다
 * (실제 파일에도 "총지원인원" 헤더가 "총지원지원"으로 오타난 경우가 있어서 이름 일치는 신뢰할 수 없다).
 */
export async function parseAdmissionCutoffExcel(file: File): Promise<ParsedAdmissionCutoffRow[]> {
  const ExcelJSLib = (await import("exceljs")).default;
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJSLib.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.getWorksheet(SHEET_NAME);
  if (!sheet) {
    throw new AdmissionCutoffParseError(
      `"${SHEET_NAME}" 시트를 찾을 수 없습니다. 파일 형식을 확인해 주세요.`,
    );
  }

  const headerRow = sheet.getRow(1).values as ExcelJS.CellValue[];
  const headerCount = headerRow.length - 1;
  if (headerCount < EXPECTED_COLUMN_COUNT) {
    throw new AdmissionCutoffParseError(
      `컬럼 개수가 맞지 않습니다. ${EXPECTED_COLUMN_COUNT}개 컬럼이 필요한데 ${headerCount}개만 발견했습니다.`,
    );
  }

  const rows: ParsedAdmissionCutoffRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const v = row.values as ExcelJS.CellValue[];
    const university = cellToString(v[2]);
    const department = cellToString(v[7]);
    const yearRaw = cellToString(v[3]);
    const year = yearRaw ? Number(yearRaw) : NaN;
    if (!university || !department || !Number.isFinite(year)) return;

    rows.push({
      region: cellToString(v[1]),
      university,
      year,
      admission_period: cellToString(v[4]),
      track: cellToString(v[5]),
      admission_type: cellToString(v[6]),
      department,
      humanities_science: cellToString(v[8]),
      enrollment: cellToString(v[9]),
      competition_rate: cellToString(v[10]),
      additional_pass: cellToString(v[11]),
      converted_50: cellToString(v[12]),
      converted_70: cellToString(v[13]),
      max_score: cellToString(v[14]),
      grade_50: cellToString(v[15]),
      grade_70: cellToString(v[16]),
      korean: cellToString(v[17]),
      math: cellToString(v[18]),
      inquiry: cellToString(v[19]),
      average: cellToString(v[20]),
      english: cellToString(v[21]),
      total_applicants: cellToString(v[22]),
      passers: cellToString(v[23]),
      actual_competition_rate: cellToString(v[24]),
      admission_department: cellToString(v[25]),
      sub_category: cellToString(v[26]),
    });
  });

  if (rows.length === 0) {
    throw new AdmissionCutoffParseError("읽을 수 있는 데이터 행이 없습니다.");
  }

  return rows;
}
