import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdmissionMethodCategory } from "@/lib/database.types";

type IncomingRow = {
  category: AdmissionMethodCategory;
  region: string | null;
  area: unknown;
  university: unknown;
  admission_type: unknown;
  method: string | null;
  min_standard: string | null;
  note: string | null;
  review_elements: string | null;
};

/**
 * 전형정보 엑셀은 브라우저에서 exceljs로 파싱한 뒤 이 라우트로 여러 번(청크 단위) 나눠 올린다.
 * 첫 청크(isFirst)에서만 기존 데이터를 통째로 비우고, 이후 청크는 그대로 추가한다.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const rows = body?.rows as IncomingRow[] | undefined;
  const isFirst = Boolean(body?.isFirst);

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "저장할 데이터가 없습니다." }, { status: 400 });
  }

  const cleaned = [];
  for (const row of rows) {
    const area = typeof row.area === "string" ? row.area.trim() : "";
    const university = typeof row.university === "string" ? row.university.trim() : "";
    const admissionType = typeof row.admission_type === "string" ? row.admission_type.trim() : "";
    if (!area || !university || !admissionType) {
      return NextResponse.json({ error: "행 데이터 형식이 올바르지 않습니다." }, { status: 400 });
    }
    cleaned.push({ ...row, area, university, admission_type: admissionType });
  }

  const adminClient = createAdminClient();

  if (isFirst) {
    const { error: deleteError } = await adminClient
      .from("admission_methods")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (deleteError) {
      return NextResponse.json({ error: "기존 데이터 삭제에 실패했습니다." }, { status: 500 });
    }
  }

  const { error: insertError } = await adminClient.from("admission_methods").insert(cleaned);
  if (insertError) {
    return NextResponse.json({ error: "저장에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ count: cleaned.length });
}
