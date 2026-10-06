/**
 * Проверка разграничения доступа к данным клиентов на реальной базе.
 * Таблицы: profiles (анкета, телефон), client_cards (карточка кожи),
 * appointments (назначения), messages (сообщения).
 *
 * Всегда выполняются: проверки для гостя.
 * Для клиентов и специалиста нужны переменные:
 *   TEST_CLIENT_EMAIL, TEST_CLIENT_PASSWORD        — клиент А
 *   TEST_CLIENT2_EMAIL, TEST_CLIENT2_PASSWORD      — клиент Б
 *   TEST_SPECIALIST_EMAIL, TEST_SPECIALIST_PASSWORD
 */
import { readFileSync } from "node:fs";
import { describe, it, expect, beforeAll } from "vitest";
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
const newClient = () =>
  createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

async function login(email: string, password: string) {
  const c = newClient();
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Не удалось войти как ${email}: ${error.message}`);
  return { c, id: data.user.id };
}

const PRIVATE_TABLES = ["profiles", "client_cards", "appointments", "messages"] as const;

describe("Данные клиентов: гость", () => {
  const anon = newClient();
  for (const t of PRIVATE_TABLES) {
    it(`не видит записи в ${t}`, async () => {
      const { data } = await anon.from(t).select("*").limit(5);
      expect(data ?? []).toHaveLength(0);
    });
  }
  it("не может создать карточку клиента", async () => {
    const { error } = await anon
      .from("client_cards")
      .insert({ client_id: "00000000-0000-0000-0000-000000000000" });
    expect(error).not.toBeNull();
  });
});

const A = [env("TEST_CLIENT_EMAIL"), env("TEST_CLIENT_PASSWORD")];
const B = [env("TEST_CLIENT2_EMAIL"), env("TEST_CLIENT2_PASSWORD")];
const S = [env("TEST_SPECIALIST_EMAIL"), env("TEST_SPECIALIST_PASSWORD")];
const hasClients = !!(A[0] && A[1] && B[0] && B[1]);

describe.skipIf(!hasClients)("Данные клиентов: клиент не видит чужое", () => {
  let a: { c: SupabaseClient; id: string };
  let b: { c: SupabaseClient; id: string };
  beforeAll(async () => {
    a = await login(A[0]!, A[1]!);
    b = await login(B[0]!, B[1]!);
  });

  it("видит свою анкету", async () => {
    const { data } = await a.c.from("profiles").select("id").eq("id", a.id);
    expect(data).toHaveLength(1);
  });

  for (const [t, col] of [
    ["profiles", "id"],
    ["client_cards", "client_id"],
    ["appointments", "client_id"],
    ["messages", "client_id"],
  ] as const) {
    it(`не видит чужие записи в ${t}, даже подставив id другого клиента`, async () => {
      const { data } = await a.c.from(t).select("*").eq(col, b.id);
      expect(data ?? []).toHaveLength(0);
    });
    it(`в ${t} получает только свои строки`, async () => {
      const { data } = await a.c.from(t).select(col);
      for (const row of (data ?? []) as Record<string, string>[]) expect(row[col]).toBe(a.id);
    });
  }

  it("не может изменить чужую анкету", async () => {
    const { data } = await a.c.from("profiles").update({ full_name: "Взлом" }).eq("id", b.id).select("id");
    expect(data ?? []).toHaveLength(0);
  });

  it("не может создать назначение на чужое имя", async () => {
    const { error } = await a.c
      .from("appointments")
      .insert({ client_id: b.id, starts_at: new Date().toISOString() });
    expect(error).not.toBeNull();
  });

  it("не может сам себе создать или изменить карточку", async () => {
    const { error } = await a.c.from("client_cards").insert({ client_id: a.id, notes: "сам" });
    expect(error).not.toBeNull();
  });

  it("не может присвоить себе роль специалиста", async () => {
    const { error } = await a.c.from("user_roles").insert({ user_id: a.id, role: "specialist" });
    expect(error).not.toBeNull();
  });
});

describe.skipIf(!(hasClients && S[0] && S[1]))("Данные клиентов: специалист", () => {
  let s: { c: SupabaseClient; id: string };
  let clientId: string;
  beforeAll(async () => {
    s = await login(S[0]!, S[1]!);
    clientId = (await login(A[0]!, A[1]!)).id;
  });

  it("видит анкету клиента", async () => {
    const { data } = await s.c.from("profiles").select("id").eq("id", clientId);
    expect(data).toHaveLength(1);
  });

  it("создаёт и редактирует карточку клиента", async () => {
    const note = `тест ${Date.now()}`;
    const { error } = await s.c.from("client_cards").upsert({ client_id: clientId, notes: note });
    expect(error).toBeNull();
    const { data } = await s.c.from("client_cards").select("notes").eq("client_id", clientId).single();
    expect(data?.notes).toBe(note);
  });

  it("создаёт и удаляет назначение клиенту", async () => {
    const { data, error } = await s.c
      .from("appointments")
      .insert({ client_id: clientId, starts_at: new Date().toISOString(), specialist_notes: "тест" })
      .select("id")
      .single();
    expect(error).toBeNull();
    const del = await s.c.from("appointments").delete().eq("id", data!.id).select("id");
    expect(del.data).toHaveLength(1);
  });
});
