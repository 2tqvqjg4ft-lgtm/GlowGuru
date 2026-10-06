import { usePersistentState } from "@/lib/ui-state";
import { useEffect, useRef, useState } from "react";
import { NotificationBell, useNotifications, type AppNotification } from "./NotificationCenter";
import { Bell, Camera, FlaskConical, CalendarDays, Check, History, MessageSquareText, NotebookPen, Sun, Moon, User, ListChecks, Upload, PackageSearch, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { appliesOn, describeExtra, describeStages, stepsFor, iso, stageOn, uid, FREQ_LABEL, type Client, type Slot } from "@/lib/demo-data";
import { DEMO_CLIENTS, Q_LABELS, useStore, type QuestionnaireData } from "@/lib/store";
import { uploadClientPhoto } from "@/lib/photos";
import { cn } from "@/lib/utils";
import { HistoryList } from "./SpecialistApp";
import { ProductSheet } from "./ProductSheet";
import { withChoices } from "@/lib/alternatives";
import type { Step } from "@/lib/demo-data";
import { NotificationSettingsScreen, UvCard } from "./NotificationSettings";
import { ClientMessages } from "./Messages";
import { ClientCare } from "./CareReview";
import { CITIES, DEFAULT_NOTIFICATIONS, nowInTz, stepsWord, toMinutes, type NotificationSettings } from "@/lib/notifications";
import { cancelEveningPush, syncPushSchedule } from "@/lib/push.browser";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ActivesCalendar, AppShell, PageTitle, Panel, SectionTitle, PhotoTile, ProductImage, Tag, fmtDate, type Section, CreamHeart, pearlDrop, DynamicsGallery, scheduledSteps } from "./shared";

const SECTIONS: Section[] = [
  { key: "today", label: "Сегодня", icon: Sun, primary: true },
  { key: "plan", label: "Мой план ухода", short: "План", icon: ListChecks, primary: true },
  { key: "messages", label: "Сообщения", short: "Чат", icon: MessageSquareText, primary: true },
  { key: "care", label: "Мой текущий уход", short: "Мой уход", icon: PackageSearch },
  { key: "calendar", label: "Календарь", icon: CalendarDays },
  { key: "diary", label: "Дневник кожи", short: "Дневник", icon: NotebookPen, primary: true },
  { key: "history", label: "История рекомендаций", short: "История", icon: History },
  { key: "notifications", label: "Настройки уведомлений", short: "Уведомления", icon: Bell },
  { key: "profile", label: "Профиль", icon: User },
];

/** Загружает сохранённые настройки и пересобирает расписание push при любых изменениях схемы/настроек. */
function usePushSync(client: Client, preview = false) {
  const { user } = useAuth();
  const { updateClient, product } = useStore();
  const [loaded, setLoaded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (!user || preview || user.id !== client.id) return;
    supabase.from("notification_settings").select("settings").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data?.settings && Object.keys(data.settings).length)
        updateClient(client.id, (c) => ({ ...c, notifications: { ...DEFAULT_NOTIFICATIONS, ...(data.settings as Partial<NotificationSettings>) } }));
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  const settings = client.notifications ?? DEFAULT_NOTIFICATIONS;
  const sig = JSON.stringify([settings, client.routine, client.photos.map((p) => p.date)]);
  useEffect(() => {
    if (!user || !loaded || preview || user.id !== client.id) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      syncPushSchedule(user.id, client, settings, product).catch(() => toast.error("Не удалось обновить расписание напоминаний"));
    }, 800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, user, loaded]);
}

export function ClientApp() {
  const { clients, loading } = useStore();
  const { user, role } = useAuth();
  const preview = role === "specialist";
  if (loading || !user || !role) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Загрузка…</div>;
  // Клиент — только своя карточка (привязка по ID учётной записи). Специалист — предпросмотр на демо-карточке.
  const client = preview ? DEMO_CLIENTS[0] : clients.find((c) => c.id === user.id);
  if (!client) return <div className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-muted-foreground">Не удалось загрузить ваш кабинет. Обновите страницу.</div>;
  if (!preview && !client.questionnaireDone) return <Onboarding client={client} />;
  return <ClientCabinet client={client} preview={preview} />;
}

