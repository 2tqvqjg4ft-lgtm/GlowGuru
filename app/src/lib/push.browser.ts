import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { planReminders, stepsWord, type NotificationSettings, type ReminderKind } from "./notifications";
import { stepsFor, type Client, type Product } from "./demo-data";

const appId = import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID"] as string | undefined;
const vapidKey = import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY"] as string | undefined;
const firebaseConfig = {
  apiKey: (import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY"] as string | undefined) ?? "",
  projectId: (import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID"] as string | undefined) ?? "",
  appId: appId ?? "",
  messagingSenderId: appId?.split(":")[1] ?? "",
};

export type PushResult =
  | { status: "registered"; token: string }
  | { status: "not-configured" | "unsupported" | "open-in-new-tab" | "denied" | "ios-install" };

let foreground = false;

export async function enablePush(userId: string): Promise<PushResult> {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !appId || !vapidKey || !firebaseConfig.messagingSenderId)
    return { status: "not-configured" };
  if (window.top !== window.self) return { status: "open-in-new-tab" };
  const ios = /iPhone|iPad/.test(navigator.userAgent);
  if (!("Notification" in window) || !(await isSupported()))
    return { status: ios ? "ios-install" : "unsupported" };

  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return { status: "denied" };

  const query = new URLSearchParams(firebaseConfig).toString();
  const serviceWorkerRegistration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${query}`);
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration });
  if (!token) return { status: "denied" };
  await supabase.from("push_tokens").upsert({ user_id: userId, token }, { onConflict: "token", ignoreDuplicates: true });
  if (!foreground) {
    foreground = true;
    onMessage(messaging, (p) => toast(p.notification?.title ?? "GLOWGURU", { description: p.notification?.body }));
  }
  return { status: "registered", token };
}

export const PUSH_STATUS_TEXT: Record<Exclude<PushResult["status"], "registered">, string> = {
  "not-configured": "Сервис уведомлений ещё не настроен.",
  unsupported: "Этот браузер не поддерживает уведомления.",
  "ios-install": "На iPhone: нажмите «Поделиться» → «На экран Домой», откройте GLOWGURU с экрана и включите уведомления там.",
  "open-in-new-tab": "Откройте приложение в отдельной вкладке, чтобы разрешить уведомления.",
  denied: "Уведомления запрещены. Разрешите их в настройках сайта в браузере.",
};

/** Перевод «дата + время в часовом поясе клиента» в момент UTC. */
export function zonedToUtc(date: string, time: string, tz: string): Date {
  const guess = new Date(`${date}T${time}:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(guess);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asTz = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"));
  return new Date(guess.getTime() - (asTz - guess.getTime()));
}

const TITLE: Record<ReminderKind, string> = {
  morning: "Утренний уход",
  evening: "Вечерний уход",
  active: "Актив по графику",
  photo: "Контрольное фото",
  spf: "Не забудьте SPF",
};

/** Сохраняет настройки и пересобирает расписание напоминаний на 14 дней. */
export async function syncPushSchedule(
  userId: string,
  client: Client,
  settings: NotificationSettings,
  product: (id: string) => Product | undefined,
) {
  await supabase.from("notification_settings").upsert({ user_id: userId, settings: settings as never, updated_at: new Date().toISOString() });
  const now = Date.now();
  const rows = planReminders(client, settings, product, 14)
    .map((r) => ({
      user_id: userId,
      key: `${r.id}-${r.time}`,
      kind: r.kind,
      send_at: zonedToUtc(r.date, r.time, settings.timezone).toISOString(),
      title: r.kind === "evening" ? "Время вечернего ухода ✦" : TITLE[r.kind],
      body: r.kind === "evening" ? eveningBody(client, r.date) : r.kind === "morning" ? "Пора по вашему плану ухода — откройте, чтобы отметить шаги." : r.text,
    }))
    .filter((r) => new Date(r.send_at).getTime() > now);
  await supabase.from("scheduled_pushes").delete().eq("user_id", userId).is("sent_at", null);
  if (rows.length) await supabase.from("scheduled_pushes").upsert(rows, { onConflict: "user_id,key", ignoreDuplicates: true });
}

function eveningBody(client: Client, date: string) {
  const d = new Date(date + "T12:00:00");
  const n = stepsFor(client, "pm", d).length;
  return n ? `Сегодня осталось выполнить ${n} ${stepsWord(n)}.` : "Пора по вашему плану ухода.";
}

/** Вечерний уход выполнен — отменяем сегодняшнее напоминание, чтобы не слать повторно. */
export async function cancelEveningPush(userId: string, date: string) {
  await supabase.from("scheduled_pushes").delete().eq("user_id", userId).eq("kind", "evening").like("key", `e-${date}-%`).is("sent_at", null);
}
