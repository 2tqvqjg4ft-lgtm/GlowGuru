/**
 * Подготовка персональных уведомлений (без серверной доставки).
 * Напоминания НЕ хранятся — они каждый раз пересчитываются из актуальной
 * опубликованной схемы. Поэтому пауза, удаление средства или смена частоты
 * автоматически «отменяют» старые напоминания и создают новые.
 */
import { appliesOn, iso, type Client, type Product } from "./demo-data";

export interface NotificationSettings {
  morning: boolean;
  morningTime: string; // HH:MM, локальное время клиента
  evening: boolean;
  eveningTime: string;
  actives: boolean; // только в назначенные дни
  photos: boolean;
  recommendations: boolean;
  plan?: boolean; // push об изменениях схемы
  spf: boolean; // по UV-индексу
  spfThreshold: number;
  city: string;
  timezone: string; // IANA
}

export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  morning: true,
  morningTime: "08:00",
  evening: true,
  eveningTime: "21:30",
  actives: true,
  photos: true,
  recommendations: true,
  spf: true,
  spfThreshold: 3,
  city: "Сургут (ХМАО)",
  timezone: "Asia/Yekaterinburg",
};

export const CITIES: { city: string; timezone: string; label: string; lat: number; lon: number }[] = [
  { city: "Сургут (ХМАО)", timezone: "Asia/Yekaterinburg", label: "UTC+5", lat: 61.254, lon: 73.396 },
  { city: "Калининград", timezone: "Europe/Kaliningrad", label: "UTC+2", lat: 54.71, lon: 20.51 },
  { city: "Москва", timezone: "Europe/Moscow", label: "UTC+3", lat: 55.75, lon: 37.62 },
  { city: "Санкт-Петербург", timezone: "Europe/Moscow", label: "UTC+3", lat: 59.94, lon: 30.31 },
  { city: "Самара", timezone: "Europe/Samara", label: "UTC+4", lat: 53.2, lon: 50.15 },
  { city: "Екатеринбург", timezone: "Asia/Yekaterinburg", label: "UTC+5", lat: 56.84, lon: 60.61 },
  { city: "Омск", timezone: "Asia/Omsk", label: "UTC+6", lat: 54.99, lon: 73.37 },
  { city: "Новосибирск", timezone: "Asia/Novosibirsk", label: "UTC+7", lat: 55.03, lon: 82.92 },
  { city: "Красноярск", timezone: "Asia/Krasnoyarsk", label: "UTC+7", lat: 56.01, lon: 92.87 },
  { city: "Иркутск", timezone: "Asia/Irkutsk", label: "UTC+8", lat: 52.29, lon: 104.28 },
  { city: "Владивосток", timezone: "Asia/Vladivostok", label: "UTC+10", lat: 43.12, lon: 131.89 },
];

/** Актуальный UV (Open-Meteo): сейчас и максимум за сегодня. */
export async function fetchUv(city: string): Promise<{ now: number; max: number }> {
  const c = CITIES.find((x) => x.city === city) ?? CITIES[0]!;
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=uv_index&daily=uv_index_max&timezone=auto&forecast_days=1`);
  if (!r.ok) throw new Error("uv");
  const j = await r.json();
  return { now: Math.round(j.current?.uv_index ?? 0), max: Math.round(j.daily?.uv_index_max?.[0] ?? 0) };
}

export type ReminderKind = "morning" | "evening" | "active" | "photo" | "spf";

export interface PlannedReminder {
  id: string; // детерминированный ключ: при пересчёте старые ключи исчезают
  kind: ReminderKind;
  date: string;
  time: string;
  text: string;
}

export const PHOTO_INTERVAL_DAYS = 28;

export function nextPhotoDate(client: Client): Date {
  const last = client.photos.map((p) => p.date).sort().at(-1);
  const d = last ? new Date(last + "T00:00:00") : new Date(client.since + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  while (d <= today) d.setDate(d.getDate() + PHOTO_INTERVAL_DAYS);
  return d;
}

/** Демо UV-индекс: детерминированное тестовое значение по дате и городу. */
export function demoUv(date: Date, city: string): number {
  const seed = date.getDate() * 7 + date.getMonth() * 13 + city.length * 3;
  const season = [1, 1, 2, 4, 5, 6, 7, 6, 4, 2, 1, 1][date.getMonth()] ?? 3;
  return Math.max(0, Math.min(11, season + ((seed % 5) - 2)));
}

export function uvLevel(uv: number) {
  if (uv <= 2) return "низкий";
  if (uv <= 5) return "умеренный";
  if (uv <= 7) return "высокий";
  return "очень высокий";
}

export function planReminders(
  client: Client,
  settings: NotificationSettings,
  product: (id: string) => Product | undefined,
  days = 7,
): PlannedReminder[] {
  const out: PlannedReminder[] = [];
  const photo = iso(nextPhotoDate(client));
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    const di = iso(d);
    if (settings.morning) out.push({ id: `m-${di}`, kind: "morning", date: di, time: settings.morningTime, text: "Утренний уход" });
    if (settings.spf && demoUv(d, settings.city) >= settings.spfThreshold)
      out.push({ id: `uv-${di}`, kind: "spf", date: di, time: settings.morningTime, text: `UV ${demoUv(d, settings.city)} — не забудьте SPF` });
    if (settings.actives)
      (["am", "pm"] as const).forEach((slot) =>
        client.routine[slot].forEach((s) => {
          const p = product(s.productId);
          if (p?.active && appliesOn(s, d))
            out.push({
              id: `a-${s.id}-${di}`,
              kind: "active",
              date: di,
              time: slot === "am" ? settings.morningTime : settings.eveningTime,
              text: `Сегодня по графику: ${p.name}`,
            });
        }),
      );
    if (settings.actives)
      (client.routine.extra ?? []).forEach((s) => {
        const m = s.schedule?.mode;
        if ((m !== "days" && m !== "dates") || (m === "days" && (s.schedule?.days?.length ?? 0) >= 7) || !appliesOn(s, d)) return;
        const p = product(s.productId);
        (s.times ?? ["pm"]).forEach((slot) =>
          out.push({ id: `x-${s.id}-${slot}-${di}`, kind: "active", date: di, time: slot === "am" ? settings.morningTime : settings.eveningTime, text: `Сегодня ${slot === "am" ? "утром" : "вечером"}: ${p?.name ?? "дополнительный уход"}` }),
        );
      });
    if (settings.evening) out.push({ id: `e-${di}`, kind: "evening", date: di, time: settings.eveningTime, text: "Вечерний уход" });
    if (settings.photos && di === photo) out.push({ id: `p-${di}`, kind: "photo", date: di, time: "10:00", text: "Контрольное фото" });
  }
  return out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

/** Текущее время в часовом поясе клиента. */
export function nowInTz(tz: string, d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const hour = Number(g("hour")), minute = Number(g("minute"));
  return { date: `${g("year")}-${g("month")}-${g("day")}`, hour, minute, minutes: hour * 60 + minute };
}
export const toMinutes = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return (h ?? 0) * 60 + (m ?? 0); };
export const stepsWord = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? "шаг" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "шага" : "шагов");