function Onboarding({ client }: { client: Client }) {
  const { updateClient } = useStore();
  const [first, ...rest] = client.name === "Без имени" ? [""] : client.name.split(" ");
  const [f, setF] = useState<QuestionnaireData>({ firstName: first ?? "", lastName: rest.join(" "), birthDate: client.birthDate ?? "", complaints: "", skinType: "", currentCare: "", actives: "", allergies: "", restrictions: "", goal: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof QuestionnaireData) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value.slice(0, 1000) });
  const submit = async () => {
    if (!f.firstName.trim()) { toast.error("Укажите имя"); return; }
    setBusy(true);
    const name = `${f.firstName.trim()} ${f.lastName.trim()}`.trim();
    const data = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim()]));
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("profiles").update({ full_name: name, birth_date: f.birthDate || null }).eq("id", client.id),
      supabase.from("questionnaires").upsert({ client_id: client.id, data }),
    ]);
    setBusy(false);
    if (e1 || e2) { toast.error("Не удалось сохранить анкету"); return; }
    const age = f.birthDate ? Math.floor((Date.now() - new Date(f.birthDate).getTime()) / 31557600000) : 0;
    updateClient(client.id, (c) => ({ ...c, name, age, birthDate: f.birthDate || null, questionnaireDone: true }));
    toast.success("Анкета отправлена специалисту");
  };
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <PageTitle eyebrow="Добро пожаловать в GLOWGURU" title="Анкета о коже" />
      <Panel className="space-y-3">
        <p className="text-sm text-muted-foreground">Заполните один раз — специалист увидит ответы и подготовит персональный план.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input value={f.firstName} onChange={set("firstName")} placeholder="Имя" />
          <Input value={f.lastName} onChange={set("lastName")} placeholder="Фамилия" />
        </div>
        <label className="block text-xs text-muted-foreground">Дата рождения
          <Input type="date" value={f.birthDate} onChange={set("birthDate")} className="mt-1" />
        </label>
        {Q_LABELS.map(([k, label]) => <Textarea key={k} value={f[k]} onChange={set(k)} placeholder={label} rows={2} />)}
        <Button className="w-full" disabled={busy} onClick={submit}>{busy ? "Сохраняем…" : "Отправить анкету"}</Button>
      </Panel>
    </div>
  );
}

function ClientCabinet({ client: initial, preview }: { client: Client; preview: boolean }) {
  const { clients } = useStore();
  const client = clients.find((c) => c.id === initial.id) ?? initial;
  const [section, setSection] = usePersistentState(preview ? "cl:preview-section" : "cl:section", "today");
  const notif = useNotifications();
  const planNew = !preview && client.published && !client.viewedAt ? 1 : 0;
  const sections = SECTIONS.map((s) => (s.key === "messages" ? { ...s, badge: notif.unreadChat } : s.key === "plan" ? { ...s, badge: planNew } : s.key === "care" ? { ...s, badge: notif.items.filter((n) => !n.read_at && n.entity_type === "care").length } : s));
  const openNotification = (n: AppNotification) => {
    setSection(n.entity_type === "chat" ? "messages" : n.entity_type === "plan" ? "plan" : n.entity_type === "photos" ? "diary" : n.entity_type === "care" ? "care" : "today");
  };
  usePushSync(client, preview);
  const empty = !preview && !client.published;
  const view = withChoices(client);
  const { markPlanViewed } = useStore();
  useEffect(() => {
    if (!preview && client.published && !client.viewedAt && section === "today") void markPlanViewed(client.id);
  }, [preview, client.published, client.viewedAt, client.id, section, markPlanViewed]);

  return (
    <AppShell canSwitch={preview} role="client" subtitle={preview ? "Предпросмотр кабинета клиента · демо" : `Кабинет клиента · ${client.name}`} sections={sections} active={section} onChange={setSection} headerRight={preview ? undefined : <NotificationBell n={notif} onOpen={openNotification} />}>
      {preview && (
        <div className="mb-4 rounded-2xl bg-accent/40 px-4 py-3 text-sm text-accent-foreground">
          Режим предпросмотра: так кабинет выглядит для клиента. Показана демо-карточка, настоящие клиенты её не видят.
        </div>
      )}
      {empty && ["today", "plan", "calendar", "history"].includes(section) ? (
        <EmptyPlan name={client.name} />
      ) : (
        <>
      {section === "today" && <Today client={view} go={setSection} />}
      {section === "messages" && <ClientMessages />}
      {section === "care" && (preview ? <Panel><p className="text-sm text-muted-foreground">В предпросмотре загрузка недоступна.</p></Panel> : <ClientCare clientId={client.id} />)}
      {section === "notifications" && <NotificationSettingsScreen client={client} />}
      {section === "plan" && <Plan client={view} raw={client} readOnly={preview} />}
      {section === "calendar" && (
        <>
          <PageTitle eyebrow="Календарь" title="Когда использовать активы" />
          <ActivesCalendar client={view} />
        </>
      )}
      {section === "diary" && <Diary client={client} />}
      {section === "history" && (
        <>
          <PageTitle eyebrow="История рекомендаций" title="Как менялся ваш уход" />
          <HistoryList client={client} />
        </>
      )}
      {section === "profile" && <Profile client={client} />}
        </>
      )}
    </AppShell>
  );
}

