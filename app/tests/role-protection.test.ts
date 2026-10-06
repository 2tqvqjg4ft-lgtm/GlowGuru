/**
 * Проверка защиты ролей на реальной базе: новый пользователь не может
 * самостоятельно стать специалистом и получить доступ к чужим карточкам.
 * Таблица user_roles, триггер handle_new_user, политики profiles/client_cards.
 *
 * Всегда выполняются: проверки для гостя и для свежезарегистрированного
 * пользователя (создаётся случайная учётная запись; если включено
 * подтверждение почты и сессия не выдаётся сразу — тесты регистрации
 * пропускаются с предупреждением).
 * Проверки для существующего клиента выполняются, если заданы переменные:
 *   TEST_CLIENT_EMAIL, TEST_CLIENT_PASSWORD
 *
 * Запуск: bunx vitest run tests/role-protection.test.ts
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

describe("Роли: гость", () => {
  const anon = newClient();

  it("не видит таблицу ролей", async () => {
    const { data } = await anon.from("user_roles").select("*").limit(5);
    expect(data ?? []).toHaveLength(0);
  });

  it("не может вставить роль", async () => {
    const { error } = await anon
      .from("user_roles")
      .insert({ user_id: "00000000-0000-0000-0000-000000000000", role: "specialist" });
    expect(error).not.toBeNull();
  });
});

// --- Свежая регистрация: новый пользователь не должен получить specialist ---
const freshEmail = `test-role-${Date.now()}@mailinator.com`;
const freshPassword = `Tst-${Math.random().toString(36).slice(2)}!9`;
let fresh: { c: SupabaseClient; id: string } | null = null;

describe("Роли: новый пользователь", () => {
  beforeAll(async () => {
    const c = newClient();
    const { data, error } = await c.auth.signUp({
      email: freshEmail,
      password: freshPassword,
      options: { data: { full_name: "Тест Ролей" } },
    });
    if (error) throw new Error(`Регистрация не удалась: ${error.message}`);
    if (!data.session) {
      console.warn(
        "Регистрация требует подтверждения почты — тесты нового пользователя пропущены. " +
          "Проверьте их вручную или отключите подтверждение для тестового прогона.",
      );
      return;
    }
    fresh = { c, id: data.user!.id };
  });

  it("после регистрации автоматически получает роль client, а не specialist", async () => {
    if (!fresh) return;
    // триггер handle_new_user срабатывает асинхронно относительно signUp — ждём
    let roles: { role: string }[] = [];
    for (let i = 0; i < 10; i++) {
      const { data } = await fresh.c.from("user_roles").select("role").eq("user_id", fresh.id);
      roles = (data ?? []) as { role: string }[];
      if (roles.length > 0) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    expect(roles.map((r) => r.role)).toEqual(["client"]);
  });

  it("не может присвоить себе роль specialist", async () => {
    if (!fresh) return;
    const { error } = await fresh.c.from("user_roles").insert({ user_id: fresh.id, role: "specialist" });
    expect(error).not.toBeNull();
    const { data } = await fresh.c.from("user_roles").select("role").eq("user_id", fresh.id);
    expect((data ?? []).map((r) => r.role)).not.toContain("specialist");
  });

  it("не может повысить свою роль через update", async () => {
    if (!fresh) return;
    const { data } = await fresh.c
      .from("user_roles")
      .update({ role: "specialist" })
      .eq("user_id", fresh.id)
      .select("role");
    expect(data ?? []).toHaveLength(0);
    const { data: after } = await fresh.c.from("user_roles").select("role").eq("user_id", fresh.id);
    expect((after ?? []).map((r) => r.role)).toEqual(["client"]);
  });

  it("не может удалить чужую роль или вставить роль другому пользователю", async () => {
    if (!fresh) return;
    const del = await fresh.c.from("user_roles").delete().neq("user_id", fresh.id).select("id");
    expect(del.data ?? []).toHaveLength(0);
    const ins = await fresh.c
      .from("user_roles")
      .insert({ user_id: "00000000-0000-0000-0000-000000000000", role: "specialist" });
    expect(ins.error).not.toBeNull();
  });

  it("без роли specialist не видит чужие анкеты и карточки", async () => {
    if (!fresh) return;
    const profiles = await fresh.c.from("profiles").select("id").neq("id", fresh.id);
    expect(profiles.data ?? []).toHaveLength(0);
    const cards = await fresh.c.from("client_cards").select("client_id").neq("client_id", fresh.id);
    expect(cards.data ?? []).toHaveLength(0);
    const appts = await fresh.c.from("appointments").select("id").neq("client_id", fresh.id);
    expect(appts.data ?? []).toHaveLength(0);
  });
});

// --- Существующий клиент: те же запреты на учётной записи из переменных ---
const creds = [env("TEST_CLIENT_EMAIL"), env("TEST_CLIENT_PASSWORD")] as const;
describe.skipIf(!creds[0])("Роли: зарегистрированный клиент", () => {
  let client: { c: SupabaseClient; id: string };
  beforeAll(async () => {
    const c = newClient();
    const { data, error } = await c.auth.signInWithPassword({ email: creds[0]!, password: creds[1]! });
    if (error) throw new Error(`Не удалось войти: ${error.message}`);
    client = { c, id: data.user.id };
  });

  it("видит только свою роль", async () => {
    const { data } = await client.c.from("user_roles").select("user_id");
    for (const row of (data ?? []) as { user_id: string }[]) expect(row.user_id).toBe(client.id);
  });

  it("не может присвоить себе specialist ни insert, ни update", async () => {
    const ins = await client.c.from("user_roles").insert({ user_id: client.id, role: "specialist" });
    expect(ins.error).not.toBeNull();
    const upd = await client.c
      .from("user_roles")
      .update({ role: "specialist" })
      .eq("user_id", client.id)
      .select("role");
    expect(upd.data ?? []).toHaveLength(0);
  });
});
