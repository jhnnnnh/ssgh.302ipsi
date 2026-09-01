import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdmissionOffering } from "@/lib/database.types";

type IncomingRow = Omit<AdmissionOffering, "id" | "created_at" | "uploaded_at">;

/**
 * 이투스 전형데이터 엑셀은 브라우저에서 exceljs로 파싱한 뒤 이 라우트로 여러 번(청크
 * 단위) 나눠 올린다. 기존 admission_cutoffs/admission_methods처럼 "첫 청크에서 전체
 * delete"하지 않는다 — 그 방식은 업로드 도중 실패하면 데이터가 통째로 비는 위험이 있다.
 * 대신 offering_code를 키로 upsert하고(같은 배치 시각으로 uploaded_at을 찍는다), 마지막
 * 청크가 성공하면 이번 배치에서 손대지 않은(=새 파일에 없는) 행만 지운다. 중간에 실패해도
 * 이전 데이터는 그대로 남는다.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const rows = body?.rows as IncomingRow[] | undefined;
  const batchUploadedAt = body?.batchUploadedAt as string | undefined;
  const isLast = Boolean(body?.isLast);

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "저장할 데이터가 없습니다." }, { status: 400 });
  }
  if (!batchUploadedAt || Number.isNaN(Date.parse(batchUploadedAt))) {
    return NextResponse.json({ error: "업로드 배치 정보가 올바르지 않습니다." }, { status: 400 });
  }

  const cleaned = [];
  for (const row of rows) {
    const university = typeof row.university === "string" ? row.university.trim() : "";
    const department = typeof row.department === "string" ? row.department.trim() : "";
    const admissionType = typeof row.admission_type === "string" ? row.admission_type.trim() : "";
    const offeringCode = typeof row.offering_code === "string" ? row.offering_code.trim() : "";
    if (!university || !department || !admissionType || !offeringCode) {
      return NextResponse.json({ error: "행 데이터 형식이 올바르지 않습니다." }, { status: 400 });
    }
    cleaned.push({
      ...row,
      university,
      department,
      admission_type: admissionType,
      offering_code: offeringCode,
      uploaded_at: batchUploadedAt,
    });
  }

  const adminClient = createAdminClient();

  const { error: upsertError } = await adminClient
    .from("admission_offerings")
    .upsert(cleaned, { onConflict: "offering_code" });
  if (upsertError) {
    return NextResponse.json({ error: "저장에 실패했습니다." }, { status: 500 });
  }

  if (isLast) {
    const { error: pruneError } = await adminClient
      .from("admission_offerings")
      .delete()
      .neq("uploaded_at", batchUploadedAt);
    if (pruneError) {
      return NextResponse.json({ error: "이전 데이터 정리에 실패했습니다." }, { status: 500 });
    }
  }

  return NextResponse.json({ count: cleaned.length });
}