function EmptyPlan({ name }: { name: string }) {
  const first = name.split(" ")[0];
  return (
    <div className="surface mx-auto mt-6 max-w-xl p-8 text-center animate-fade-up">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent/50 text-primary">
        <Sun className="h-6 w-6" />
      </div>
      <h1 className="font-display text-2xl font-semibold text-primary">Добро пожаловать в GLOWGURU{first ? `, ${first}` : ""}!</h1>
      <p className="mt-3 text-sm text-muted-foreground">Ваш персональный план ухода пока не опубликован специалистом.</p>
      <p className="mt-2 text-sm text-muted-foreground">Специалист подготовит рекомендации после консультации. Пока можно вести дневник кожи и настроить уведомления.</p>
    </div>
  );
}

function useCareStatus(clientId: string) {
  const [r, setR] = useState<{ id: string; status: string } | null>(null);
  const [seen, setSeen] = useState<string | null>(null);
  useEffect(() => {
    setSeen(localStorage.getItem(`care-seen-${clientId}`));
    void supabase.from("care_reviews").select("id,status").eq("client_id", clientId).neq("status", "draft").order("created_at", { ascending: false }).limit(1).maybeSingle().then(({ data }) => setR(data));
  }, [clientId]);
  return {
    status: r?.status ?? null,
    badge: r?.status === "done" && seen !== r.id,
    markSeen: () => { if (r?.status === "done") { localStorage.setItem(`care-seen-${clientId}`, r.id); setSeen(r.id); } },
  };
}

