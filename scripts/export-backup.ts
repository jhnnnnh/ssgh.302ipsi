/**
 * 1회성 스크립트: 현재 Supabase 데이터베이스의 public 스키마 테이블 데이터를
 * 전부 읽어서 SQL INSERT 문 파일로 저장한다(백업용).
 *
 * auth.users(로그인 계정/비밀번호 해시)는 포함하지 않는다 — REST API로 접근할
 * 성격의 데이터가 아니고, 계정 자체는 Supabase Auth Admin API로만 복원 가능하다.
 * profiles.id가 auth.users(id)를 참조하므로, 이 백업만으로 profiles를 빈 DB에
 * 그대로 복원하려면 해당 auth 계정이 먼저 존재해야 한다.
 *
 * 사용법: npx tsx scripts/export-backup.ts [출력파일명]
 *   (기본 출력파일명: backup_YYYYMMDD.sql)
 */
import { writeFileSync } from "fs";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// FK 의존 관계를 고려한 안전한 삽입 순서 (roster -> 그 외 -> wonseo_images는 wonseo_cards 다음)
const TABLES = [
  "roster",
  "app_settings",
  "slot_favorites",
  "counseling_slots",
  "wonseo_cards",
  "wonseo_images",
  "profiles",
] as const;

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function main() {
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
  }

  const outFile =
    process.argv[2] ??
    `backup_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.sql`;

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const lines: string[] = [
    `-- Supabase 데이터 백업 (public 스키마) — ${new Date().toISOString()}`,
    `-- auth.users(로그인 계정)는 포함되지 않음. 자세한 내용은 스크립트 상단 주석 참고.`,
    `begin;`,
    ``,
  ];

  for (const table of TABLES) {
    const { data, error } = await admin.from(table).select("*");
    if (error) {
      throw new Error(`${table} 조회 실패: ${error.message}`);
    }
    const rows = data ?? [];
    lines.push(`-- ${table} (${rows.length}건)`);
    lines.push(`delete from public.${table};`);
    for (const row of rows) {
      const columns = Object.keys(row);
      const values = columns.map((c) => sqlLiteral((row as Record<string, unknown>)[c]));
      lines.push(
        `insert into public.${table} (${columns.join(", ")}) values (${values.join(", ")});`,
      );
    }
    lines.push(``);
    console.log(`${table}: ${rows.length}건`);
  }

  lines.push(`commit;`);

  writeFileSync(outFile, lines.join("\n"), "utf-8");
  console.log(`\n저장 완료: ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
