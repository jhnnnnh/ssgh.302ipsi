import type ExcelJS from "exceljs";

export class AdmissionOfferingParseError extends Error {}

export type ParsedOfferingRow = {
  offering_code: string;
  university: string;
  department: string;
  admission_type: string;
  admission_type_group: string | null;
  track: string;
  plan_kind: string | null;
  field: string | null;
  field_detail: string | null;
  enrollment: number | null;
  selection_model: string;
  method_text: string | null;
  method_academic_quant: number | null;
  method_academic_qual: number | null;
  method_interview: number | null;
  method_essay: number | null;
  method_practical: number | null;
  method_document: number | null;
  method_stage1_score: number | null;
  method_etc: number | null;
  min_standard_applied: string | null;
  min_standard_text: string | null;
  raw: Record<string, unknown>;
};

const SHEET_NAME = "전형데이터";

/** 1부터 시작하는 열 번호 → 헤더 이름. 엑셀의 93개 열 순서 그대로. */
const HEADERS = [
  "식별 CODE", "No1", "대학명", "전형유형", "정원구분", "세부전형명", "중심전형", "계열", "상세계열",
  "모집단위명", "소재지", "모집인원", "세부전공", "사정모형", "선발비율", "전형총점", "비율유형",
  "전형방법", "학생부(정량)", "학생부 (정성)", "면접", "논술", "실기", "서류", "1단계성적", "기타",
  "기타(서류)내역", "지원자격졸업년도", "지원자격", "학생부활용지표", "교과_반영학기", "학년별-1학년",
  "학년별-2학년", "학년별-3학년", "학년별-1:2학년", "학년별-2:3학년", "학년별-1:2:3학년",
  "학년별-1:3학년", "교과_비율", "비교과_비율", "비교과항목", "교과_등급점수_1등급",
  "교과_등급점수_2등급", "교과_등급점수_3등급", "교과_등급점수_4등급", "교과_등급점수_5이내",
  "교과_등급점수_6등급", "교과_등급점수_7등급", "교과_등급점수_8등급", "교과_등급점수_9등급",
  "반영 교과(진로선택과목포함)", "진로선택과목 반영 방법", "학생부 특이사항", "비교내신_반영_졸업년도",
  "최저학력기준_반영여부", "전영역 응시여부", "필수응시 과목", "탐구반영  방법", "제2외/한 대체여부",
  "최저학력기준 내용", "현장원서접수_시작", "현장원서접수_종료", "인터넷원서접수_시작",
  "인터넷원서접수_종료", "원서접수  마감시간", "논술시기_시작", "논술시기_종료", "면접시기_시작",
  "면접시기_종료", "실기시기_시작", "실기시기_종료", "서류제출기한_종료", "합격자발표시기",
  "기타_시작", "기타_종료", "기타내역", "논술 시작시간", "논술 출제유형(95)", "논술 문항수 및 분량(80)",
  "논술 응시시간", "논술 평가방법", "면접 점수 반영/미반영", "면접 시작시간", "면접 유형",
  "면접시 활용자료", "면접 진행방식", "면접 평가내용", "서류종류", "서류 평가요소", "학종_학업역량",
  "학종_진로역량(전공적합성)", "학종_공동체역량(인성)", "학종_자기계발역량(자기주도성)",
] as const;

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

function cellToNumber(v: ExcelJS.CellValue): number | null {
  if (typeof v === "number") return v;
  const s = cellToString(v);
  if (s == null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export type ParsedOfferingExcel = {
  rows: ParsedOfferingRow[];
  /** 같은 "식별 CODE"가 파일 안에서 두 번 이상 나온 행 수(마지막 값으로 대체됨). */
  duplicateCodeCount: number;
};

/**
 * 이투스 "2027학년도 수시전형모음" 형식 엑셀에서 "전형데이터" 시트(93열)를 읽는다. 헤더
 * 순서가 하나라도 어긋나면 어느 열이 문제인지 구체적으로 알려주는 에러를 던진다. 식별
 * CODE가 파일 안에서 중복되면(원본 데이터 자체의 드문 오류) 마지막 행 값으로 통일해서
 * 업로드가 유니크 제약에 걸리지 않게 한다.
 */
export async function parseAdmissionOfferingExcel(file: File): Promise<ParsedOfferingExcel> {
  const ExcelJSLib = (await import("exceljs")).default;
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJSLib.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.getWorksheet(SHEET_NAME);
  if (!sheet) {
    throw new AdmissionOfferingParseError(`"${SHEET_NAME}" 시트를 찾을 수 없습니다. 파일 형식을 확인해 주세요.`);
  }

  const headerRow = sheet.getRow(1);
  HEADERS.forEach((expected, i) => {
    const got = cellToString(headerRow.getCell(i + 1).value);
    if (got !== expected) {
      throw new AdmissionOfferingParseError(
        `"${SHEET_NAME}" 시트의 ${i + 1}번째 열이 "${expected}"이어야 하는데 "${got ?? "(비어 있음)"}"입니다. 컬럼 구성을 확인해 주세요.`,
      );
    }
  });

  const byCode = new Map<string, ParsedOfferingRow>();
  let duplicateCodeCount = 0;
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const raw: Record<string, unknown> = {};
    HEADERS.forEach((header, i) => {
      raw[header] = cellToString(row.getCell(i + 1).value);
    });

    const offering_code = cellToString(row.getCell(1).value);
    const university = cellToString(row.getCell(3).value);
    const department = cellToString(row.getCell(10).value);
    const admission_type = cellToString(row.getCell(6).value);
    const track = cellToString(row.getCell(7).value);
    const selection_model = cellToString(row.getCell(14).value);
    if (!offering_code || !university || !department || !admission_type || !track || !selection_model) return;

    if (byCode.has(offering_code)) duplicateCodeCount++;
    byCode.set(offering_code, {
      offering_code,
      university,
      department,
      admission_type,
      admission_type_group: cellToString(row.getCell(4).value),
      track,
      plan_kind: cellToString(row.getCell(5).value),
      field: cellToString(row.getCell(8).value),
      field_detail: cellToString(row.getCell(9).value),
      enrollment: cellToNumber(row.getCell(12).value),
      selection_model,
      method_text: cellToString(row.getCell(18).value),
      method_academic_quant: cellToNumber(row.getCell(19).value),
      method_academic_qual: cellToNumber(row.getCell(20).value),
      method_interview: cellToNumber(row.getCell(21).value),
      method_essay: cellToNumber(row.getCell(22).value),
      method_practical: cellToNumber(row.getCell(23).value),
      method_document: cellToNumber(row.getCell(24).value),
      method_stage1_score: cellToNumber(row.getCell(25).value),
      method_etc: cellToNumber(row.getCell(26).value),
      min_standard_applied: cellToString(row.getCell(55).value),
      min_standard_text: cellToString(row.getCell(60).value),
      raw,
    });
  });

  if (byCode.size === 0) {
    throw new AdmissionOfferingParseError("읽을 수 있는 데이터 행이 없습니다.");
  }

  return { rows: Array.from(byCode.values()), duplicateCodeCount };
}
