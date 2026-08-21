import { createClient } from "@/lib/supabase/client";

const BUCKET = "wonseo-attachments";

export function buildStoragePath(studentId: string, cardId: string, file: File) {
  const ext = file.name.split(".").pop() ?? "jpg";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  return `${studentId}/${cardId}/${safeName}`;
}

export async function uploadWonseoImage(path: string, file: File) {
  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
}

export async function deleteWonseoImageFile(path: string) {
  const supabase = createClient();
  await supabase.storage.from(BUCKET).remove([path]);
}

export async function getSignedUrl(path: string) {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}
