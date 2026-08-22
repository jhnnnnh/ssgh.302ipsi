/**
 * 학번 5자리 규칙: 1번째 자리 학년 / 2번째 자리는 항상 0(고정값, 무시) /
 * 3번째 자리 반(1~9) / 4~5번째 자리 번호.
 * 예: 30225 → 3학년 2반 25번
 */
export type ParsedStudentId = {
  grade: number;
  classNo: number;
  number: number;
};

export function parseStudentId(studentId: string): ParsedStudentId | null {
  if (!/^[0-9]{5}$/.test(studentId)) return null;
  return {
    grade: Number(studentId[0]),
    classNo: Number(studentId[2]),
    number: Number(studentId.slice(3, 5)),
  };
}

export function formatClassLabel(grade: number, classNo: number) {
  return `${grade}학년 ${classNo}반`;
}