function Today({ client, go }: { client: Client; go: (k: string) => void }) {
  const { product } = useStore();
  const today = new Date();
  const key = iso(today);
  const settings = client.notifications ?? DEFAULT_NOTIFICATIONS;
  const tz = CITIES.find((c) => c.city === settings.city)?.timezone ?? settings.timezone;
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 30_000); return () => clearInterval(t); }, []);
  const now = nowInTz(tz);
  void tick;
  const hour = now.hour;
  const greet = hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер";
  const am = stepsFor(client, "am", today);
  const pm = stepsFor(client, "pm", today);
  const done = client.done[key] ?? { am: [], pm: [] };
  const activesToday = [...am, ...pm].filter((s) => product(s.productId)?.active);
  const [open, setOpen] = useState<Slot>(hour < 15 ? "am" : "pm");
  const care = useCareStatus(client.id);
  const scheduled = scheduledSteps(client, product).filter((x) => !x.step.paused);
  const slotRef = useRef<HTMLDivElement>(null);

  const count = (slot: Slot, list: typeof am) => list.filter((s) => done[slot].includes(s.id)).length;
  const eveningActive = pm.some((s) => product(s.productId)?.active);
  const morningActive = am.some((s) => product(s.productId)?.active);
  const focus: Slot = hour < 15 ? "am" : "pm";
  const focusList = focus === "am" ? am : pm;
  const focusLeft = focusList.length - count(focus, focusList);
  const pmLeft = pm.length - count("pm", pm);
  const eveMin = toMinutes(settings.eveningTime);
  const eveDue = now.minutes >= eveMin;
  const eveLate = now.minutes >= eveMin + 60;
  const eveDone = pm.length > 0 && pmLeft === 0;
  const eveState = eveDone ? "Вечерний уход выполнен ✓" : !eveDue ? `Вечерний уход в ${settings.eveningTime}` : eveLate ? "Вечерний уход ждёт вас" : "Пора на вечерний уход";
  const ctaLeft = focus === "pm" ? pmLeft : focusLeft;
  const ctaText = focus === "pm"
    ? eveDone || pm.length === 0 ? "Вечерний уход выполнен ✓" : pmLeft === 1 ? "Остался 1 шаг" : `Осталось ${pmLeft} вечером`
    : focusLeft > 0 ? (focusLeft === 1 ? "Остался 1 шаг" : `Осталось ${focusLeft} утром`) : "Утренний уход выполнен ✓";
  const pulse = focus === "pm" ? eveDue && !eveDone && pm.length > 0 : focusLeft > 0 && now.minutes >= toMinutes(settings.morningTime);
  const goSlot = (slot: Slot) => { setOpen(slot); requestAnimationFrame(() => slotRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })); };
  const { user } = useAuth();
  useEffect(() => { if (eveDone && user && user.id === client.id) void cancelEveningPush(user.id, now.date); }, [eveDone, user, client.id, now.date]);
  const headline =
    focus === "am"
      ? morningActive ? "Утро с активом" : "Спокойное утро"
      : eveningActive ? "Вечер с активом" : "Вечер восстановления";

  const Ring = ({ value, total, inverted }: { value: number; total: number; inverted?: boolean }) => {
    const r = 17;
    const c = 2 * Math.PI * r;
    const pct = total ? value / total : 0;
    return (
      <svg viewBox="0 0 40 40" className="h-11 w-11 -rotate-90" aria-hidden>
        <circle cx="20" cy="20" r={r} fill="none" strokeWidth="3.5" className={inverted ? "stroke-primary-foreground/20" : "stroke-muted"} />
        <circle
          cx="20" cy="20" r={r} fill="none" strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          className={cn("transition-[stroke-dashoffset] duration-500", inverted ? "stroke-accent" : "stroke-secondary")}
        />
      </svg>
    );
  };

  const MiniSlot = ({ slot, list }: { slot: Slot; list: typeof am }) => {
    const c = count(slot, list);
    const Icon = slot === "am" ? Sun : Moon;
    const sel = open === slot;
    return (
      <button
        onClick={() => setOpen(slot)}
        aria-pressed={sel}
        className={cn(
          "min-w-0 rounded-[1.5rem] p-4 text-left transition-all active:scale-[0.98]",
          sel ? "surface text-foreground ring-1 ring-[#B9A7F5]/60 shadow-[0_0_18px_rgba(185,167,245,0.35)]" : "surface text-foreground",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <span className={cn("flex h-6 w-6 items-center justify-center rounded-full", sel ? "bg-[#E9E3FF] text-[#9E87EB]" : "bg-accent/45 text-secondary")}><Icon className="h-3.5 w-3.5" /></span>
              <span className="opacity-70">{slot === "am" ? settings.morningTime : settings.eveningTime}</span>
            </div>
            <div className="mt-2 text-lg font-semibold leading-none">{slot === "am" ? "Утро" : "Вечер"}</div>
          </div>
          <div className="relative shrink-0">
            <Ring value={c} total={list.length} inverted={false} />
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums">{c}/{list.length}</span>
          </div>
        </div>
        <div className="mt-2 text-xs opacity-70">{list.length === 0 ? "нет шагов" : c === list.length ? "выполнено" : `осталось ${list.length - c}`}</div>
      </button>
    );
  };

  return (
    <>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
        <p className="text-sm font-medium capitalize text-muted-foreground">{today.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="font-display text-[2.3rem] font-medium leading-[1.05] md:text-5xl">{greet}, {client.name.split(" ")[0]}</h1>
        </div>
        <CreamHeart />
      </div>

      {/* Акцентный виджет плана на сегодня */}
      <section className="hero-pearl relative mb-4 overflow-hidden rounded-[2rem] p-5 text-navy sm:p-6">
        <img src={pearlDrop} alt="" aria-hidden className="pointer-events-none absolute -right-3 -bottom-4 w-24 rotate-12 opacity-95 sm:w-32" />
        <div className="relative pr-16">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 glass-soft rounded-full px-3 py-1 text-xs font-medium"><span className="h-1.5 w-1.5 rounded-full bg-lime" />План на сегодня</span>
            <span className="text-sm font-semibold tabular-nums text-secondary">{focus === "am" ? settings.morningTime : settings.eveningTime}</span>
          </div>
          <h2 className="mt-4 font-display text-[2rem] font-medium leading-none">{headline}</h2>
          {focus === "pm" && pm.length > 0 && <div className="mt-1.5 text-sm font-semibold text-secondary">{eveState}</div>}
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {am.length + pm.length} шагов за день
            {activesToday.length > 0 ? ` · активы: ${activesToday.map((s) => product(s.productId)?.name).join(", ")}` : " · без активов"}
          </p>
          <button
            onClick={() => goSlot(focus)}
            className={cn("mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-panel transition-transform hover:-translate-y-0.5 active:scale-[0.97]", pulse && "cta-glow")}
          >
            {ctaText}
            {ctaLeft > 0 ? <ChevronDown className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          </button>
        </div>
      </section>

      {eveDue && !eveDone && pm.length > 0 && (
        <button onClick={() => goSlot("pm")} className="surface mb-4 flex w-full items-center gap-3 p-3.5 text-left transition-transform active:scale-[0.99]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lilac/60"><Moon className="h-5 w-5 text-navy" /></span>
          <span className="min-w-0 flex-1"><span className="block font-semibold">Пора на вечерний уход</span><span className="block text-xs text-muted-foreground">Осталось {pmLeft} {stepsWord(pmLeft)} · назначено на {settings.eveningTime}</span></span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniSlot slot="am" list={am} />
        <MiniSlot slot="pm" list={pm} />
        <UvCard city={settings.city} threshold={settings.spfThreshold} />
        <button onClick={() => { care.markSeen(); go("care"); }} className="surface relative min-w-0 p-4 text-left transition-transform active:scale-[0.98]">
          {care.badge && <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" aria-label="Новый разбор" />}
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/45"><PackageSearch className="h-4 w-4 text-secondary" /></span>
          <div className="mt-3 text-base font-semibold leading-tight">{care.status === "done" ? "Разбор ухода готов" : care.status === "submitted" || care.status === "in_review" ? "Уход отправлен на разбор" : "Загрузите ваш уход"}</div>
          <div className="mt-1 text-xs text-muted-foreground">{care.status === "done" ? "Посмотрите решения специалиста" : care.status ? "Специалист скоро ответит" : "Покажите средства, которыми пользуетесь сейчас"}</div>
        </button>
      </div>


      {scheduled.length > 0 && (
        <button onClick={() => go("calendar")} className="surface mt-4 block w-full p-4 text-left transition-transform active:scale-[0.99]">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex flex-1 items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"><FlaskConical className="h-4 w-4" /> Активы по графику</span>
            <CalendarDays className="h-4 w-4 text-muted-foreground" /><ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          {scheduled.length > 1 && <div className="mb-1.5 text-sm font-semibold">{scheduled.length} {scheduled.length < 5 ? "актива" : "активов"}</div>}
          <ul className="space-y-1.5">
            {scheduled.map(({ step: s, slots }) => {
              const st = stageOn(s, today);
              return (
                <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 break-words font-medium">{product(s.productId)?.name}{appliesOn(s, today) && <span className="ml-1.5 rounded-full bg-[#E9E3FF] px-1.5 py-0.5 text-[10px] font-semibold text-[#9E87EB]">сегодня</span>}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{s.schedule ? describeExtra(s) : `${slots[0] === "am" ? "утро" : "вечер"}${st ? ` · ${FREQ_LABEL[String(st.stage.freq)]}` : ""}`}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 text-xs font-semibold text-secondary">Смотреть календарь →</div>
        </button>
      )}

      <div ref={slotRef} className="mt-6 scroll-mt-4">
        <SlotToday client={client} slot={open} />
      </div>
    </>
  );
}

function SlotToday({ client, slot }: { client: Client; slot: Slot }) {
  const { product, updateClient } = useStore();
  const today = new Date();
  const key = iso(today);
  const steps = stepsFor(client, slot, today);
  const done = client.done[key]?.[slot] ?? [];
  const allDone = steps.length > 0 && steps.every((s) => done.includes(s.id));

  const toggle = (id: string) =>
    updateClient(client.id, (c) => {
      const day = c.done[key] ?? { am: [], pm: [] };
      const list = day[slot].includes(id) ? day[slot].filter((x) => x !== id) : [...day[slot], id];
      return { ...c, done: { ...c.done, [key]: { ...day, [slot]: list } } };
    });

  const Icon = slot === "am" ? Sun : Moon;
  return (
    <Panel key={slot} className={cn("animate-scale-in", allDone && "ring-1 ring-secondary/40")}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/50"><Icon className="h-4 w-4 text-secondary" /></span>
          <h2 className="font-sans text-lg font-semibold tracking-tight">Средства на {slot === "am" ? "утро" : "вечер"}</h2>
        </div>
        <span className="text-xs text-muted-foreground">{done.filter((d) => steps.some((s) => s.id === d)).length}/{steps.length}</span>
      </div>
      <ol className="space-y-2">
        {steps.map((s, i) => {
          const p = product(s.productId);
          const isDone = done.includes(s.id);
          return (
            <li key={s.id}>
              <button
                onClick={() => toggle(s.id)}
                className={cn("flex w-full gap-3 rounded-[1.25rem] p-2.5 text-left transition-all duration-300 active:scale-[0.99]", isDone ? "bg-accent/25 opacity-70" : "bg-muted/45 hover:bg-muted/70")}
              >
                <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors", isDone ? "bg-secondary text-secondary-foreground" : "bg-card text-muted-foreground shadow-panel")}>
                  {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <ProductImage product={p} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("break-words text-sm font-medium", isDone && "text-muted-foreground")}>{p?.name}</span>
                    {p?.active && <Tag tone="sky">актив</Tag>}
                  </div>
                  <p className="mt-1 text-xs text-foreground/70">{s.usage || p?.instruction}</p>
                  {s.note && <p className="mt-1 text-xs text-secondary">Комментарий специалиста: {s.note}</p>}
                  {s.advice && <p className="mt-1 text-xs text-secondary">Рекомендация: {s.advice}</p>}
                </div>
              </button>
            </li>
          );
        })}
      </ol>
      <Button
        className="mt-4 w-full"
        variant={allDone ? "secondary" : "default"}
        disabled={steps.length === 0}
        onClick={() => {
          updateClient(client.id, (c) => {
            const day = c.done[key] ?? { am: [], pm: [] };
            return { ...c, done: { ...c.done, [key]: { ...day, [slot]: allDone ? [] : steps.map((s) => s.id) } } };
          });
          if (!allDone) toast.success(slot === "am" ? "Утренний уход выполнен" : "Вечерний уход выполнен");
        }}
      >
        {allDone ? "Уход выполнен ✓" : "Отметить весь уход выполненным"}
      </Button>
    </Panel>
  );
}

function Plan({ client, raw, readOnly }: { client: Client; raw: Client; readOnly: boolean }) {
  const { product } = useStore();
  const today = new Date();
  const [open, setOpen] = useState<Step | null>(null);
  const openStep = (id: string) => setOpen([...raw.routine.am, ...raw.routine.pm, ...(raw.routine.extra ?? [])].find((s) => s.id === id) ?? null);
  return (
    <>
      <ProductSheet client={raw} step={open} onClose={() => setOpen(null)} readOnly={readOnly} />
      <PageTitle eyebrow="Мой план ухода" title="Порядок нанесения" />
      <div className="grid gap-6 xl:grid-cols-2">
        {(["am", "pm"] as const).map((slot) => (
          <Panel key={slot}>
            <div className="mb-4 flex items-center gap-3"><span className={cn("flex h-10 w-10 items-center justify-center rounded-full", slot === "am" ? "bg-sand/40" : "bg-accent/50")}>{slot === "am" ? <Sun className="h-4 w-4 text-secondary" /> : <Moon className="h-4 w-4 text-secondary" />}</span><h2 className="font-sans text-lg font-semibold">{slot === "am" ? "Утро" : "Вечер"}</h2></div>
            <ol className="space-y-2">
              {client.routine[slot].map((s, i) => {
                const p = product(s.productId);
                const st = stageOn(s, today);
                return (
                  <li key={s.id} className={cn("flex gap-3 rounded-[1.25rem] bg-muted/45 p-3", s.paused && "opacity-60")}>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{i + 1}</span>
                    <button type="button" onClick={() => openStep(s.id)} aria-label={`Открыть карточку: ${p?.name ?? "средство"}`} className="shrink-0 self-start"><ProductImage product={p} size="sm" /></button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 break-words text-sm font-semibold">
                        <button type="button" onClick={() => openStep(s.id)} className="min-w-0 break-words text-left underline-offset-2 hover:underline">{p?.name}</button>
                        {s.chosenFrom && <Tag tone="sky">ваш выбор</Tag>}
                        {!s.chosenFrom && !!s.alternatives?.length && <Tag>есть альтернативы</Tag>}
                        {s.paused && <Tag tone="sand">пауза</Tag>}
                      </div>
                      <div className="text-xs text-muted-foreground">{p?.brand}</div>
                      <p className="mt-1 text-xs text-foreground/75">{s.usage || p?.instruction}</p>
                      {p?.active && (
                        <div className="mt-2 rounded-xl bg-accent/35 px-3 py-2 text-xs">
                          <div>Сейчас: <b>{st ? FREQ_LABEL[String(st.stage.freq)] : "—"}</b></div>
                          <div className="text-muted-foreground">План: {describeStages(s.stages)}</div>
                        </div>
                      )}
                      {s.note && <p className="mt-1 text-xs text-secondary">Комментарий специалиста: {s.note}</p>}
                      {s.advice && <p className="mt-1 text-xs text-secondary">Рекомендация: {s.advice}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Panel>
        ))}
      </div>
      <ExtraCare client={client} onOpen={openStep} />
    </>
  );
}

function ExtraCare({ client, onOpen }: { client: Client; onOpen: (id: string) => void }) {
  const { product } = useStore();
  const [open, setOpen] = useState(false);
  const list = client.routine.extra ?? [];
  if (!list.length) return null;
  const n = list.length;
  return (
    <Panel className="mt-6">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 text-left">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lilac/60"><Sparkles className="h-4 w-4 text-navy" /></span>
        <span className="flex-1 font-sans text-lg font-semibold">Дополнительный уход <span className="text-sm font-medium text-muted-foreground">· {n} {n % 10 === 1 && n % 100 !== 11 ? "средство" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "средства" : "средств"}</span></span>
        <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="mt-4 space-y-2 animate-fade-in">
          {list.map((s) => {
            const p = product(s.productId);
            return (
              <li key={s.id} className={cn("flex gap-3 rounded-[1.25rem] bg-muted/45 p-3", s.paused && "opacity-60")}>
                <button type="button" onClick={() => onOpen(s.id)} aria-label={`Открыть карточку: ${p?.name ?? "средство"}`} className="shrink-0 self-start"><ProductImage product={p} size="sm" /></button>
                <div className="min-w-0 flex-1">
                  {p?.brand && <div className="text-xs text-muted-foreground">{p.brand}</div>}
                  <div className="flex flex-wrap items-center gap-2 break-words text-sm font-semibold"><button type="button" onClick={() => onOpen(s.id)} className="min-w-0 break-words text-left hover:underline">{p?.name}</button>{s.chosenFrom && <Tag tone="sky">ваш выбор</Tag>}{s.paused && <Tag tone="sand">пауза</Tag>}</div>
                  {(s.usage || p?.instruction) && <p className="mt-1 text-xs text-foreground/75">{s.usage || p?.instruction}</p>}
                  <div className="mt-2 inline-block rounded-xl bg-accent/35 px-2.5 py-1 text-xs">{describeExtra(s)}</div>
                  {s.note && <p className="mt-1 text-xs text-secondary">Комментарий специалиста: {s.note}</p>}
                  {s.advice && <p className="mt-1 text-xs text-secondary">Рекомендация: {s.advice}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function Diary({ client }: { client: Client }) {
  const { updateClient } = useStore();
  const [text, setText] = useState("");
  const [rating, setRating] = useState(4);
  const [url, setUrl] = useState<string>();
  const [path, setPath] = useState<string>();
  const [busy, setBusy] = useState(false);
  const upload = async (file: File | undefined, cb: (r: { path: string; url: string }) => void) => {
    if (!file) return;
    if (client.demo) return cb({ path: "", url: URL.createObjectURL(file) });
    setBusy(true);
    try { cb(await uploadClientPhoto(client.id, file)); } catch (e) { toast.error(e instanceof Error ? e.message : "Не удалось загрузить фото"); } finally { setBusy(false); }
  };

  return (
    <>
      <PageTitle eyebrow="Дневник кожи" title="Как чувствует себя кожа" />
      <Panel className="mb-6">
        <SectionTitle>Самочувствие кожи сегодня</SectionTitle>
        <div className="mb-4 grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setRating(n)} aria-pressed={n === rating} className={cn("flex h-12 flex-col items-center justify-center rounded-2xl text-sm font-semibold transition-all", n === rating ? "bg-secondary text-secondary-foreground shadow-glow" : n < rating ? "bg-accent/45" : "bg-muted/60 text-muted-foreground")}>
              {n}
              <span className="text-[10px] font-medium opacity-75">{["плохо", "так себе", "норм", "хорошо", "отлично"][n - 1]}</span>
            </button>
          ))}
        </div>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Заметки: сухость, покраснения, ощущения после активов…" rows={3} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-muted/70 px-4 text-sm font-medium text-foreground hover:bg-muted">
            <Upload className="h-4 w-4" /> {busy ? "Загружаем…" : url ? "Фото прикреплено" : "Прикрепить фото"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0], (r) => { setUrl(r.url); setPath(r.path || undefined); })} />
          </label>
          <Button
            size="sm"
            disabled={(!text.trim() && !url) || busy}
            onClick={() => {
              updateClient(client.id, (c) => ({ ...c, diary: [{ id: uid(), date: iso(new Date()), rating, text: text.trim().slice(0, 2000), url, path }, ...c.diary] }));
              setText("");
              setUrl(undefined);
              setPath(undefined);
              toast.success("Запись сохранена — специалист её увидит");
            }}
          >
            Сохранить запись
          </Button>
        </div>
      </Panel>
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
      <h3 className="mb-3 mt-8 font-sans text-base font-semibold">Фото динамики</h3>
      <DynamicsGallery client={client} empty="Вы пока не добавляли фотографии" />
    </>
  );
}

function Profile({ client }: { client: Client }) {
  const { user } = useAuth();
  const { updateClient } = useStore();
  const [name, setName] = useState(client.name);
  const [phone, setPhone] = useState(client.phone);
  const save = async () => {
    if (client.demo) {
      toast.info("В предпросмотре изменения не сохраняются");
      return;
    }
    const { error } = await supabase.from("profiles").update({ full_name: name.trim(), phone: phone.trim() || null }).eq("id", client.id);
    if (error) {
      toast.error("Не удалось сохранить");
      return;
    }
    updateClient(client.id, (c) => ({ ...c, name: name.trim(), phone: phone.trim() }));
    toast.success("Сохранено");
  };
  return (
    <>
      <PageTitle eyebrow="Профиль" title={client.name} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя" maxLength={100} />
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Телефон" maxLength={30} />
          <Input value={client.demo ? client.email : (user?.email ?? "")} readOnly disabled />
          <Button size="sm" onClick={save}>Сохранить</Button>
        </Panel>
        <Panel className="space-y-2 text-sm">
          <div><span className="text-muted-foreground">Тип кожи: </span>{client.skinType || "не указан"}</div>
          <div><span className="text-muted-foreground">Цель ухода: </span>{client.goal || "не указана"}</div>
          <div><span className="text-muted-foreground">Аллергии: </span>{client.allergies || "не указаны"}</div>
          <div><span className="text-muted-foreground">Специалист: </span>Анна Зорина</div>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => supabase.auth.signOut().then(() => (window.location.href = "/auth"))}>Выйти</Button>
        </Panel>
      </div>
    </>
  );
}
