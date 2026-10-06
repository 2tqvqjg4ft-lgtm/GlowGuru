import { useState } from "react";
import { ProductPicker } from "./ProductPicker";
import { ArrowDown, ArrowUp, CalendarDays, Moon, Pause, Play, Plus, Repeat, Sparkles, Sun, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FREQ_LABEL,
  appliesOn,
  describeExtra,
  describeStages,
  iso,
  WEEKDAY_SHORT,
  type ExtraSchedule,
  stageOn,
  uid,
  type Client,
  type Freq,
  type Slot,
  type Stage,
  type Step,
} from "@/lib/demo-data";
import { useStore } from "@/lib/store";
import { usePersistentState } from "@/lib/ui-state";
import { suggestAlternatives, THERAPY } from "@/lib/alternatives";
import { mainCategory } from "@/lib/taxonomy";
import { Panel, ProductImage, Tag } from "./shared";

const FREQS: Freq[] = [1, 2, 3, 4, 5, "every_other", "daily"];
const SLOT_LABEL: Record<Slot, string> = { am: "Утро", pm: "Вечер" };

const STATUS: Record<NonNullable<Client["planStatus"]>, { label: string; tone: "sky" | "sand" | "muted" }> = {
  none: { label: "Черновик", tone: "muted" },
  draft: { label: "Черновик", tone: "muted" },
  published: { label: "Опубликовано", tone: "sky" },
  dirty: { label: "Есть неопубликованные изменения", tone: "sand" },
};

function schedulePreview(step: Step, startDate: string, stages: Stage[], horizonDays = 90) {
  if (!startDate) return [] as string[];
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return [] as string[];

  const previewStep: Step = { ...step, startDate, stages, paused: false };
  const dates: string[] = [];
  for (let offset = 0; offset <= horizonDays; offset++) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    if (appliesOn(previewStep, date)) dates.push(iso(date));
  }
  return dates;
}

