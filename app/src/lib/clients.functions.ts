import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Безвозвратное удаление клиентки: фото, все связанные данные и аккаунт. Только специалист. */
export const deleteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ clientId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isSpec } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "specialist" });
    if (!isSpec) throw new Error("Только специалист может удалять клиентов");
    if (data.clientId === context.userId) throw new Error("Нельзя удалить собственный аккаунт");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", data.clientId);
    if (roles?.some((r) => r.role === "specialist")) throw new Error("Аккаунт специалиста удалить нельзя");
    if (!roles?.some((r) => r.role === "client")) throw new Error("Клиент не найден");

    // Фото из закрытого хранилища (папка = ID клиентки)
    const bucket = supabaseAdmin.storage.from("client-photos");
    for (;;) {
      const { data: files, error } = await bucket.list(data.clientId, { limit: 100 });
      if (error) throw new Error("Не удалось получить фото");
      if (!files?.length) break;
      const { error: rmErr } = await bucket.remove(files.map((f) => `${data.clientId}/${f.name}`));
      if (rmErr) throw new Error("Не удалось удалить фото");
      if (files.length < 100) break;
    }

    const id = data.clientId;
    const del = async (table: string, col: string) => {
      const { error } = await (supabaseAdmin.from as any)(table).delete().eq(col, id);
      if (error) throw new Error(`Не удалось удалить данные (${table})`);
    };
    await del("messages", "client_id");
    await del("appointments", "client_id");
    await del("published_plans", "client_id");
    await del("client_plans", "client_id");
    await del("client_journal", "client_id");
    await del("questionnaires", "client_id");
    await del("client_cards", "client_id");
    await del("scheduled_pushes", "user_id");
    await del("push_tokens", "user_id");
    await del("notification_settings", "user_id");

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw new Error("Не удалось удалить аккаунт");
    return { ok: true };
  });
