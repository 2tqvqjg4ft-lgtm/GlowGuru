import { supabase } from "@/integrations/supabase/client";

const BUCKET = "client-photos";

/** Загружает фото в закрытое хранилище в папку клиента. Возвращает путь и временную ссылку для показа. */
export async function uploadClientPhoto(clientId: string, file: File): Promise<{ path: string; url: string }> {
  if (!file.type.startsWith("image/")) throw new Error("Можно загрузить только изображение");
  if (file.size > 10 * 1024 * 1024) throw new Error("Фото больше 10 МБ");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${clientId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw new Error("Не удалось загрузить фото");
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  return { path, url: data?.signedUrl ?? URL.createObjectURL(file) };
}

/** Временные ссылки на фото (действуют 1 час). */
export async function signPhotos(paths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!paths.length) return map;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
  for (const r of data ?? []) if (r.path && r.signedUrl) map.set(r.path, r.signedUrl);
  return map;
}
