import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/push-dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const provided = /^Bearer (\S+)$/.exec(request.headers.get("authorization") ?? "")?.[1] ?? "";
        const { data: tok } = await supabaseAdmin.from("dispatch_tokens").select("token").eq("id", 1).maybeSingle();
        const { createHash, timingSafeEqual } = await import("node:crypto");
        const h = (v: string) => createHash("sha256").update(v).digest();
        if (!tok?.token || !provided || !timingSafeEqual(h(provided), h(tok.token)))
          return new Response("Unauthorized", { status: 401 });
        const { sendPushToUser } = await import("@/lib/push.server");
        const now = new Date();
        const { data: due, error } = await supabaseAdmin
          .from("scheduled_pushes")
          .select("id, user_id, title, body, kind, path")
          .is("sent_at", null)
          .lte("send_at", now.toISOString())
          .gte("send_at", new Date(now.getTime() - 2 * 3600_000).toISOString())
          .limit(200);
        if (error) return new Response(error.message, { status: 500 });
        let sent = 0;
        for (const p of due ?? []) {
          // помечаем заранее, чтобы не отправить дважды
          const { data: claimed } = await supabaseAdmin
            .from("scheduled_pushes")
            .update({ sent_at: now.toISOString() })
            .eq("id", p.id)
            .is("sent_at", null)
            .select("id");
          if (!claimed?.length) continue;
          // Напоминания по уходу и о фото тоже попадают в центр уведомлений
          if (p.kind !== "event") {
            await supabaseAdmin.from("notifications").insert({
              user_id: p.user_id, type: p.kind === "photo" ? "photo_reminder" : "reminder", title: p.title, body: p.body,
              entity_type: p.kind === "photo" ? "photos" : "today", entity_id: null, client_id: p.user_id,
            } as never);
          }
          try {
            sent += await sendPushToUser(p.user_id, p.title, p.body, p.path ?? "/client");
          } catch (e) {
            console.error(e);
          }
        }
        return Response.json({ due: due?.length ?? 0, sent });
      },
    },
  },
});
