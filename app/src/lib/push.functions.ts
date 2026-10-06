import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendPushToUser } from "./push.server";

export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sent = await sendPushToUser(context.userId, "GLOWGURU", "Уведомления включены — так будут выглядеть напоминания.");
    return { sent };
  });

export const sendSpecialistMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ clientId: z.string().uuid(), body: z.string().trim().min(1).max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isSpec } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "specialist" });
    if (!isSpec) throw new Error("Только специалист может отправлять сообщения");
    const { error } = await context.supabase
      .from("messages")
      .insert({ client_id: data.clientId, sender_id: context.userId, body: data.body });
    if (error) throw new Error(error.message);

    // Уведомление и push создаются автоматически в базе (с учётом настроек клиентки)
    return { sent: 0 };
  });

export const notifyPlanPublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ clientId: z.string().uuid(), first: z.boolean(), changes: z.array(z.string().max(400)).max(50) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isSpec } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "specialist" });
    if (!isSpec) throw new Error("Только специалист может уведомлять о схеме");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const title = data.first ? "Ваш план ухода готов" : "Ваш план ухода обновлён";
    const body = data.changes.length ? data.changes.slice(0, 6).join(" ") : "Специалист опубликовал для вас схему ухода.";
    // Одно уведомление на публикацию; в центре уведомлений оно остаётся всегда, push — по настройке «Изменения схемы»
    const { error } = await supabaseAdmin.rpc("notify_user" as never, {
      _user: data.clientId, _type: "plan", _title: title, _body: body, _etype: "plan", _eid: data.clientId,
      _client: data.clientId, _setting: "plan", _path: "/client",
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
