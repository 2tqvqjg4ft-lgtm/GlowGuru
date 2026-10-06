/**
 * Проверка правил доступа к библиотеке средств (library_products) на реальной базе.
 *
 * Всегда выполняются: проверки для гостя (без входа).
 * Проверки для клиента и специалиста выполняются, если заданы переменные:
 *   TEST_CLIENT_EMAIL, TEST_CLIENT_PASSWORD
 *   TEST_SPECIALIST_EMAIL, TEST_SPECIALIST_PASSWORD
 *
 * Запуск: bunx vitest run tests/library-access.test.ts
 */
import { readFileSync } from "node:fs";
import { describe, it, expect, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function env(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  try {
    const line = readFileSync(".env", "utf8").split("\n").find((l) => l.startsWith(name + "="));
    return line?.slice(name.length + 1).replace(/^"|"$/g, "").trim();
  } catch {
    return undefined;
  }
}

const URL = env("VITE_SUPABASE_URL")!;
const KEY = env("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const TEST_ID = `TEST-RLS-${Date.now()}`;

const newClient = () =>
  createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

async function signedIn(email?: string, password?: string): Promise<SupabaseClient | null> {
  if (!email || !password) return null;
  const c = newClient();
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Не удалось войти как ${email}: ${error.message}`);
  return c;
}

describe("Библиотека средств: гость", () => {
  const anon = newClient();

  it("не видит ни одной записи", async () => {
    const { data } = await anon.from("library_products").select("id").limit(5);
    expect(data ?? []).toHaveLength(0);
  });

  it("не может добавить средство", async () => {
    const { error } = await anon.from("library_products").insert({ id: TEST_ID, name: "Гость" });
    expect(error).not.toBeNull();
  });

  it("не может изменить средство", async () => {
    const { data } = await anon
      .from("library_products")
      .update({ name: "Взлом" })
      .neq("id", "")
      .select("id");
    expect(data ?? []).toHaveLength(0);
  });
});

const clientCreds = [env("TEST_CLIENT_EMAIL"), env("TEST_CLIENT_PASSWORD")] as const;
describe.skipIf(!clientCreds[0])("Библиотека средств: клиент", () => {
  it("может читать библиотеку", async () => {
    const c = (await signedIn(...clientCreds))!;
    const { data, error } = await c.from("library_products").select("id").limit(1);
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it("не может добавить средство", async () => {
    const c = (await signedIn(...clientCreds))!;
    const { error } = await c.from("library_products").insert({ id: TEST_ID + "-c", name: "Клиент" });
    expect(error).not.toBeNull();
  });

  it("не может изменить средство", async () => {
    const c = (await signedIn(...clientCreds))!;
    const { data } = await c.from("library_products").update({ name: "Взлом" }).neq("id", "").select("id");
    expect(data ?? []).toHaveLength(0);
  });
});

const specCreds = [env("TEST_SPECIALIST_EMAIL"), env("TEST_SPECIALIST_PASSWORD")] as const;
describe.skipIf(!specCreds[0])("Библиотека средств: специалист", () => {
  let spec: SupabaseClient | null = null;

  it("может добавить и изменить средство", async () => {
    spec = (await signedIn(...specCreds))!;
    const ins = await spec.from("library_products").insert({ id: TEST_ID, name: "Тест доступа" });
    expect(ins.error).toBeNull();
    const upd = await spec
      .from("library_products")
      .update({ name: "Тест доступа 2" })
      .eq("id", TEST_ID)
      .select("name");
    expect(upd.error).toBeNull();
    expect(upd.data?.[0]?.name).toBe("Тест доступа 2");
  });

  it("не может удалить средство", async () => {
    const { data } = await spec!.from("library_products").delete().eq("id", TEST_ID).select("id");
    expect(data ?? []).toHaveLength(0);
  });

  afterAll(() => {
    if (spec) console.warn(`Тестовая запись ${TEST_ID} осталась в библиотеке (удаление запрещено правилами) — удалите её вручную.`);
  });
});