function humanDate(value: string) {
  if (!value) return "Не выбрана";
  return new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

export function PublishBar({ client }: { client: Client }) {
  const { saveDraft, publish } = useStore();
  const [busy, setBusy] = useState<"" | "draft" | "pub">("");
  const st = STATUS[client.planStatus ?? "none"];
  const run = async (kind: "draft" | "pub") => {
    setBusy(kind);
    try {
      if (kind === "draft") {
        await saveDraft(client.id);
        toast.success("Черновик сохранён. Клиент его пока не видит");
      } else {
        await publish(client.id);
        toast.success("Схема опубликована клиенту");
      }
    } catch {
      toast.error("Не удалось сохранить. Проверьте соединение");
    } finally {
      setBusy("");
    }
  };
  return (
    <Panel className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">Статус схемы:</span>
          <Tag tone={st.tone}>{client.demo ? "демо" : st.label}</Tag>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {client.demo
            ? "Демо-карточка: изменения не сохраняются в базе."
            : client.publishedAt
              ? `Последняя публикация: ${new Date(client.publishedAt).toLocaleString("ru-RU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
              : "Схема ещё не публиковалась — клиент её не видит."}
        </p>
        {!client.demo && client.publishedAt && (
          <p className="mt-1 text-xs font-medium">
            {client.viewedAt
              ? `Клиентка открыла: ${new Date(client.viewedAt).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}`
              : "Клиентка ещё не открывала эту версию"}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={!!busy || client.demo} onClick={() => run("draft")}>
          {busy === "draft" ? "Сохраняем…" : "Сохранить черновик"}
        </Button>
        <Button size="sm" disabled={!!busy || client.demo} onClick={() => run("pub")}>
          {busy === "pub" ? "Публикуем…" : "Опубликовать клиенту"}
        </Button>
      </div>
    </Panel>
  );
}

export function RoutineEditor({ client }: { client: Client }) {
  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-2">
      {(["am", "pm"] as const).map((slot) => (
        <SlotColumn key={slot} client={client} slot={slot} />
      ))}
      <div className="xl:col-span-2"><ExtraColumn client={client} /></div>
    </div>
  );
}

function ExtraColumn({ client }: { client: Client }) {
  const { product, updateClient } = useStore();
  const [picking, setPicking] = usePersistentState(`routine:${client.id}:extra:picking`, false);
  const steps = client.routine.extra ?? [];
  const L = "Доп. уход";
  const setSteps = (fn: (s: Step[]) => Step[], log?: string) =>
    updateClient(client.id, (c) => ({ ...c, routine: { ...c.routine, extra: fn(c.routine.extra ?? []) } }), log);
  const name = (id: string) => product(id)?.name ?? "—";
  const add = (p: import("@/lib/demo-data").Product) => {
    setSteps((s) => [...s, { id: uid(), productId: p.id, note: "", paused: false, startDate: iso(new Date()), stages: [], schedule: { mode: "days", days: [0] }, times: ["pm"] }], `${L}: добавлено «${p.name}».`);
    toast.success("Средство добавлено в дополнительный уход");
  };
  return (
    <Panel className="min-w-0 bg-[color-mix(in_oklab,var(--lilac)_18%,var(--card))]">
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lilac/60"><Sparkles className="h-4 w-4 text-navy" /></span>
          <div className="min-w-0">
            <h3 className="break-words font-sans text-lg font-semibold">Дополнительный уход</h3>
            <p className="break-words text-xs text-muted-foreground">Маски, пудры, пилинги, крем для век, шея и декольте</p>
          </div>
        </div>
        <span className="glass-chip shrink-0 rounded-full px-2 py-1 text-xs font-medium text-primary/80">{steps.length} средств</span>
      </div>
      <ol className="grid min-w-0 gap-2.5 lg:grid-cols-2">
        {steps.map((s, i) => (
          <StepEditor key={s.id} step={s} index={i} total={steps.length} extra
            onMove={(dir) => setSteps((arr) => { const next = [...arr]; const [x] = next.splice(i, 1); if (x) next.splice(i + dir, 0, x); return next; })}
            onRemove={() => setSteps((arr) => arr.filter((x) => x.id !== s.id), `${L}: удалено «${name(s.productId)}».`)}
            onChange={(patch, log) => setSteps((arr) => arr.map((x) => (x.id === s.id ? { ...x, ...patch } : x)), log)}
          />
        ))}
      </ol>
      <Button variant="outline" className="mt-4 h-10 w-full rounded-full" onClick={() => setPicking(true)}><Plus className="h-4 w-4" /> Добавить из библиотеки</Button>
      <ProductPicker open={picking} onClose={() => setPicking(false)} onPick={add} />
    </Panel>
  );
}

const MODES: { key: ExtraSchedule["mode"]; label: string }[] = [
  { key: "daily", label: "Ежедневно" },
  { key: "days", label: "По дням недели" },
  { key: "dates", label: "По датам" },
  { key: "asneeded", label: "По необходимости" },
];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function ExtraScheduleEditor({ step, onChange }: { step: Step; onChange: (patch: Partial<Step>, log?: string) => void }) {
  const sc = step.schedule ?? { mode: "daily" as const };
  const times = step.times ?? ["pm"];
  const [date, setDate] = useState("");
  const set = (next: ExtraSchedule) => onChange({ schedule: next });
  const chip = (on: boolean) => cn("min-h-8 rounded-full border px-3 text-xs font-medium transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground");
  return (
    <div className="mt-3 space-y-2 rounded-2xl bg-accent/25 p-3">
      <div className="flex flex-wrap gap-1.5">
        {MODES.map((m) => <button key={m.key} className={chip(sc.mode === m.key)} onClick={() => set({ ...sc, mode: m.key, days: m.key === "days" ? (sc.days?.length ? sc.days : [0]) : sc.days })}>{m.label}</button>)}
      </div>
      {sc.mode === "days" && (
        <div className="flex flex-wrap gap-1">
          {WEEK_ORDER.map((d) => {
            const on = (sc.days ?? []).includes(d);
            return <button key={d} className={cn(chip(on), "w-10 px-0")} onClick={() => set({ ...sc, days: on ? (sc.days ?? []).filter((x) => x !== d) : [...(sc.days ?? []), d] })}>{WEEKDAY_SHORT[d]}</button>;
          })}
        </div>
      )}
      {sc.mode === "dates" && (
        <div className="space-y-1.5">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 min-w-0 w-full text-xs" />
            <Button size="sm" variant="outline" className="shrink-0" disabled={!date} onClick={() => { set({ ...sc, dates: [...new Set([...(sc.dates ?? []), date])].sort() }); setDate(""); }}>Добавить</Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {(sc.dates ?? []).map((d) => <button key={d} className={chip(true)} onClick={() => set({ ...sc, dates: (sc.dates ?? []).filter((x) => x !== d) })}>{d.split("-").reverse().join(".")} ×</button>)}
          </div>
        </div>
      )}
      {sc.mode !== "asneeded" && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Время:</span>
          {(["am", "pm"] as const).map((t) => {
            const on = times.includes(t);
            return <button key={t} className={chip(on)} onClick={() => { const n = on ? times.filter((x) => x !== t) : [...times, t]; if (n.length) onChange({ times: n }); }}>{t === "am" ? "Утро" : "Вечер"}</button>;
          })}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">{describeExtra(step)}</p>
    </div>
  );
}

function SlotColumn({ client, slot }: { client: Client; slot: Slot }) {
  const { product, updateClient } = useStore();
  const [picking, setPicking] = usePersistentState(`routine:${client.id}:${slot}:picking`, false);
  const steps = client.routine[slot];

  const setSteps = (fn: (s: Step[]) => Step[], log?: string) =>
    updateClient(client.id, (c) => ({ ...c, routine: { ...c.routine, [slot]: fn(c.routine[slot]) } }), log);

  const name = (id: string) => product(id)?.name ?? "—";

  const add = (p: import("@/lib/demo-data").Product) => {
    const adding = p.id;
    const stages: Stage[] = p?.active ? [{ freq: 2, weeks: 2 }, { freq: 3, weeks: null }] : [];
    setSteps(
      (s) => [...s, { id: uid(), productId: adding, note: "", paused: false, startDate: iso(new Date()), stages }],
      `${SLOT_LABEL[slot]}: добавлено «${p?.name}»${p?.active ? ` (${describeStages(stages)})` : ""}.`,
    );
    toast.success("Средство добавлено в схему");
  };

  return (
    <Panel className={cn("relative min-w-0", slot === "am" ? "bg-[color-mix(in_oklab,var(--sand)_14%,var(--card))]" : "bg-[color-mix(in_oklab,var(--accent)_20%,var(--card))]")}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className={cn("flex h-10 w-10 items-center justify-center rounded-full", slot === "am" ? "bg-sand/45" : "bg-primary text-primary-foreground")}>
            {slot === "am" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </span>
          <h3 className="font-sans text-lg font-semibold">{SLOT_LABEL[slot]}</h3>
        </div>
        <span className="glass-chip rounded-full px-3 py-1 text-xs font-medium text-primary/80">{steps.length} шагов</span>
      </div>
      <ol className="space-y-2.5">
        {steps.map((s, i) => (
          <StepEditor
            key={s.id}
            step={s}
            index={i}
            total={steps.length}
            onMove={(dir) =>
              setSteps((arr) => {
                const next = [...arr];
                const [x] = next.splice(i, 1);
                if (x) next.splice(i + dir, 0, x);
                return next;
              }, `${SLOT_LABEL[slot]}: изменён порядок нанесения «${name(s.productId)}».`)
            }
            onRemove={() => setSteps((arr) => arr.filter((x) => x.id !== s.id), `${SLOT_LABEL[slot]}: удалено «${name(s.productId)}».`)}
            onChange={(patch, log) => setSteps((arr) => arr.map((x) => (x.id === s.id ? { ...x, ...patch } : x)), log)}
          />
        ))}
      </ol>
      <Button variant="outline" className="mt-4 h-10 w-full rounded-full" onClick={() => setPicking(true)}><Plus className="h-4 w-4" /> Добавить из библиотеки</Button>
      <ProductPicker open={picking} onClose={() => setPicking(false)} onPick={add} />
    </Panel>
  );
}

function StepEditor({
  step,
  index,
  total,
  onMove,
  onRemove,
  onChange,
  extra,
}: {
  extra?: boolean;
  step: Step;
  index: number;
  total: number;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onChange: (patch: Partial<Step>, log?: string) => void;
}) {
  const { product, products } = useStore();
  const p = product(step.productId);
  const [altOpen, setAltOpen] = usePersistentState(`routine:${step.id}:alts`, false);
  const [altPick, setAltPick] = useState(false);
  const alts = step.alternatives ?? [];
  const setAlts = (next: NonNullable<Step["alternatives"]>) => onChange({ alternatives: next });
  const suggestions = altOpen ? suggestAlternatives(p, products, alts.map((a) => a.productId)) : [];
  const [replacing, setReplacing] = usePersistentState(`routine:${step.id}:replacing`, false);
  const [editing, setEditing] = usePersistentState(`routine:${step.id}:editing`, false);
  const [draft, setDraft] = usePersistentState<Stage[]>(`routine:${step.id}:stages`, step.stages);
  const [startDateDraft, setStartDateDraft] = usePersistentState<string>(`routine:${step.id}:start-date`, step.startDate || iso(new Date()));
  const current = stageOn(step, new Date());
  const previewDates = editing ? schedulePreview(step, startDateDraft, draft) : [];
  const previewMonths = previewDates.reduce<Record<string, string[]>>((acc, value) => {
    const date = new Date(`${value}T00:00:00`);
    const key = date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
    (acc[key] ??= []).push(value);
    return acc;
  }, {});

  const saveSchedule = () => {
    const startDate = startDateDraft || step.startDate || iso(new Date());
    onChange({ stages: draft, startDate }, `«${p?.name}»: новый график с ${startDate.split("-").reverse().join(".")} — ${describeStages(draft)}.`);
    setEditing(false);
    toast.success("График сохранён, изменение записано в историю");
  };

  return (
    <li className={cn("min-w-0 rounded-[1.25rem] bg-card p-3 shadow-panel transition-opacity", step.paused && "opacity-70")}>
      <div className="flex min-w-0 items-start gap-2 sm:gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {index + 1}
        </span>
        <ProductImage product={p} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 break-all text-sm font-semibold">{p?.name}</span>
            {p?.active && <Tag tone="sky">актив</Tag>}
            {step.paused && <Tag tone="sand">на паузе</Tag>}
          </div>
          <div className="break-all text-xs text-muted-foreground">{p?.brand} · {p?.actives}</div>
          {p?.active && !editing && !extra && (
            <div className="mt-2 max-w-full break-words rounded-xl bg-accent/35 px-2.5 py-1.5 text-xs">
              <span className="text-muted-foreground">График: </span>
              {step.stages.map((st, i) => (
                <span key={i} className={current?.index === i ? "font-semibold text-secondary" : ""}>
                  {i > 0 && " → "}
                  {FREQ_LABEL[String(st.freq)]}
                  {st.weeks ? ` (${st.weeks} нед.)` : ""}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <IconBtn label="Выше" disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp className="h-3.5 w-3.5" /></IconBtn>
          <IconBtn label="Ниже" disabled={index === total - 1} onClick={() => onMove(1)}><ArrowDown className="h-3.5 w-3.5" /></IconBtn>
        </div>
      </div>

      {extra && <ExtraScheduleEditor step={step} onChange={onChange} />}
      {editing && (
        <div className="mt-3 space-y-2 rounded-2xl bg-accent/25 p-3 animate-scale-in">
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Этапы введения</p>
          <div className="rounded-2xl bg-card/80 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Первая дата применения</p>
                <p className="mt-1 text-sm font-semibold capitalize">{humanDate(startDateDraft)}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Эта дата станет точкой отсчёта всего графика.</p>
              </div>
              <label className="relative inline-flex h-9 cursor-pointer items-center gap-2 overflow-hidden rounded-full border border-input bg-background px-3 text-xs font-medium shadow-sm">
                <CalendarDays className="h-3.5 w-3.5" />
                Изменить дату
                <input
                  type="date"
                  value={startDateDraft}
                  onChange={(e) => setStartDateDraft(e.target.value)}
                  aria-label="Первая дата применения"
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
            </div>
          </div>
          {draft.map((st, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <span className="w-5 text-xs text-muted-foreground">{i + 1}.</span>
              <select
                value={String(st.freq)}
                onChange={(e) => {
                  const v = e.target.value;
                  const freq = (isNaN(Number(v)) ? v : Number(v)) as Freq;
                  setDraft(draft.map((x, j) => (j === i ? { ...x, freq } : x)));
                }}
                className="h-8 min-w-0 flex-1 basis-40 rounded-md border border-input bg-background px-2 text-xs"
              >
                {FREQS.map((f) => (
                  <option key={String(f)} value={String(f)}>{FREQ_LABEL[String(f)]}</option>
                ))}
              </select>
              <Input
                type="number"
                min={1}
                placeholder="∞"
                value={st.weeks ?? ""}
                onChange={(e) =>
                  setDraft(draft.map((x, j) => (j === i ? { ...x, weeks: e.target.value ? Number(e.target.value) : null } : x)))
                }
                className="h-8 w-16 text-xs"
              />
              <span className="text-xs text-muted-foreground">нед.</span>
              <IconBtn label="Удалить этап" onClick={() => setDraft(draft.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5" /></IconBtn>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => setDraft([...draft, { freq: "every_other", weeks: null }])}>
              <Plus className="h-3.5 w-3.5" /> Этап
            </Button>
            <Button size="sm" onClick={saveSchedule}>Сохранить график</Button>
            <Button size="sm" variant="ghost" onClick={() => { setDraft(step.stages); setStartDateDraft(step.startDate || iso(new Date())); setEditing(false); }}>Отмена</Button>
          </div>
          {startDateDraft && (
            <div className="rounded-2xl bg-card/75 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Предпросмотр графика
                </div>
                <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">90 дней</span>
              </div>
              <div className="space-y-2.5">
                {Object.entries(previewMonths).map(([month, dates]) => (
                  <div key={month}>
                    <div className="mb-1 text-[11px] font-medium capitalize text-muted-foreground">{month}</div>
                    <div className="flex flex-wrap gap-1">
                      {dates.map((value) => (
                        <span key={value} className="rounded-full bg-accent/45 px-2 py-1 text-[11px] font-medium">
                          {new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">После сохранения календарь продолжит рассчитывать применения автоматически и дальше, без ограничения тремя месяцами.</p>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">Пустое поле недель — этап без ограничения. Новый этап начинается сразу после окончания предыдущего и заново отсчитывает частоту от своей первой даты.</p>
        </div>
      )}

      {replacing && (
        <div className="mt-3 flex flex-wrap gap-2">
          <ProductPicker open title="Заменить средство" exclude={step.productId} onClose={() => setReplacing(false)} onPick={(np) => {
            onChange({ productId: np.id }, `Замена: «${p?.name}» → «${np.name}».`);
            setReplacing(false);
            toast.success("Средство заменено");
          }} />
          <Button size="sm" variant="ghost" onClick={() => setReplacing(false)}>Отмена</Button>
        </div>
      )}

      {altOpen && (
        <div className="mt-3 min-w-0 space-y-2 rounded-2xl bg-accent/25 p-3 animate-scale-in">
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Альтернативы для клиентки</p>
          {alts.length === 0 && <p className="text-xs text-muted-foreground">Пока нет разрешённых замен. Клиентка увидит их только после вашего подтверждения и публикации.</p>}
          {alts.map((a) => {
            const ap = product(a.productId);
            return (
              <div key={a.productId} className="min-w-0 rounded-xl bg-card p-2">
                <div className="flex min-w-0 items-center gap-2">
                  <ProductImage product={ap} size="sm" />
                  <span className="min-w-0 flex-1 break-words text-xs font-semibold">{ap?.brand} {ap?.name}</span>
                  <IconBtn label="Убрать альтернативу" onClick={() => setAlts(alts.filter((x) => x.productId !== a.productId))}><X className="h-3.5 w-3.5" /></IconBtn>
                </div>
                <Input value={a.usage ?? ""} onChange={(e) => setAlts(alts.map((x) => (x.productId === a.productId ? { ...x, usage: e.target.value } : x)))} placeholder="Своя инструкция (если отличается)" maxLength={500} className="mt-2 h-9 rounded-full bg-muted/40 px-3 text-xs" />
              </div>
            );
          })}
          {p && mainCategory(p) === THERAPY ? (
            <p className="text-[11px] text-muted-foreground">Для терапевтических препаратов замены не подбираются автоматически — добавляйте только вручную.</p>
          ) : suggestions.length > 0 ? (
            <>
              <p className="pt-1 text-[11px] text-muted-foreground">Возможные варианты из библиотеки (общий актив, та же форма и назначение). Проверьте перед подтверждением:</p>
              {suggestions.map(({ product: sp, reason }) => (
                <div key={sp.id} className="flex min-w-0 items-center gap-2 rounded-xl bg-muted/50 p-2">
                  <ProductImage product={sp} size="sm" />
                  <div className="min-w-0 flex-1"><div className="break-words text-xs font-semibold">{sp.brand} {sp.name}</div><div className="break-words text-[11px] text-muted-foreground">{reason}</div></div>
                  <Button size="sm" variant="outline" className="h-8 shrink-0 rounded-full px-3 text-xs" onClick={() => setAlts([...alts, { productId: sp.id }])}>Разрешить</Button>
                </div>
              ))}
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground">Подходящих вариантов не найдено: не хватает данных о составе, форме или концентрации.</p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => setAltPick(true)}><Plus className="h-3.5 w-3.5" /> Выбрать вручную</Button>
            <Button size="sm" variant="ghost" onClick={() => setAltOpen(false)}>Свернуть</Button>
          </div>
          {altPick && <ProductPicker open title="Разрешить альтернативу" exclude={step.productId} onClose={() => setAltPick(false)} onPick={(np) => { if (!alts.some((a) => a.productId === np.id)) setAlts([...alts, { productId: np.id }]); setAltPick(false); }} />}
        </div>
      )}

      <Input
        value={step.note}
        onChange={(e) => onChange({ note: e.target.value })}
        placeholder="Комментарий для клиента"
        maxLength={500}
        className="mt-3 h-10 rounded-full bg-muted/40 px-4 text-xs"
      />
      <Input
        value={step.usage ?? ""}
        onChange={(e) => onChange({ usage: e.target.value })}
        placeholder={p?.instruction ? `Способ применения: ${p.instruction}` : "Способ применения"}
        maxLength={500}
        className="mt-2 h-10 rounded-full bg-muted/40 px-4 text-xs"
      />
      <Input
        value={step.advice ?? ""}
        onChange={(e) => onChange({ advice: e.target.value })}
        placeholder="Индивидуальная рекомендация специалиста"
        maxLength={500}
        className="mt-2 h-10 rounded-full bg-muted/40 px-4 text-xs"
      />

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button size="sm" variant="ghost" className="h-9 rounded-full bg-muted/60 px-3.5 text-xs" onClick={() => setAltOpen(!altOpen)}>
          Альтернативы{alts.length ? ` · ${alts.length}` : ""}
        </Button>
        {p?.active && !extra && (
          <Button size="sm" variant="ghost" className="h-9 rounded-full bg-muted/60 px-3.5 text-xs" onClick={() => { setDraft(step.stages); setStartDateDraft(step.startDate || iso(new Date())); setEditing(true); }}>
            Частота
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-9 rounded-full bg-muted/60 px-3.5 text-xs"
          onClick={() => onChange({ paused: !step.paused }, `«${p?.name}» ${step.paused ? "снова в схеме" : "поставлено на паузу"}.`)}
        >
          {step.paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          {step.paused ? "Возобновить" : "Пауза"}
        </Button>
        <Button size="sm" variant="ghost" className="h-9 rounded-full bg-muted/60 px-3.5 text-xs" onClick={() => setReplacing(true)}>
          <Repeat className="h-3.5 w-3.5" /> Заменить
        </Button>
        <Button size="sm" variant="ghost" className="h-9 rounded-full bg-destructive/10 px-3.5 text-xs text-destructive" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" /> Убрать
        </Button>
      </div>
    </li>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
    >
      {children}
    </button>
  );
}
