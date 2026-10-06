import { useScrollMemory } from "@/lib/ui-state";
import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, ImageIcon, LayoutGrid, Moon, Sun } from "lucide-react";
import { appliesOn, iso, stepsFor, type Client, type Step } from "@/lib/demo-data";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import creamHeart from "@/assets/cream-heart.webp";
import chromeSparkle from "@/assets/chrome-sparkle.webp";
export { default as pearlDrop } from "@/assets/pearl-drop.webp";

export const fmtDate = (s: string) =>
  s.length > 10
    ? new Date(s).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
    : new Date(s + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

export interface Section {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  short?: string;
  /** Показывать в нижней панели телефона (остальные — в «Ещё»). */
  primary?: boolean;
  /** Число непрочитанных событий раздела. */
  badge?: number;
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("wordmark inline-flex items-center gap-1.5 text-[1.35rem] leading-none", className)}>
      <span className="h-2 w-2 rounded-full bg-accent shadow-glow" aria-hidden />
      GLOWGURU
    </span>
  );
}

export function AppShell({
  role,
  sections,
  active,
  onChange,
  subtitle,
  children,
  canSwitch = false,
  headerRight,
  scrollScope,
}: {
  role: "specialist" | "client";
  sections: Section[];
  active: string;
  onChange: (k: string) => void;
  subtitle: string;
  children: ReactNode;
  /** Переключатель режимов — только для специалиста (предпросмотр кабинета клиента). */
  canSwitch?: boolean;
  headerRight?: ReactNode;
  scrollScope?: string | undefined;
}) {
  const primary = sections.filter((s) => s.primary).slice(0, 4);
  const rest = sections.filter((s) => !primary.includes(s));
  const go = (k: string) => onChange(k);
  useScrollMemory(`${role}:${active}${scrollScope ? `:${scrollScope}` : ""}`);
  const moreActive = active === "more" || rest.some((s) => s.key === active);

  return (
    <div className="min-h-screen min-w-0 overflow-x-clip">
      <header className="glass sticky top-0 z-30 border-x-0 border-t-0 border-b-border/40 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2.5 md:min-h-16 md:flex-nowrap md:px-8">
          <div className="flex shrink-0 items-center gap-4">
            <Wordmark className="shrink-0 whitespace-nowrap text-primary" />
            <span className="hidden truncate text-xs text-muted-foreground lg:inline">{subtitle}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2 md:order-3">
            {canSwitch && <div className="hidden md:block"><div className="glass-chip flex shrink-0 rounded-full p-1 text-xs">
              {(["specialist", "client"] as const).map((r) => (
                <Link
                  key={r}
                  to={r === "specialist" ? "/specialist" : "/client"}
                  className={cn(
                    "whitespace-nowrap rounded-full px-3 py-1.5 font-semibold transition-all active:scale-[0.97]",
                    role === r ? "glass-active" : "text-primary/75 hover:text-primary",
                  )}
                >
                  {r === "specialist" ? "Специалист" : "Просмотр клиента"}
                </Link>
              ))}
            </div></div>}
            {headerRight}
          </div>
          {canSwitch && <div className="order-last flex w-full justify-center md:hidden"><div className="glass-chip flex shrink-0 rounded-full p-1 text-xs">
              {(["specialist", "client"] as const).map((r) => (
                <Link
                  key={r}
                  to={r === "specialist" ? "/specialist" : "/client"}
                  className={cn(
                    "whitespace-nowrap rounded-full px-3 py-1.5 font-semibold transition-all active:scale-[0.97]",
                    role === r ? "glass-active" : "text-primary/75 hover:text-primary",
                  )}
                >
                  {r === "specialist" ? "Специалист" : "Просмотр клиента"}
                </Link>
              ))}
            </div></div>}
        </div>
      </header>

      <div className="pb-nav mx-auto flex min-w-0 max-w-7xl gap-8 px-4 pt-5 md:px-8 md:py-8">
        <aside className="hidden w-60 shrink-0 md:block">
            <nav className="surface sticky top-24 space-y-1 border-border/70 p-2">
            {sections.map((s) => (
              <button
                key={s.key}
                onClick={() => go(s.key)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left text-sm font-semibold transition-all",
                  active === s.key ? "bg-primary text-primary-foreground shadow-panel" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                <s.icon className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1">{s.label}</span>
                {!!s.badge && <Badge n={s.badge} />}
              </button>
            ))}
          </nav>
        </aside>
        <main key={active} className="min-w-0 flex-1 animate-fade-up">
          {active === "more" ? (
            <div>
              <PageTitle title="Ещё" />
              <div className="space-y-2">
                {rest.map((s) => (
                  <button key={s.key} onClick={() => go(s.key)} className="surface flex min-h-16 w-full items-center gap-3.5 rounded-2xl px-4 text-left transition-transform active:scale-[0.99]">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/40 text-primary"><s.icon className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1 font-semibold">{s.label}</span>
                    {!!s.badge && <Badge n={s.badge} />}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          ) : children}
        </main>
      </div>

      <nav
        aria-label="Разделы"
        className="fixed inset-x-3 z-40 mx-auto max-w-md rounded-[1.75rem] border border-primary-foreground/10 bg-primary/96 p-1.5 text-primary-foreground shadow-lift backdrop-blur-md md:hidden"
        style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="grid grid-cols-5 gap-1">
          {primary.map((s) => (
            <NavBtn key={s.key} s={s} active={active === s.key} onClick={() => go(s.key)} />
          ))}
          <NavBtn s={{ key: "more", label: "Ещё", icon: LayoutGrid, badge: rest.reduce((a, x) => a + (x.badge ?? 0), 0) }} active={moreActive} onClick={() => go("more")} />
        </div>
      </nav>

    </div>
  );
}

function NavBtn({ s, active, onClick }: { s: Section; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-w-0 flex-col items-center gap-1 rounded-[1.25rem] px-0.5 py-2 text-[10px] font-medium leading-none tracking-tight transition-all",
        active ? "bg-primary-foreground text-primary" : "text-primary-foreground/60 active:scale-95",
      )}
    >
      <span className="relative">
        <s.icon className="h-5 w-5" />
        {!!s.badge && <span className="absolute -right-2.5 -top-1.5"><Badge n={s.badge} /></span>}
      </span>
      <span className="max-w-full truncate">{s.short ?? s.label}</span>
    </button>
  );
}

export function PageTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-secondary/80">{eyebrow}</p>}
        <h1 className="font-display text-[2.1rem] font-semibold leading-[1.08] break-words text-foreground md:text-[2.6rem]">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("surface min-w-0 p-4 sm:p-5", className)}>{children}</div>;
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="min-w-0 break-words font-sans text-base font-semibold tracking-tight">{children}</h2>
      {aside && <span className="shrink-0 text-xs text-muted-foreground">{aside}</span>}
    </div>
  );
}

