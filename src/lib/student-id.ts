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

/**
 * 명단 붙여넣기 한 줄에서 학번+이름을 뽑아낸다. 학번은 항상 5자리 숫자이므로
 * 줄 맨 앞의 5자리 숫자를 학번으로 보고, 그 뒤에 어떤 구분자(공백/쉼표/대시/
 * 콜론 등)가 오든, 심지어 구분자 없이 바로 붙어 있어도 나머지를 이름으로 인식한다.
 * 예: "30225 홍길동", "30225,홍길동", "30225-홍길동", "30225\t홍길동", "30225홍길동" 전부 인식됨.
 */
export function parseRosterLine(line: string): { student_id: string; name: string } | null {
  const trimmed = line.trim();
  const match = trimmed.match(/^(\d{5})[\s,.\-:_/·|]*(.+)$/);
  if (!match) return null;
  const studentId = match[1];
  const name = match[2].trim();
  if (!name) return null;
  return { student_id: studentId, name };
}
