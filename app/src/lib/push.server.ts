const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";

/** Отправляет push на все устройства пользователя. Возвращает число доставленных. */
export async function sendPushToUser(userId: string, title: string, body: string, path = "/client"): Promise<number> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const fcmKey = process.env["FIREBASE_MESSAGING_API_KEY"];
  if (!lovableKey || !fcmKey) throw new Error("Push is not configured");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: tokens, error } = await supabaseAdmin.from("push_tokens").select("token").eq("user_id", userId);
  if (error) throw error;
  let sent = 0;
  for (const { token } of tokens ?? []) {
    const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": fcmKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          data: { path },
          webpush: { fcm_options: { link: path } },
        },
      }),
    });
    if (res.ok) {
      sent++;
      continue;
    }
    const text = await res.text();
    console.error(`FCM send failed [${res.status}]: ${text}`);
    if (res.status === 404 || (res.status === 400 && text.includes("INVALID_ARGUMENT")) || text.includes("UNREGISTERED")) {
      await supabaseAdmin.from("push_tokens").delete().eq("token", token);
    }
  }
  return sent;
}
