import { usePersistentState } from "@/lib/ui-state";
import { useEffect, useState } from "react";
import { BellRing, BookOpen, CalendarDays, ChevronDown, ChevronRight, Home, MessageSquareText, NotebookPen, Plus, Search, Settings, SlidersHorizontal, Upload, Users } from "lucide-react";
import { toast } from "sonner";
import { SpecialistCare, useCareNewCount } from "./CareReview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { describeExtra, describeStages, uid, iso, type Client, type Step } from "@/lib/demo-data";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PublishBar, RoutineEditor } from "./RoutineEditor";
import { LibraryScreen } from "./LibraryScreen";
import { SpecialistMessages } from "./Messages";
import { NotificationBell, useNotifications, type AppNotification } from "./NotificationCenter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ActivesCalendar, AppShell, PageTitle, Panel, SectionTitle, PhotoTile, ProductImage, Tag, productDescription, fmtDate, type Section, CreamHeart, DynamicsGallery } from "./shared";
import { useServerFn } from "@tanstack/react-start";
import { deleteClient } from "@/lib/clients.functions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

function DeleteClientButton({ client, onDeleted }: { client: Client; onDeleted: () => void }) {
  const del = useServerFn(deleteClient);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await del({ data: { clientId: client.id } });
      toast.success(`${client.name} удалена безвозвратно`);
      setOpen(false);
      onDeleted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось удалить клиента");
    } finally {
      setBusy(false);
    }
  };
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">Удалить клиента</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить {client.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Будут безвозвратно удалены аккаунт, анкета, схемы ухода, дневник, сообщения, фотографии и настройки уведомлений. Восстановить их будет невозможно.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Отмена</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); run(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {busy ? "Удаляем…" : "Удалить навсегда"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const SECTIONS: Section[] = [
  { key: "home", label: "Главная", icon: Home, primary: true },
  { key: "clients", label: "Клиенты", icon: Users, primary: true },
  { key: "editor", label: "Редактор ухода", short: "Редактор", icon: SlidersHorizontal, primary: true },
  { key: "messages", label: "Сообщения", icon: MessageSquareText, primary: true },
  { key: "library", label: "Библиотека средств", short: "Средства", icon: BookOpen },
  { key: "calendar", label: "Календарь ухода", short: "Календарь", icon: CalendarDays },
  { key: "settings", label: "Настройки", icon: Settings },
];

