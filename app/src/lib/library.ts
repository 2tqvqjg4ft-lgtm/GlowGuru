import { supabase } from "@/integrations/supabase/client";
import type { Product } from "./demo-data";

export const CSV_COLUMNS = [
  "id", "brand", "name", "category", "subcategory", "directions", "photo_url",
  "description", "key_ingredients", "inci", "usage_rules", "specialist_notes", "has_active",
] as const;

type Row = {
  id: string; brand: string; name: string; category: string; subcategory: string;
  directions: string[]; photo_url: string | null; description: string; key_ingredients: string;
  inci: string; usage_rules: string; specialist_notes: string; has_active: boolean; archived?: boolean;
};

export const rowToProduct = (r: Row): Product => ({
  id: r.id, brand: r.brand, name: r.name, category: r.category, subcategory: r.subcategory,
  directions: r.directions ?? [], image: r.photo_url ?? undefined, description: r.description || undefined,
  actives: r.key_ingredients, inci: r.inci, instruction: r.usage_rules, specialistNotes: r.specialist_notes,
  active: r.has_active, archived: !!r.archived,
});

export const productToRow = (p: Product): Row => ({
  id: p.id, brand: p.brand, name: p.name, category: p.category, subcategory: p.subcategory ?? "",
  directions: p.directions ?? [], photo_url: p.image ?? null, description: p.description ?? "",
  key_ingredients: p.actives, inci: p.inci ?? "", usage_rules: p.instruction,
  specialist_notes: p.specialistNotes ?? "", has_active: p.active, archived: !!p.archived,
});

const TABLE = "library_products" as never;

export async function fetchProducts(): Promise<Product[]> {
  const all: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(TABLE).select("*").order("created_at").range(from, from + 999);
    if (error) throw error;
    all.push(...((data ?? []) as unknown as Row[]));
    if (!data || data.length < 1000) break;
  }
  return all.map(rowToProduct);
}

export async function upsertProducts(list: Product[]) {
  for (let i = 0; i < list.length; i += 200) {
    const { error } = await supabase.from(TABLE).upsert(list.slice(i, i + 200).map(productToRow) as never);
    if (error) throw error;
  }
}

/** Простой CSV-парсер с поддержкой кавычек, ; или , как разделителя. */
export function parseCsv(text: string): string[][] {
  text = text.replace(/^\uFEFF/, "");
  const first = text.split(/\r?\n/)[0] ?? "";
  const sep = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

export type ImportRow = { line: number; product?: Product; errors: string[]; status: "new" | "update" | "similar" | "error"; similarTo?: string };

const norm = (s: string) => s.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "");

export function analyzeCsv(text: string, existing: Product[]): ImportRow[] {
  const rows = parseCsv(text);
  const header = (rows.shift() ?? []).map((h) => h.trim().toLowerCase());
  const idx = (k: string) => header.indexOf(k);
  const byId = new Map(existing.map((p) => [p.id, p]));
  const byName = new Map(existing.map((p) => [norm(p.brand) + "|" + norm(p.name), p]));
  const seen = new Set<string>();
  return rows.map((r, i) => {
    const get = (k: string) => (idx(k) >= 0 ? (r[idx(k)] ?? "").trim() : "");
    const errors: string[] = [];
    const id = get("id"), name = get("name");
    if (idx("id") < 0 || idx("name") < 0) errors.push("нет колонок id или name");
    if (!id) errors.push("пустой id");
    if (!name) errors.push("пустое название");
    if (id && seen.has(id)) errors.push("id повторяется в файле");
    if (id) seen.add(id);
    const photo = get("photo_url");
    if (photo && !/^https?:\/\//.test(photo)) errors.push("photo_url должен начинаться с http");
    const line = i + 2;
    if (errors.length) return { line, errors, status: "error" as const };
    const product: Product = {
      id, name, brand: get("brand"), category: get("category").replace(/\s+/g, " ") || "Без категории", subcategory: get("subcategory"),
      directions: get("directions").split(/[;|]/).map((s) => s.trim()).filter(Boolean),
      image: photo || undefined, description: get("description") || undefined, actives: get("key_ingredients"),
      inci: get("inci"), instruction: get("usage_rules"), specialistNotes: get("specialist_notes"),
      active: /^(1|да|yes|true)$/i.test(get("has_active")),
    };
    if (byId.has(id)) return { line, product, errors, status: "update" as const };
    const sim = byName.get(norm(product.brand) + "|" + norm(name));
    if (sim) return { line, product, errors, status: "similar" as const, similarTo: `${sim.brand} — ${sim.name} (${sim.id})` };
    return { line, product, errors, status: "new" as const };
  });
}

/** Уменьшает фото до 800px и возвращает JPEG data URL. */
export function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 800 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.82));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/** Используется ли средство в чьей-либо схеме (черновик или опубликованная). */
export async function isProductUsed(id: string): Promise<boolean> {
  const [a, b] = await Promise.all([
    supabase.from("client_plans").select("data"),
    supabase.from("published_plans").select("data"),
  ]);
  if (a.error || b.error) throw a.error ?? b.error;
  const needle = `"productId":${JSON.stringify(id)}`;
  return [...(a.data ?? []), ...(b.data ?? [])].some((r) => JSON.stringify(r.data).includes(needle));
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}