export function Tag({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "sky" | "sand" | "ink" }) {
  const tones = {
    muted: "glass-chip text-primary/80",
    sky: "bg-accent/55 text-accent-foreground",
    sand: "bg-sand/35 text-sand-foreground",
    ink: "bg-secondary text-secondary-foreground",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium", tones[tone])}>{children}</span>;
}

export function PhotoTile({ label, date, url }: { label: string; date: string; url?: string | undefined }) {
  return (
    <figure className="surface overflow-hidden p-1.5">
      <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-[1.1rem] bg-accent/25">
        {url ? <img src={url} alt={label} loading="lazy" className="h-full w-full object-cover" /> : <ImageIcon className="h-8 w-8 text-secondary/40" />}
      </div>
      <figcaption className="px-2 pb-1 pt-2 text-xs">
        <div className="break-words font-medium text-foreground">{label}</div>
        <div className="text-muted-foreground">{fmtDate(date)}</div>
      </figcaption>
    </figure>
  );
}

const WD = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

/** Календарь применения активов (шагов с графиком). По нажатию на дату — план дня. */
/** Шаги с конкретным графиком: активы основной схемы + доп. уход по дням недели / датам. */
export function scheduledSteps(client: Client, product: (id: string) => { active: boolean } | undefined) {
  const out: { step: Step; slots: ("am" | "pm")[] }[] = [];
  (["am", "pm"] as const).forEach((slot) => client.routine[slot].forEach((s) => { if (product(s.productId)?.active) out.push({ step: s, slots: [slot] }); }));
  (client.routine.extra ?? []).forEach((s) => { const m = s.schedule?.mode; if (m === "days" || m === "dates") out.push({ step: s, slots: s.times ?? ["pm"] }); });
  return out;
}

export function ActivesCalendar({ client }: { client: Client }) {
  const { product } = useStore();
  const [offset, setOffset] = useState(0);
  const todayIso = iso(new Date());
  const [picked, setPicked] = useState(todayIso);
  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + offset);
  const year = base.getFullYear();
  const month = base.getMonth();
  const first = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();

  const actives = scheduledSteps(client, product).map((x, idx) => ({ ...x, idx }));
  const tones = ["bg-secondary", "bg-sand", "bg-accent", "bg-primary"];
  const pickedDate = new Date(picked + "T00:00:00");
  const plan = (["am", "pm"] as const).map((slot) => ({
    slot,
    steps: stepsFor(client, slot, pickedDate),
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Panel>
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => setOffset(offset - 1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/70 hover:bg-muted" aria-label="Предыдущий месяц">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-base font-semibold capitalize">
            {base.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
          </div>
          <button onClick={() => setOffset(offset + 1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/70 hover:bg-muted" aria-label="Следующий месяц">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {WD.map((d) => (
            <div key={d} className="py-1 font-medium">{d}</div>
          ))}
          {Array.from({ length: first }).map((_, i) => (
            <div key={"e" + i} />
          ))}
          {Array.from({ length: days }).map((_, i) => {
            const date = new Date(year, month, i + 1);
            const di = iso(date);
            const on = actives.filter((a) => appliesOn(a.step, date));
            const done = client.done[di];
            const doneCount = done ? done.am.length + done.pm.length : 0;
            const isPicked = di === picked;
            return (
              <button
                key={i}
                onClick={() => setPicked(di)}
                aria-pressed={isPicked}
                className={cn(
                  "flex aspect-square min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl text-sm transition-all",
                  isPicked ? "bg-primary text-primary-foreground shadow-glow" : on.length ? "bg-accent/35 text-foreground" : "text-foreground/80 hover:bg-muted/70",
                  di === todayIso && !isPicked && "ring-1 ring-secondary/50",
                )}
              >
                <span className={cn(di === todayIso && "font-semibold")}>{i + 1}</span>
                <span className="flex h-1.5 gap-0.5">
                  {on.slice(0, 3).map((a) => (
                    <span key={a.step.id} className={cn("h-1.5 w-1.5 rounded-full", isPicked ? "bg-primary-foreground" : tones[a.idx % tones.length])} />
                  ))}
                  {!on.length && doneCount > 0 && <span className={cn("h-1.5 w-1.5 rounded-full", isPicked ? "bg-primary-foreground/60" : "bg-sand")} />}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {actives.length === 0 && <span>В схеме нет активов с графиком.</span>}
          {actives.map((a) => (
            <span key={a.step.id} className="flex min-w-0 items-center gap-2">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", tones[a.idx % tones.length])} />
              <span className="break-words">{product(a.step.productId)?.name} · {a.slots.map((x) => (x === "am" ? "утро" : "вечер")).join(" и ")}{a.step.paused && " (пауза)"}</span>
            </span>
          ))}
        </div>
      </Panel>

      <Panel className="self-start animate-scale-in" key={picked}>
        <SectionTitle aside={picked === todayIso ? "сегодня" : undefined}>
          <span className="capitalize">{pickedDate.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</span>
        </SectionTitle>
        <div className="space-y-4">
          {plan.map(({ slot, steps }) => (
            <div key={slot}>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {slot === "am" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                {slot === "am" ? "Утро" : "Вечер"}
              </div>
              {steps.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет шагов</p>
              ) : (
                <ol className="space-y-1.5">
                  {steps.map((s, i) => {
                    const p = product(s.productId);
                    const sched = actives.some((a) => a.step.id === s.id);
                    const isDone = client.done[picked]?.[slot]?.includes(s.id);
                    const missed = !isDone && picked < todayIso;
                    return (
                      <li key={s.id} className={cn("flex items-center gap-2.5 rounded-2xl px-3 py-2 text-sm", sched ? "bg-accent/35" : "bg-muted/50")}>
                        <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                        <span className="min-w-0 flex-1 break-words">{p?.name}</span>
                        {p?.active && <Tag tone="ink">актив</Tag>}
                        {picked <= todayIso && <span className={cn("shrink-0 text-[11px] font-medium", isDone ? "text-secondary" : missed ? "text-destructive/80" : "text-muted-foreground")}>{isDone ? "✓ выполнено" : missed ? "пропущено" : "не выполнено"}</span>}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

const THUMB_TONES: Record<string, string> = {
  "Очищение": "bg-accent/50",
  "Тонизирование": "bg-muted",
  "Сыворотка": "bg-secondary/15",
  "Увлажнение": "bg-accent/30",
  "SPF": "bg-sand/40",
};

/** Нейтральная демо-заглушка фото средства (без подмены реальных фото брендов). */
export function ProductImage({ product, size = "md" }: { product?: { name: string; brand: string; category: string; image?: string | undefined } | undefined; size?: "sm" | "md" | "lg" }) {
  const dims = size === "sm" ? "h-12 w-12 rounded-xl" : size === "md" ? "h-16 w-16 rounded-2xl" : "aspect-square w-full rounded-[1.1rem]";
  const tone = THUMB_TONES[product?.category ?? ""] ?? "bg-muted";
  if (product?.image)
    return (
      <div className={cn("flex shrink-0 items-center justify-center overflow-hidden bg-card p-1 shadow-panel ring-1 ring-border/50", dims)}>
        <img src={product.image} alt={product.name} loading="lazy" className="h-full w-full object-contain" />
      </div>
    );
  const initials = (product?.brand ?? "").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={cn("relative flex shrink-0 items-center justify-center overflow-hidden", tone, dims)} aria-label={`Фото: ${product?.name ?? ""} (демо-заглушка)`}>
      <svg viewBox="0 0 40 60" className={size === "lg" ? "h-1/2" : "h-4/5"} aria-hidden>
        <rect x="14" y="3" width="12" height="9" rx="1.5" className="fill-primary" />
        <rect x="8" y="12" width="24" height="44" rx="5" className="fill-card stroke-secondary/40" strokeWidth="1" />
        <rect x="12" y="28" width="16" height="12" rx="1" className="fill-accent/60" />
      </svg>
      {size !== "sm" && initials && (
        <span className="absolute bottom-1 right-1.5 text-[10px] font-bold tracking-tight text-secondary/60">{initials}</span>
      )}
    </div>
  );
}

export function productDescription(p: { description?: string | undefined; category: string; actives: string }) {
  return p.description ?? `${p.category}. Ключевые компоненты: ${p.actives}.`;
}

function Badge({ n }: { n: number }) {
  return (
    <span className="inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold leading-none text-secondary-foreground ring-2 ring-background/80">
      {n > 99 ? "99+" : n}
    </span>
  );
}

/** Декоративный стикер «сердце из крема» — только у приветствия на главных экранах. */
export function CreamHeart() {
  return (
    <span className="relative mt-1 shrink-0" aria-hidden>
      <img src={creamHeart} alt="" draggable={false} className="pointer-events-none w-[64px] -rotate-6 select-none animate-fade-up drop-shadow-[0_6px_14px_rgb(20_40_70/0.08)] sm:w-[76px] md:w-[88px]" />
      <img src={chromeSparkle} alt="" draggable={false} className="pointer-events-none absolute -left-4 -top-2 w-6 select-none animate-fade-up sm:w-7" />
      <span className="absolute -bottom-1 right-1 h-2 w-2 rounded-full bg-lime shadow-[0_0_10px_var(--lime)]" />
    </span>
  );
}

const RATING_LABEL = ["плохо", "так себе", "норм", "хорошо", "отлично"];

/** Галерея фото динамики: фото из записей дневника + ранее загруженные фото. */
export function DynamicsGallery({ client, empty }: { client: Client; empty: string }) {
  const [open, setOpen] = useState<{ url: string; date: string; rating?: number | undefined; text: string } | null>(null);
  const items = [
    ...client.diary.filter((d) => d.url).map((d) => ({ id: d.id, url: d.url!, date: d.date, rating: d.rating, text: d.text })),
    ...client.photos.filter((p) => p.url).map((p) => ({ id: p.id, url: p.url!, date: p.date, rating: undefined as number | undefined, text: p.label === "Фото динамики" || p.label === "Новое фото" ? "" : p.label })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {items.map((it) => (
          <button key={it.id} onClick={() => setOpen(it)} className="group relative overflow-hidden rounded-2xl bg-muted text-left active:scale-[0.98]">
            <img src={it.url} alt={`Фото кожи ${it.date}`} className="aspect-square w-full object-cover" loading="lazy" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/60 to-transparent px-2 pb-1.5 pt-4 text-[11px] font-medium text-background">{it.date.split("-").reverse().slice(0, 2).join(".")}</span>
          </button>
        ))}
      </div>
      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-lg p-3">
          <DialogTitle className="sr-only">Фото кожи</DialogTitle>
          {open && (
            <div className="space-y-3">
              <img src={open.url} alt="Фото кожи" className="max-h-[70dvh] w-full rounded-2xl bg-muted object-contain" />
              <div className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
                {new Date(open.date + "T12:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                {open.rating && <span className="rounded-full bg-accent/45 px-2 py-0.5 text-xs font-semibold text-foreground">{open.rating}/5 · {RATING_LABEL[open.rating - 1]}</span>}
              </div>
              {open.text && <p className="break-words px-1 pb-1 text-sm">{open.text}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