export function SpecialistApp() {
  const { clients, loading } = useStore();
  const [section, setSection] = usePersistentState("sp:section", "home");
  const [picked, setClientId] = usePersistentState("sp:client", "");
  const [tab, setTab] = usePersistentState<(typeof CARD_TABS)[number]>("sp:tab", "Анкета");
  const [chatWith, setChatWith] = usePersistentState("sp:chat", "");
  const notif = useNotifications();
  const sections = SECTIONS.map((s) => (s.key === "messages" ? { ...s, badge: notif.unreadChat } : s.key === "clients" ? { ...s, badge: notif.items.filter((n) => !n.read_at && n.entity_type !== "chat").length } : s));
  const openNotification = (n: AppNotification) => {
    const cid = n.client_id ?? "";
    if (n.entity_type === "chat") { setChatWith(cid); setSection("messages"); return; }
    if (cid) setClientId(cid);
    setTab(n.entity_type === "diary" ? "Дневник" : n.entity_type === "photo" ? "Фото динамики" : n.entity_type === "care" ? "Анкета" : n.entity_type === "plan" ? "Схема ухода" : "Анкета");
    setSection("clients");
    if (n.entity_id) setTimeout(() => document.getElementById(`item-${n.entity_id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 400);
  };
  const clientId = clients.some((c) => c.id === picked) ? picked : (clients[0]?.id ?? "");
  const open = (id: string, s = "clients") => {
    setClientId(id);
    setSection(s);
  };
  const client = clients.find((c) => c.id === clientId);
  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Загрузка…</div>;

  return (
    <AppShell canSwitch role="specialist" subtitle="Кабинет специалиста" sections={sections} active={section} scrollScope={section === "editor" || section === "clients" || section === "calendar" ? clientId : undefined} onChange={setSection} headerRight={<NotificationBell n={notif} onOpen={openNotification} />}>
      {section === "home" && <Dashboard open={open} openTab={(id, nextTab) => { setClientId(id); setTab(nextTab); setSection("clients"); }} notifications={notif.items} markRead={notif.markRead} openNotification={openNotification} />}
      {section === "clients" && <ClientsScreen tab={tab} setTab={setTab} clientId={clientId} setClientId={setClientId} openEditor={(id) => open(id, "editor")} />}
      {section === "library" && <Library />}
      {section === "messages" && <SpecialistMessages initialClient={chatWith} />}
      {section === "editor" && (client ? (
        <>
          <PageTitle eyebrow="Редактор ухода" title={client.name}>
            <ClientPicker value={clientId} onChange={setClientId} />
          </PageTitle>
          <PublishBar client={client} />
          <RoutineEditor client={client} />
        </>
      ) : <PageTitle eyebrow="Редактор ухода" title="Клиентов пока нет" />)}
      {section === "calendar" && (client ? (
        <>
          <PageTitle eyebrow="Календарь ухода" title={client.name}>
            <ClientPicker value={clientId} onChange={setClientId} />
          </PageTitle>
          <ActivesCalendar client={client} />
        </>
      ) : <PageTitle eyebrow="Календарь ухода" title="Клиентов пока нет" />)}
      {section === "settings" && <SettingsScreen />}
    </AppShell>
  );
}

function ClientPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { clients } = useStore();
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 max-w-full rounded-full border border-input bg-card px-4 text-sm">
      {clients.map((c) => (
        <option key={c.id} value={c.id}>{c.name}{c.demo ? " · демо" : !c.published ? " · новый" : ""}</option>
      ))}
    </select>
  );
}

type PendingCare = { id: string; client_id: string; status: "submitted" | "in_review"; created_at: string };
type AttentionItem = {
  key: string;
  client: Client | undefined;
  text: string;
  createdAt: string;
  notification?: AppNotification;
  kind: "notification" | "care" | "plan" | "photo";
};
type UpcomingChange = { key: string; client: Client; date: string; text: string };
type StatKey = "clients" | "attention" | "diary" | "changes";

function relativeTime(value: string) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  if (hours < 48) return "вчера";
  return fmtDate(value);
}

function attentionText(n: AppNotification, client: Client | undefined) {
  if (n.entity_type === "chat") return n.type === "chat_photo" ? "Новое фото в сообщении" : "Новое сообщение";
  if (n.entity_type === "diary") {
    const entry = client?.diary.find((d) => d.id === n.entity_id);
    return entry ? `Дневник кожи · ${entry.rating}/5` : "Новая запись в дневнике кожи";
  }
  if (n.entity_type === "photo") return "Новое фото";
  if (n.entity_type === "care") return n.title.replace(client?.name ?? "", "").trim().replace(/^./, (x) => x.toUpperCase()) || "Домашний уход загружен на разбор";
  if (n.entity_type === "questionnaire") return "Новый ответ клиента";
  return n.title;
}

function controlPhotoDue(client: Client) {
  const latest = client.photos.map((p) => p.date).sort().at(-1) ?? client.since;
  const due = new Date(`${latest}T00:00:00`);
  due.setDate(due.getDate() + 28);
  const inThreeDays = new Date();
  inThreeDays.setHours(23, 59, 59, 999);
  inThreeDays.setDate(inThreeDays.getDate() + 3);
  return due <= inThreeDays ? due.toISOString() : null;
}

function dateFromIso(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year ?? 2000, (month ?? 1) - 1, day ?? 1);
}

function upcomingChanges(clients: Client[], productName: (id: string) => string | undefined): UpcomingChange[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const events: UpcomingChange[] = [];
  const add = (client: Client, step: Step, date: Date, text: string, suffix: string) => {
    if (step.paused || date <= start || date > end) return;
    events.push({ key: `${client.id}-${step.id}-${suffix}-${iso(date)}`, client, date: iso(date), text });
  };

  for (const client of clients) {
    for (const step of [...client.routine.am, ...client.routine.pm]) {
      const name = productName(step.productId) ?? "Средство";
      const begins = dateFromIso(step.startDate);
      add(client, step, begins, `Подключение средства: ${name}`, "start");
      let elapsedWeeks = 0;
      for (let index = 1; index < step.stages.length; index++) {
        elapsedWeeks += step.stages[index - 1]?.weeks ?? 0;
        const transition = new Date(begins);
        transition.setDate(transition.getDate() + elapsedWeeks * 7);
        add(client, step, transition, `Переход на следующий этап: ${name}`, `stage-${index}`);
      }
    }
    for (const step of client.routine.extra ?? []) {
      const name = productName(step.productId) ?? "Средство";
      for (const value of step.schedule?.dates ?? []) {
        add(client, step, dateFromIso(value), `Запланирован дополнительный уход: ${name}`, `date-${value}`);
      }
    }
  }
  return events.sort((a, b) => a.date.localeCompare(b.date));
}

function Dashboard({ open, openTab, notifications, markRead, openNotification }: { open: (id: string, s?: string) => void; openTab: (id: string, tab: (typeof CARD_TABS)[number]) => void; notifications: AppNotification[]; markRead: (id: string) => Promise<void>; openNotification: (n: AppNotification) => void }) {
  const { clients, product } = useStore();
  const today = new Date();
  const [pendingCare, setPendingCare] = useState<PendingCare[]>([]);
  const [openedStat, setOpenedStat] = useState<StatKey | null>(null);
  useEffect(() => {
    supabase.from("care_reviews").select("id, client_id, status, created_at").in("status", ["submitted", "in_review"]).order("created_at", { ascending: false })
      .then(({ data }) => setPendingCare((data ?? []) as PendingCare[]));
  }, []);
  const recent = clients
    .flatMap((c) => c.history.map((h) => ({ ...h, client: c })))
    .sort((a, b) => b.date.localeCompare(a.date));
  const diary = clients.flatMap((c) => c.diary.map((d) => ({ ...d, client: c }))).sort((a, b) => b.date.localeCompare(a.date));
  const weekAgo = new Date();
  weekAgo.setHours(0, 0, 0, 0);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const diaryWeek = diary.filter((d) => dateFromIso(d.date) >= weekAgo);
  const changes = upcomingChanges(clients, (id) => product(id)?.name);
  const unread = notifications.filter((n) => !n.read_at && n.client_id && clients.some((c) => c.id === n.client_id));
  const unreadCareClients = new Set(unread.filter((n) => n.entity_type === "care").map((n) => n.client_id));
  const unreadPhotoClients = new Set(unread.filter((n) => n.entity_type === "photo").map((n) => n.client_id));
  const attention: AttentionItem[] = [
    ...unread.map((notification) => {
      const client = clients.find((c) => c.id === notification.client_id);
      return { key: notification.id, client, text: attentionText(notification, client), createdAt: notification.created_at, notification, kind: "notification" as const };
    }),
    ...pendingCare.filter((r) => !unreadCareClients.has(r.client_id)).map((r) => ({
      key: `care-${r.id}`, client: clients.find((c) => c.id === r.client_id), text: "Разбор ухода ещё не завершён", createdAt: r.created_at, kind: "care" as const,
    })),
    ...clients.filter((c) => c.publishedAt && (!c.viewedAt || c.viewedAt < c.publishedAt)).map((c) => ({
      key: `plan-${c.id}-${c.publishedAt}`, client: c, text: "Опубликованная схема ещё не открыта", createdAt: c.publishedAt ?? c.since, kind: "plan" as const,
    })),
    ...clients.filter((c) => !unreadPhotoClients.has(c.id) && controlPhotoDue(c)).map((c) => ({
      key: `control-photo-${c.id}`, client: c, text: "Подошла дата контрольного фото", createdAt: controlPhotoDue(c) ?? c.since, kind: "photo" as const,
    })),
  ].filter((x) => x.client).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const attentionClients = new Set(attention.map((item) => item.client?.id).filter(Boolean));
  const stats: { key: StatKey; label: string; caption?: string; value: number; icon: typeof Users }[] = [
    { key: "clients", label: "Клиентов на сопровождении", value: clients.length, icon: Users },
    { key: "attention", label: "Нужно проверить сегодня", value: attentionClients.size, icon: BellRing },
    { key: "diary", label: "Новых записей в дневниках за 7 дней", value: diaryWeek.length, icon: NotebookPen },
    { key: "changes", label: "Ближайших изменений схем", caption: "в следующие 7 дней", value: changes.length, icon: CalendarDays },
  ];

  const openAttentionItem = (item: AttentionItem) => {
    if (!item.client) return;
    if (item.kind === "notification" && item.notification) { void markRead(item.notification.id); openNotification(item.notification); }
    else if (item.kind === "care") openTab(item.client.id, "Анкета");
    else if (item.kind === "photo") openTab(item.client.id, "Фото динамики");
    else openTab(item.client.id, "Схема ухода");
  };

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
        <p className="text-sm font-medium capitalize text-muted-foreground">{today.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="font-display text-[2.3rem] font-semibold leading-[1.08] md:text-5xl">Добрый день, Анна</h1>
        </div>
        <CreamHeart />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((st, i) => (
          <button
            key={st.label}
            onClick={() => setOpenedStat((current) => current === st.key ? null : st.key)}
            aria-expanded={openedStat === st.key}
            aria-controls="stat-details"
            className={cn("surface relative min-w-0 overflow-hidden p-4 text-left transition-all active:scale-[0.98]", ["glow-ice", "glow-lilac", "glow-blush", "glow-lime"][i % 4], openedStat === st.key && "ring-2 ring-lime/35")}
          >
            <span className={cn("relative flex h-9 w-9 items-center justify-center rounded-full bg-card/90 text-navy shadow-panel", i === 3 && "text-lime")}>
              <st.icon className="h-4 w-4" />
            </span>
            <div className="relative mt-4 text-[2.6rem] font-semibold tabular-nums tracking-tight text-navy">{st.value}</div>
            <div className="relative mt-1 text-xs leading-snug text-muted-foreground">{st.label}</div>
            {st.caption && <div className="relative mt-1 text-[11px] font-medium text-lime">{st.caption}</div>}
          </button>
        ))}
      </div>

      {openedStat && (
        <section id="stat-details" className="surface mt-3 overflow-hidden p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-sans text-base font-semibold">{stats.find((item) => item.key === openedStat)?.label}</h2>
            <button aria-label="Закрыть список" onClick={() => setOpenedStat(null)} className="glass-chip flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground">
              <ChevronDown className="h-4 w-4 rotate-180" />
            </button>
          </div>
          {openedStat === "clients" && (
            clients.length ? <ul className="mt-3 divide-y divide-border/60">{clients.map((client) => (
              <li key={client.id}><button onClick={() => open(client.id)} className="flex min-h-14 w-full items-center justify-between gap-3 py-3 text-left"><span className="font-semibold">{client.name}</span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /></button></li>
            ))}</ul> : <p className="mt-3 text-sm text-muted-foreground">Сейчас нет клиентов на сопровождении.</p>
          )}
          {openedStat === "attention" && (
            attention.length ? <ul className="mt-3 divide-y divide-border/60">{attention.map((item) => (
              <li key={`stat-${item.key}`}><button onClick={() => openAttentionItem(item)} className="flex min-h-16 w-full items-center gap-3 py-3 text-left"><span className="min-w-0 flex-1"><span className="block font-semibold">{item.client?.name}</span><span className="mt-0.5 block text-sm text-muted-foreground">{item.text} · {relativeTime(item.createdAt)}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /></button></li>
            ))}</ul> : <p className="mt-3 text-sm text-muted-foreground">Сегодня ничего проверять не нужно.</p>
          )}
          {openedStat === "diary" && (
            diaryWeek.length ? <ul className="mt-3 divide-y divide-border/60">{diaryWeek.map((entry) => (
              <li key={`stat-${entry.id}`}><button onClick={() => openTab(entry.client.id, "Дневник")} className="flex min-h-16 w-full items-center gap-3 py-3 text-left"><span className="min-w-0 flex-1"><span className="block font-semibold">{entry.client.name}</span><span className="mt-0.5 block text-sm text-muted-foreground">Дневник кожи · {entry.rating}/5 · {fmtDate(entry.date)}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /></button></li>
            ))}</ul> : <p className="mt-3 text-sm text-muted-foreground">За последние 7 дней новых записей нет.</p>
          )}
          {openedStat === "changes" && (
            changes.length ? <ul className="mt-3 divide-y divide-border/60">{changes.map((change) => (
              <li key={change.key}><button onClick={() => openTab(change.client.id, "Схема ухода")} className="flex min-h-16 w-full items-center gap-3 py-3 text-left"><span className="min-w-0 flex-1"><span className="block font-semibold">{change.client.name}</span><span className="mt-0.5 block text-sm text-muted-foreground">{change.text} · {fmtDate(change.date)}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /></button></li>
            ))}</ul> : <p className="mt-3 text-sm text-muted-foreground">В следующие 7 дней изменений не запланировано.</p>
          )}
        </section>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className="surface relative overflow-hidden p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-[1.9rem] font-semibold leading-none text-primary">Требует внимания</h2>
            <BellRing className="h-5 w-5 text-secondary" />
          </div>
          {attention.length ? (
            <ul className="mt-4 divide-y divide-border/60">
              {attention.map((item) => (
                <li key={item.key}>
                  <button
                    onClick={() => {
                      openAttentionItem(item);
                    }}
                    className="flex min-h-16 w-full items-center gap-3 py-3 text-left transition-colors hover:text-secondary active:scale-[0.99]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">{item.client?.name}</span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">{item.text} · {relativeTime(item.createdAt)}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 py-2">
              <p className="font-semibold text-foreground">Всё спокойно</p>
              <p className="mt-1 text-sm text-muted-foreground">Новых действий сейчас нет</p>
            </div>
          )}
        </section>
        <Panel>
          <SectionTitle>Дневники клиентов</SectionTitle>
          <ul className="space-y-2">
            {diary.slice(0, 4).map((d) => (
              <li key={d.id} className="rounded-2xl bg-muted/45 p-3 text-sm">
                <div className="mb-1 flex justify-between gap-2 text-xs text-muted-foreground">
                  <button onClick={() => open(d.client.id)} className="font-semibold text-foreground hover:text-secondary">{d.client.name}</button>
                  <span className="shrink-0">{fmtDate(d.date)} · {d.rating}/5</span>
                </div>
                <p className="break-words">{d.text}</p>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="lg:col-span-2">
          <RecentChanges items={recent} open={open} />
        </Panel>
      </div>
    </>
  );
}

function shortChange(t: string): string {
  const s = t.trim().replace(/\.$/, "");
  if (/опубликована повторно/i.test(s)) return "Схема опубликована повторно";
  if (/^схема опубликована/i.test(s)) return "Схема опубликована";
  const body = s.replace(/^[^:]{1,12}:\s*/, "");
  let m;
  if ((m = body.match(/^добавлено «([^»]+)»/))) return `Добавлено средство: ${m[1]}`;
  if ((m = body.match(/^удалено «([^»]+)»/))) return `Удалено средство: ${m[1]}`;
  if ((m = body.match(/^замена «[^»]+» → «([^»]+)»/))) return `Заменено средство: ${m[1]}`;
  if ((m = body.match(/^«([^»]+)» — изменена частота/))) return `Изменена частота: ${m[1]}`;
  if ((m = body.match(/^«([^»]+)» — (изменён комментарий|рекомендация специалиста)/))) return `Добавлен комментарий специалиста: ${m[1]}`;
  if ((m = body.match(/^«([^»]+)» — изменён способ применения/))) return `Изменён способ применения: ${m[1]}`;
  if ((m = body.match(/^«([^»]+)» (поставлено на паузу|возвращено в схему)/))) { const v = m[2] ?? ""; return `${v.charAt(0).toUpperCase()}${v.slice(1)}: ${m[1]}`; }
  if (/порядок нанесения/.test(body)) return "Изменён порядок нанесения";
  return body || "Схема обновлена";
}

type RecentItem = { id: string; date: string; text: string; client: Client };

function RecentChanges({ items, open }: { items: RecentItem[]; open: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [all, setAll] = useState(false);
  const groups: { key: string; date: string; first: string; client: Client; text: string; count: number }[] = [];
  for (const h of items) {
    const text = shortChange(h.text);
    const last = groups[groups.length - 1];
    if (last && last.client.id === h.client.id && last.text === text) { last.count++; last.first = h.date; }
    else groups.push({ key: h.id, date: h.date, first: h.date, client: h.client, text, count: 1 });
  }
  const shown = expanded ? (all ? groups : groups.slice(0, 5)) : groups.slice(0, 1);
  const time = (d: string) => d.length > 10 ? new Date(d).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "";
  return (
    <div>
      <button onClick={() => { setExpanded((v) => !v); setAll(false); }} aria-expanded={expanded} className="flex w-full items-center justify-between gap-3 text-left">
        <span className="font-semibold">Последние изменения схем</span>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          {groups.length > 0 && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">{groups.length}</span>}
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
        </span>
      </button>
      {groups.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Изменений пока нет</p>
      ) : (
        <ul className="mt-2 divide-y divide-border/60">
          {shown.map((g) => (
            <li key={g.key} className="py-1.5 text-sm leading-snug">
              <div className="text-[11px] text-muted-foreground">{fmtDate(g.date)}</div>
              <button onClick={() => open(g.client.id)} className="text-left font-semibold hover:text-secondary">{g.client.name}</button>
              <p className="line-clamp-2 break-words text-foreground/80">
                {g.text}{g.count > 1 && ` · ${g.count} раз`}
              </p>
              {g.count > 1 && time(g.date) && <p className="text-[11px] text-muted-foreground">Последнее изменение: {time(g.date)}</p>}
            </li>
          ))}
        </ul>
      )}
      {expanded && (
        <div className="mt-2 flex flex-wrap gap-2">
          {!all && groups.length > 5 && <Button size="sm" variant="outline" onClick={() => setAll(true)}>Показать всю историю</Button>}
          <Button size="sm" variant="ghost" onClick={() => { setExpanded(false); setAll(false); }}>Свернуть историю</Button>
        </div>
      )}
    </div>
  );
}

const CARD_TABS = ["Анкета", "Схема ухода", "Дневник", "История", "Фото динамики"] as const;

function ClientsScreen({ clientId, setClientId, openEditor, tab, setTab }: { clientId: string; setClientId: (id: string) => void; openEditor: (id: string) => void; tab: (typeof CARD_TABS)[number]; setTab: (t: (typeof CARD_TABS)[number]) => void }) {
  const { clients, removeClient } = useStore();
  const [q, setQ] = useState("");
  const list = clients.filter((c) => (c.name + c.skinType + c.complaints.join()).toLowerCase().includes(q.toLowerCase()));
  const client = clients.find((c) => c.id === clientId) ?? clients[0];
  const careNew = useCareNewCount(client?.id ?? "");
  if (!client) return <PageTitle eyebrow="Клиенты" title="Клиентов пока нет" />;


  return (
    <>
      <PageTitle eyebrow="Клиенты" title="Карточки клиентов" />
      <div className="grid min-w-0 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по имени, жалобам" className="bg-card pl-9" />
          </div>
          <ul className="space-y-1">
            {list.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setClientId(c.id)}
                  className={cn(
                    "w-full rounded-2xl border px-4 py-3 text-left transition-all",
                    c.id === clientId ? "border-primary/15 bg-card text-foreground shadow-panel" : "border-transparent hover:bg-card/70",
                  )}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className="min-w-0 break-words">{c.name}</span>
                    {c.demo ? <Tag>демо</Tag> : !c.published && <Tag tone="sky">новый</Tag>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {c.demo ? `${c.age} лет · ${c.skinType}` : !c.published ? `зарегистрирован(а) ${fmtDate(c.since)} · схема не опубликована` : [c.age ? `${c.age} лет` : "", c.skinType].filter(Boolean).join(" · ") || "клиент"}
                  </div>
                </button>
              </li>
            ))}
            {list.length === 0 && <li className="px-3 py-6 text-sm text-muted-foreground">Никого не нашли</li>}
          </ul>
        </div>

        <div className="min-w-0">
          <Panel className="mb-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="break-words font-sans text-3xl font-semibold leading-tight">{client.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {[client.age ? `${client.age} лет` : "Дата рождения не указана", client.phone, `на сопровождении с ${fmtDate(client.since)}`].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-2 text-sm">{client.goal ? <><span className="text-muted-foreground">Цель: </span>{client.goal}</> : <span className="text-muted-foreground">Цель не указана</span>}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => openEditor(client.id)}>Открыть редактор ухода</Button>
                {!client.demo && (
                  <DeleteClientButton
                    client={client}
                    onDeleted={() => {
                      const rest = clients.filter((c) => c.id !== client.id);
                      removeClient(client.id);
                      if (rest[0]) setClientId(rest[0].id);
                    }}
                  />
                )}
              </div>
            </div>
          </Panel>
          <div className="mb-4 flex min-w-0 flex-wrap gap-1.5 pb-1">
            {CARD_TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn("max-w-full break-words rounded-full border px-4 py-2 text-sm font-semibold transition-all", tab === t ? "glass-active" : "glass-chip text-primary/75 hover:text-primary")}
              >
                {t === "Анкета" && careNew ? `${t} · ${careNew} нов. фото` : t}
              </button>
            ))}
          </div>
          {tab === "Анкета" && <Questionnaire client={client} />}
          {tab === "Схема ухода" && <RoutineSummary client={client} />}
          {tab === "Дневник" && <DiaryTab client={client} />}
          {tab === "История" && <HistoryList client={client} />}
          {tab === "Фото динамики" && <PhotosTab client={client} />}
        </div>
      </div>
    </>
  );
}

/** Сохранить правку карточки сразу в базу (черновик специалиста, привязан к client_id). */
function useSaveCard(client: Client) {
  const { updateClient, saveDraft } = useStore();
  const [busy, setBusy] = useState(false);
  const save = async (fn: (c: Client) => Client) => {
    setBusy(true);
    updateClient(client.id, fn);
    try {
      await saveDraft(client.id);
      toast.success("Сохранено");
      return true;
    } catch {
      toast.error("Не удалось сохранить изменения");
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { save, busy };
}

function EditBar({ editing, busy, onEdit, onSave, onCancel }: { editing: boolean; busy: boolean; onEdit: () => void; onSave: () => void; onCancel: () => void }) {
  return (
    <div className="mb-3 flex flex-wrap justify-end gap-2">
      {editing ? (
        <>
          <Button size="sm" variant="outline" onClick={onCancel} disabled={busy}>Отмена</Button>
          <Button size="sm" onClick={onSave} disabled={busy}>{busy ? "Сохраняем…" : "Сохранить"}</Button>
        </>
      ) : (
        <Button size="sm" variant="outline" onClick={onEdit}>Редактировать</Button>
      )}
    </div>
  );
}

/** Единая анкета: данные анкеты клиентки и профессиональная оценка кожи в одних полях. */
type QBlock = { key: string; label: string; aliases: string[]; skin?: string[] };
const Q_BLOCKS: QBlock[] = [
  { key: "complaints", label: "Основные жалобы", aliases: ["Основные жалобы", "Жалобы"] },
  { key: "skinType", label: "Тип и состояние кожи", aliases: ["Тип / состояние кожи", "Тип и состояние кожи"], skin: ["state"] },
  { key: "sensitivity", label: "Чувствительность и реактивность", aliases: ["Чувствительность и реактивность"], skin: ["sensitivity", "reactivity"] },
  { key: "dehydration", label: "Обезвоженность", aliases: ["Обезвоженность"], skin: ["dehydration"] },
  { key: "breakouts", label: "Высыпания", aliases: ["Высыпания"], skin: ["breakouts"] },
  { key: "pigmentation", label: "Пигментация", aliases: ["Пигментация"], skin: ["pigmentation"] },
  { key: "care", label: "Текущий домашний уход", aliases: ["Текущий домашний уход"] },
  { key: "actives", label: "Используемые активы", aliases: ["Используемые активы"] },
  { key: "allergies", label: "Аллергии", aliases: ["Аллергии"] },
  { key: "restrictions", label: "Противопоказания", aliases: ["Ограничения / противопоказания", "Противопоказания"] },
  { key: "goal", label: "Цели клиента", aliases: ["Главная цель ухода", "Цели клиента"] },
];
const KNOWN_Q = new Set(Q_BLOCKS.flatMap((b) => b.aliases));

/** Собирает значение блока из всех прежних мест хранения, без потери данных. */
function blockValue(c: Client, b: QBlock): string {
  const qa = c.questionnaire.filter((x) => b.aliases.includes(x.q)).map((x) => x.a.trim());
  const direct: string[] =
    b.key === "complaints" ? [c.complaints.join("\n")] :
    b.key === "skinType" ? [c.skinType] :
    b.key === "allergies" ? [c.allergies] :
    b.key === "restrictions" ? [c.restrictions] :
    b.key === "goal" ? [c.goal] : [];
  const skin = (b.skin ?? []).map((k) => c.skin?.[k] ?? "");
  const parts: string[] = [];
  for (const v of [...direct, ...skin, ...qa].map((x) => (x ?? "").trim()).filter(Boolean)) {
    const norm = v.toLowerCase().replace(/[\s,;.]+/g, " ").trim();
    if (!parts.some((p) => p.toLowerCase().replace(/[\s,;.]+/g, " ").trim() === norm)) parts.push(v);
  }
  return parts.join("\n");
}

function Questionnaire({ client }: { client: Client }) {
  const { save, busy } = useSaveCard(client);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const extra = client.questionnaire.filter((x) => !KNOWN_Q.has(x.q));
  const start = () => {
    setForm(Object.fromEntries(Q_BLOCKS.map((b) => [b.key, blockValue(client, b)])));
    setNotes(client.notes);
    setEditing(true);
  };
  const submit = async () => {
    const v = (k: string) => (form[k] ?? "").trim().slice(0, 2000);
    const questionnaire = [...Q_BLOCKS.map((b) => ({ q: b.label, a: v(b.key) })).filter((x) => x.a), ...extra];
    const ok = await save((c) => ({
      ...c,
      questionnaire,
      complaints: v("complaints").split(/\n|;/).map((s) => s.trim()).filter(Boolean),
      skinType: v("skinType"),
      allergies: v("allergies"),
      restrictions: v("restrictions"),
      goal: v("goal"),
      notes,
      // Прежние поля оценки кожи перенесены в блоки анкеты — одна версия каждого параметра
      skin: {},
    }));
    if (ok) setEditing(false);
  };
  const filled = Q_BLOCKS.map((b) => [b, blockValue(client, b)] as const);
  const empty = filled.every(([, v]) => !v) && !extra.length;

  return (
    <div className="space-y-4">
      <Panel>
        <EditBar editing={editing} busy={busy} onEdit={start} onSave={submit} onCancel={() => setEditing(false)} />
        {editing ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Q_BLOCKS.map((b, i) => (
              <label key={b.key} className="block min-w-0 text-sm text-muted-foreground">
                {i + 1}. {b.label}
                <Textarea className="mt-1 text-base text-foreground md:text-sm" rows={2} value={form[b.key] ?? ""} onChange={(e) => setForm({ ...form, [b.key]: e.target.value })} />
              </label>
            ))}
            <label className="block min-w-0 text-sm text-muted-foreground md:col-span-2">
              12. Заключение и комментарии специалиста <span className="text-[11px]">(видно только вам)</span>
              <Textarea className="mt-1 text-base text-foreground md:text-sm" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </div>
        ) : (
          <>
            {empty && <p className="text-sm text-muted-foreground">Анкета ещё не заполнена. Нажмите «Редактировать», чтобы заполнить вручную.</p>}
            <dl className="divide-y divide-border">
              {filled.map(([b, v], i) => (
                <div key={b.key} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                  <dt className="text-sm text-muted-foreground">{i + 1}. {b.label}</dt>
                  <dd className="whitespace-pre-wrap break-words text-sm">{v || <span className="text-muted-foreground">не указано</span>}</dd>
                </div>
              ))}
              {extra.map((x) => (
                <div key={x.q} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                  <dt className="text-sm text-muted-foreground">{x.q}</dt>
                  <dd className="whitespace-pre-wrap break-words text-sm">{x.a}</dd>
                </div>
              ))}
              <div className="grid gap-1 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <dt className="text-sm text-muted-foreground">12. Заключение и комментарии специалиста<div className="text-[11px]">видно только вам</div></dt>
                <dd className="whitespace-pre-wrap break-words text-sm">{client.notes || <span className="text-muted-foreground">не указано</span>}</dd>
              </div>
            </dl>
            {client.features.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{client.features.map((x) => <Tag key={x} tone="sky">{x}</Tag>)}</div>}
          </>
        )}
      </Panel>
      {!client.demo && (
        <div>
          <h3 className="mb-2 mt-2 font-sans text-base font-semibold">Фото косметики на разбор</h3>
          <SpecialistCare key={client.id} clientId={client.id} />
        </div>
      )}
    </div>
  );
}

function RoutineSummary({ client }: { client: Client }) {
  const { product } = useStore();
  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-2">
      {!client.published && !client.demo && <p className="text-xs text-muted-foreground md:col-span-2">Схема ещё не опубликована — клиентка её пока не видит.</p>}
      {(["am", "pm"] as const).map((slot) => (
        <Panel key={slot} className="min-w-0">
          <h3 className="mb-3 font-sans text-base font-semibold">{slot === "am" ? "Утро" : "Вечер"}</h3>
          <ol className="space-y-2">
            {client.routine[slot].map((s, i) => (
              <li key={s.id} className="flex gap-3 text-sm">
                <span className="text-muted-foreground">{i + 1}.</span>
                <div className="min-w-0 break-words">
                  <span className={s.paused ? "text-muted-foreground line-through" : ""}>{product(s.productId)?.name}</span>
                  <div className="text-xs text-secondary">{describeStages(s.stages)}</div>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      ))}
      <Panel className="min-w-0 md:col-span-2">
        <h3 className="mb-3 font-sans text-base font-semibold">Дополнительный уход</h3>
        {(client.routine.extra ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Не назначен. Добавьте средства в редакторе ухода.</p>
        ) : (
          <ul className="space-y-2">
            {(client.routine.extra ?? []).map((s) => (
              <li key={s.id} className="break-words text-sm">
                <span className={s.paused ? "text-muted-foreground line-through" : "font-medium"}>{product(s.productId)?.name ?? "Средство"}</span>
                <span className="text-muted-foreground"> — {describeExtra(s)}</span>
                {s.note && <div className="text-xs text-muted-foreground">{s.note}</div>}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

export function HistoryList({ client }: { client: Client }) {
  return (
    <Panel>
      <ol className="relative space-y-4 pl-7 before:absolute before:bottom-2 before:left-[9px] before:top-2 before:w-px before:bg-border">
        {client.history.map((h, i) => (
          <li key={h.id} className="relative">
            <span className={cn("absolute -left-7 top-1 flex h-[19px] w-[19px] items-center justify-center rounded-full ring-4 ring-card", i === 0 ? "bg-secondary" : "bg-accent")}>
              <span className="h-1.5 w-1.5 rounded-full bg-card" />
            </span>
            <div className="text-xs font-semibold text-secondary">{fmtDate(h.date)}</div>
            <div className="mt-1 break-words rounded-2xl bg-muted/45 px-3.5 py-2.5 text-sm">{h.text}</div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function DiaryTab({ client }: { client: Client }) {
  if (client.diary.length === 0) return <Panel><p className="text-sm text-muted-foreground">Клиент ещё не делал записей в дневнике.</p></Panel>;
  return (
    <ul className="space-y-3">
      {client.diary.map((d) => (
        <Panel key={d.id} className="flex gap-4">
          {d.url && <img src={d.url} alt="Фото кожи" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />}
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">{fmtDate(d.date)} <span className="rounded-full bg-accent/45 px-2 py-0.5 font-semibold text-foreground">{d.rating}/5</span></div>
            <p className="mt-1 break-words text-sm">{d.text}</p>
          </div>
        </Panel>
      ))}
    </ul>
  );
}

function PhotosTab({ client }: { client: Client }) {
  const { updateClient } = useStore();
  return (
    <div>
      {client.demo && <label className="mb-4 inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm hover:bg-muted">
        <Upload className="h-4 w-4" /> Загрузить фото
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            updateClient(client.id, (c) => ({
              ...c,
              photos: [...c.photos, { id: uid(), date: iso(new Date()), label: "Новое фото", url: URL.createObjectURL(f) }],
            }));
            toast.success("Фото добавлено");
          }}
        />
      </label>}
      <Panel><DynamicsGallery client={client} empty="Клиентка пока не добавляла фотографии." /></Panel>
    </div>
  );
}

function Library() {
  return <LibraryScreen />;
}

const SPEC_NOTIF = [["msgs", "Сообщения клиентов"], ["diary", "Дневники клиентов"], ["photos", "Фото клиентов"], ["forms", "Новые анкеты"]] as const;

function SettingsScreen() {
  const { user } = useAuth();
  const [ns, setNs] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!user) return;
    supabase.from("notification_settings").select("settings").eq("user_id", user.id).maybeSingle().then(({ data }) => setNs((data?.settings ?? {}) as Record<string, boolean>));
  }, [user]);
  const saveNs = async (next: Record<string, boolean>) => {
    if (!user) return;
    setNs(next);
    const { error } = await supabase.from("notification_settings").upsert({ user_id: user.id, settings: next as never });
    if (error) toast.error("Не удалось сохранить настройки");
  };
  return (
    <>
      <PageTitle eyebrow="Настройки" title="Профиль и уведомления" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="space-y-3">
          <h3 className="font-sans text-base font-semibold">Профиль специалиста</h3>
          <Input defaultValue="Анна Зорина" />
          <Input defaultValue="Косметолог-эстетист" />
          <Textarea defaultValue="Сопровождение клиентов по домашнему уходу, мягкое введение активов." rows={3} />
          <Button size="sm" onClick={() => toast.success("Сохранено")}>Сохранить</Button>
        </Panel>
        <Panel className="space-y-4">
          <h3 className="font-sans text-base font-semibold">Уведомления</h3>
          <p className="text-xs text-muted-foreground">Отключение выключает только push на телефон — внутри приложения уведомления сохраняются.</p>
          {SPEC_NOTIF.map(([k, l]) => (
            <label key={k} className="flex items-center justify-between gap-4 text-sm">
              {l}
              <Switch checked={ns[k] !== false} onCheckedChange={(v) => void saveNs({ ...ns, [k]: v })} />
            </label>
          ))}
        </Panel>
      </div>
    </>
  );
}
