import { Bell, BellRing, Camera, FlaskConical, Info, MessageSquareText, Moon, Sun, SunDim } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Client } from "@/lib/demo-data";
import { CITIES, DEFAULT_NOTIFICATIONS, fetchUv, planReminders, uvLevel, type NotificationSettings, type ReminderKind } from "@/lib/notifications";
import { useStore } from "@/lib/store";
import { useAuth } from "@/hooks/useAuth";
import { enablePush, PUSH_STATUS_TEXT } from "@/lib/push.browser";
import { sendTestPush } from "@/lib/push.functions";
import { cn } from "@/lib/utils";
import { PageTitle, Panel, Tag, fmtDate } from "./shared";

function PushPanel() {
  const { user } = useAuth();
  const test = useServerFn(sendTestPush);
  const [busy, setBusy] = useState(false);
  const [on, setOn] = useState(typeof Notification !== "undefined" && Notification.permission === "granted");
  const enable = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const r = await enablePush(user.id);
      if (r.status !== "registered") return void toast.error(PUSH_STATUS_TEXT[r.status]);
      setOn(true);
      const { sent } = await test();
      toast.success(sent ? "Уведомления включены. Отправили тестовое." : "Уведомления включены");
    } catch (e) {
      toast.error("Не удалось включить уведомления", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <BellRing className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{on ? "Уведомления на этом устройстве включены" : "Включите уведомления на этом устройстве"}</div>
        <div className="text-xs text-muted-foreground">Уход утром и вечером, активы, контрольные фото и сообщения специалиста.</div>
      </div>
      <Button size="sm" onClick={enable} disabled={busy || !user}>
        {busy ? "Подключаем…" : on ? "Отправить тест" : "Включить"}
      </Button>
    </Panel>
  );
}

export function UvCard({ city, threshold }: { city: string; threshold: number }) {
  const [live, setLive] = useState<{ now: number; max: number } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let off = false;
    const load = () => fetchUv(city).then((v) => { if (!off) { setLive(v); setFailed(false); } }).catch(() => !off && setFailed(true));
    load();
    const t = setInterval(load, 30 * 60 * 1000);
    return () => { off = true; clearInterval(t); };
  }, [city]);
  const uv = live ? live.max : 0;
  return (
    <div className="surface min-w-0 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_25%,white,var(--lilac))] shadow-panel"><SunDim className="h-4 w-4 text-navy" /></span>
        {live && <Tag tone="sky">сейчас {live.now}</Tag>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-[2.2rem] font-semibold leading-none text-navy">{live ? uv : "—"}</span>
        <span className={cn("h-2 w-2 rounded-full", uv >= threshold ? "bg-lime shadow-[0_0_8px_var(--lime)]" : "bg-accent")} />
        <span className="text-xs text-muted-foreground">UV · {live ? uvLevel(uv) : failed ? "нет данных" : "загрузка"}</span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {city} · {live ? (uv >= threshold ? "нужен SPF" : "SPF по желанию") : "…"}
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground/80">Максимум за сегодня</div>
    </div>
  );
}

const KIND_ICON: Record<ReminderKind, typeof Sun> = { morning: Sun, evening: Moon, active: FlaskConical, photo: Camera, spf: SunDim };

function Row({ icon, title, hint, checked, onChange, children }: { icon: ReactNode; title: string; hint: string; checked: boolean; onChange: (v: boolean) => void; children?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/40 text-secondary">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
        {checked && children}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
    </div>
  );
}

export function NotificationSettingsScreen({ client }: { client: Client }) {
  const { updateClient, product } = useStore();
  const s = client.notifications ?? DEFAULT_NOTIFICATIONS;
  const set = (patch: Partial<NotificationSettings>) => updateClient(client.id, (c) => ({ ...c, notifications: { ...s, ...patch } }));
  const planned = planReminders(client, s, product, 7);

  return (
    <>
      <PageTitle eyebrow="Настройки" title="Уведомления" />
      <PushPanel />
      <div className="mb-4 flex gap-3 glass rounded-[1.5rem] p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
        <p>Настройки сохраняются автоматически. Напоминания приходят на все устройства, где вы включили уведомления.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Panel className="divide-y divide-border/60 py-1 sm:py-2">
            <Row icon={<Sun className="h-4 w-4" />} title="Утренний уход" hint="Каждый день в выбранное время" checked={s.morning} onChange={(v) => set({ morning: v })}>
              <Input type="time" value={s.morningTime} onChange={(e) => set({ morningTime: e.target.value })} className="mt-2 h-9 w-32" />
            </Row>
            <Row icon={<Moon className="h-4 w-4" />} title="Вечерний уход" hint="Каждый день в выбранное время" checked={s.evening} onChange={(v) => set({ evening: v })}>
              <Input type="time" value={s.eveningTime} onChange={(e) => set({ eveningTime: e.target.value })} className="mt-2 h-9 w-32" />
            </Row>
            <Row icon={<FlaskConical className="h-4 w-4" />} title="Активные средства" hint="Только в дни по графику специалиста. Пауза или смена частоты пересчитывают напоминания" checked={s.actives} onChange={(v) => set({ actives: v })} />
            <Row icon={<Camera className="h-4 w-4" />} title="Контрольные фото" hint="Раз в 4 недели" checked={s.photos} onChange={(v) => set({ photos: v })} />
            <Row icon={<Bell className="h-4 w-4" />} title="Изменения схемы ухода" hint="Push при публикации новой или обновлённой схемы. В центре уведомлений они остаются всегда" checked={s.plan !== false} onChange={(v) => set({ plan: v })} />
            <Row icon={<MessageSquareText className="h-4 w-4" />} title="Сообщения специалиста" hint="Новые сообщения и рекомендации" checked={s.recommendations} onChange={(v) => set({ recommendations: v })} />
            <Row icon={<SunDim className="h-4 w-4" />} title="SPF по UV-индексу" hint={`Утром, если UV от ${s.spfThreshold} и выше`} checked={s.spf} onChange={(v) => set({ spf: v })} />
          </Panel>

          <Panel>
            <h2 className="mb-1 font-sans text-base font-semibold">Город и часовой пояс</h2>
            <p className="mb-3 text-xs text-muted-foreground">Нужны для UV-прогноза и правильного времени напоминаний.</p>
            <Select
              value={s.city}
              onValueChange={(city) => set({ city, timezone: CITIES.find((c) => c.city === city)?.timezone ?? s.timezone })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CITIES.map((c) => (
                  <SelectItem key={c.city} value={c.city}>{c.city} · {c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">Часовой пояс: {s.timezone}</p>
          </Panel>
        </div>

        <Panel className="self-start">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-sans text-base font-semibold">Ближайшие 7 дней</h2>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </div>
          {planned.length === 0 && <p className="text-sm text-muted-foreground">Все напоминания выключены.</p>}
          <ul className="space-y-1.5">
            {planned.slice(0, 24).map((r, i) => {
              const Icon = KIND_ICON[r.kind];
              const newDay = i === 0 || planned[i - 1]?.date !== r.date;
              return (
                <li key={r.id}>
                  {newDay && <div className="mb-1 mt-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground first:mt-0">{fmtDate(r.date)}</div>}
                  <div className={cn("flex items-center gap-2.5 rounded-2xl px-3 py-2 text-sm", r.kind === "active" ? "bg-accent/30" : "bg-muted/50")}>
                    <Icon className="h-4 w-4 shrink-0 text-secondary" />
                    <span className="w-11 shrink-0 text-xs tabular-nums text-muted-foreground">{r.time}</span>
                    <span className="min-w-0 truncate">{r.text}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </>
  );
}
