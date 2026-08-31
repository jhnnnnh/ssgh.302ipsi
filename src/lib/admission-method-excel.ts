import type ExcelJS from "exceljs";
import type { AdmissionMethodCategory } from "@/lib/database.types";

export class AdmissionMethodParseError extends Error {}

export type ParsedAdmissionMethodRow = {
  category: AdmissionMethodCategory;
  region: string | null;
  area: string;
  university: string;
  admission_type: string;
  method: string | null;
  min_standard: string | null;
  note: string | null;
  review_elements: string | null;
};

type SheetSpec = {
  category: AdmissionMethodCategory;
  headers: string[];
  /** 헤더 위치(1부터) → ParsedAdmissionMethodRow 필드 매핑. */
  map: (v: ExcelJS.CellValue[]) => Omit<ParsedAdmissionMethodRow, "category">;
};

const SHEET_SPECS: SheetSpec[] = [
  {
    category: "학생부교과전형",
    headers: ["권역", "지역", "대학명", "전형명", "전형방법", "수능최저학력기준", "비고"],
    map: (v) => ({
      region: cellToString(v[1]),
      area: cellToString(v[2]) ?? "",
      university: cellToString(v[3]) ?? "",
      admission_type: cellToString(v[4]) ?? "",
      method: cellToString(v[5]),
      min_standard: cellToString(v[6]),
      note: cellToString(v[7]),
      review_elements: null,
    }),
  },
  {
    category: "학생부종합전형",
    headers: ["권역", "지역", "대학명", "전형명", "전형방법(1단계→2단계)", "수능최저학력기준", "서류평가요소"],
    map: (v) => ({
      region: cellToString(v[1]),
      area: cellToString(v[2]) ?? "",
      university: cellToString(v[3]) ?? "",
      admission_type: cellToString(v[4]) ?? "",
      method: cellToString(v[5]),
      min_standard: cellToString(v[6]),
      note: null,
      review_elements: cellToString(v[7]),
    }),
  },
  {
    category: "논술전형",
    headers: ["지역", "대학명", "전형명", "전형방법", "수능최저학력기준", "비고"],
    map: (v) => ({
      region: null,
      area: cellToString(v[1]) ?? "",
      university: cellToString(v[2]) ?? "",
      admission_type: cellToString(v[3]) ?? "",
      method: cellToString(v[4]),
      min_standard: cellToString(v[5]),
      note: cellToString(v[6]),
      review_elements: null,
    }),
  },
];

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

function checkHeader(sheetName: string, expected: string[], actual: ExcelJS.CellValue[]) {
  for (let i = 0; i < expected.length; i++) {
    const got = cellToString(actual[i + 1]);
    if (got !== expected[i]) {
      throw new AdmissionMethodParseError(
        `"${sheetName}" 시트의 ${i + 1}번째 컬럼이 "${expected[i]}"이어야 하는데 "${got ?? "(비어 있음)"}"입니다. 컬럼 구성을 확인해 주세요.`,
      );
    }
  }
}

/**
 * "전형방법/수능최저학력기준 참고자료" 형식 엑셀에서 학생부교과전형/학생부종합전형/논술전형
 * 3개 시트를 읽어 한 배열로 합친다. 시트 이름이나 컬럼 구성이 하나라도 안 맞으면
 * 어느 시트·어느 컬럼이 문제인지 구체적으로 알려주는 에러를 던진다. "사용안내" 같은
 * 다른 시트가 있어도 무시하고 지나간다.
 */
export async function parseAdmissionMethodExcel(file: File): Promise<ParsedAdmissionMethodRow[]> {
  const ExcelJSLib = (await import("exceljs")).default;
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJSLib.Workbook();
  await workbook.xlsx.load(buffer);

  const rows: ParsedAdmissionMethodRow[] = [];

  for (const spec of SHEET_SPECS) {
    const sheet = workbook.getWorksheet(spec.category);
    if (!sheet) {
      throw new AdmissionMethodParseError(`"${spec.category}" 시트를 찾을 수 없습니다. 파일 형식을 확인해 주세요.`);
    }
    const headerRow = sheet.getRow(1).values as ExcelJS.CellValue[];
    checkHeader(spec.category, spec.headers, headerRow);

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const v = row.values as ExcelJS.CellValue[];
      const mapped = spec.map(v);
      if (!mapped.university || !mapped.admission_type) return;
      rows.push({ category: spec.category, ...mapped });
    });
  }

  if (rows.length === 0) {
    throw new AdmissionMethodParseError("읽을 수 있는 데이터 행이 없습니다.");
  }

  return rows;
}
