// Демонстрационные вымышленные данные прототипа GLOWGURU.

export type Slot = "am" | "pm";
export type Freq = "daily" | "every_other" | 1 | 2 | 3 | 4 | 5;

export interface Stage {
  freq: Freq;
  weeks: number | null; // null — без ограничения
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  active: boolean; // содержит актив, требующий графика
  archived?: boolean | undefined;
  actives: string;
  instruction: string;
  description?: string | undefined;
  image?: string | undefined; // URL фото; без него — нейтральная заглушка
  subcategory?: string | undefined;
  directions?: string[] | undefined;
  inci?: string | undefined;
  specialistNotes?: string | undefined;
}

export interface Step {
  id: string;
  productId: string;
  note: string;
  paused: boolean;
  startDate: string; // ISO yyyy-mm-dd
  stages: Stage[]; // пусто = ежедневно
  usage?: string | undefined; // индивидуальный способ применения (вместо инструкции из библиотеки)
  advice?: string | undefined; // индивидуальная рекомендация специалиста
  /** Только для дополнительного ухода: индивидуальное расписание. */
  schedule?: ExtraSchedule | undefined;
  times?: Slot[] | undefined; // утро / вечер
  /** Разрешённые специалистом альтернативы (со своей инструкцией при необходимости). */
  alternatives?: { productId: string; usage?: string | undefined }[] | undefined;
  /** Только для отображения: исходное средство, если клиентка выбрала альтернативу. */
  chosenFrom?: string | undefined;
}

export interface ExtraSchedule {
  mode: "daily" | "days" | "asneeded" | "dates";
  days?: number[] | undefined; // 0 = вс … 6 = сб
  dates?: string[] | undefined; // yyyy-mm-dd
}

export const WEEKDAY_SHORT = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const WEEKDAY_FULL = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];

export function describeExtra(s: Step): string {
  const sc = s.schedule ?? { mode: "daily" };
  const t = (s.times ?? ["pm"]).map((x) => (x === "am" ? "утро" : "вечер")).join(" и ");
  let f = "ежедневно";
  if (sc.mode === "asneeded") f = "по необходимости";
  else if (sc.mode === "days") {
    const d = [...(sc.days ?? [])].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
    f = d.length === 7 ? "ежедневно" : d.length === 1 ? `1 раз в неделю · ${WEEKDAY_FULL[d[0]!]}` : `${d.length} раза в неделю · ${d.map((x) => WEEKDAY_SHORT[x]).join(", ")}`;
  } else if (sc.mode === "dates") f = `по датам: ${(sc.dates ?? []).map((x) => x.split("-").reverse().slice(0, 2).join(".")).join(", ") || "не выбраны"}`;
  return sc.mode === "asneeded" ? f : `${f} · ${t}`;
}

/** Шаги на дату: основные шаги слота + дополнительный уход, назначенный на это время. Без дублей средства. */
export function stepsFor(client: Pick<Client, "routine">, slot: Slot, date: Date): Step[] {
  const base = client.routine[slot].filter((s) => appliesOn(s, date));
  const ids = new Set(base.map((s) => s.productId));
  for (const s of client.routine.extra ?? []) {
    if ((s.times ?? ["pm"]).includes(slot) && appliesOn(s, date) && !ids.has(s.productId)) { base.push(s); ids.add(s.productId); }
  }
  return base;
}

export interface HistoryItem {
  id: string;
  date: string;
  text: string;
}

export interface Photo {
  id: string;
  date: string;
  label: string;
  url?: string | undefined;
  path?: string | undefined; // путь в закрытом хранилище
}

export interface DiaryEntry {
  id: string;
  date: string;
  rating: number; // 1..5
  text: string;
  url?: string | undefined;
  path?: string | undefined;
}

export interface Client {
  id: string;
  name: string;
  age: number;
  phone: string;
  email: string;
  since: string;
  skinType: string;
  goal: string;
  complaints: string[];
  features: string[];
  allergies: string;
  restrictions: string;
  notes: string;
  questionnaire: { q: string; a: string }[];
  /** Оценка кожи специалистом: состояние, чувствительность, обезвоженность и т. п. */
  skin?: Record<string, string>;
  routine: { am: Step[]; pm: Step[]; extra?: Step[] | undefined };
  history: HistoryItem[];
  photos: Photo[];
  diary: DiaryEntry[];
  done: Record<string, { am: string[]; pm: string[] }>; // дата -> выполненные шаги
  /** Выбор клиентки: ID шага -> ID разрешённой альтернативы. */
  choices?: Record<string, string> | undefined;
  notifications?: import("./notifications").NotificationSettings;
  demo?: boolean; // изолированная демо-карточка, видна только специалисту
  published?: boolean;
  publishedAt?: string | null; // дата последней публикации схемы
  viewedAt?: string | null; // когда клиентка открыла опубликованную схему
  planStatus?: "none" | "draft" | "published" | "dirty";
  questionnaireDone?: boolean;
  birthDate?: string | null;
}

export const iso = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
export const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
};
export const uid = () => Math.random().toString(36).slice(2, 10);

export const FREQ_LABEL: Record<string, string> = {
  daily: "ежедневно",
  every_other: "через день",
  "1": "1 раз в неделю",
  "2": "2 раза в неделю",
  "3": "3 раза в неделю",
  "4": "4 раза в неделю",
  "5": "5 раз в неделю",
};

const WEEK_DAYS: Record<number, number[]> = {
  1: [3],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 3, 5, 0],
  5: [1, 2, 3, 4, 5],
};

const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y ?? 2026, (m ?? 1) - 1, d ?? 1);
};
const diffDays = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 86400000);

/** Текущий этап графика на дату (или null, если ещё не начат). */
export function stageOn(step: Step, date: Date): { stage: Stage; index: number } | null {
  if (step.stages.length === 0) return { stage: { freq: "daily", weeks: null }, index: 0 };
  const start = parse(step.startDate);
  let d = diffDays(date, start);
  if (d < 0) return null;
  for (let i = 0; i < step.stages.length; i++) {
    const st = step.stages[i]!;
    if (st.weeks === null || d < st.weeks * 7) return { stage: st, index: i };
    d -= st.weeks * 7;
  }
  const last = step.stages.length - 1;
  return { stage: step.stages[last]!, index: last };
}

export function appliesOn(step: Step, date: Date): boolean {
  if (step.paused) return false;
  if (step.schedule) {
    const sc = step.schedule;
    if (sc.mode === "daily") return true;
    if (sc.mode === "asneeded") return false;
    if (sc.mode === "days") return (sc.days ?? []).includes(date.getDay());
    return (sc.dates ?? []).includes(iso(date));
  }
  const s = stageOn(step, date);
  if (!s) return false;
  const f = s.stage.freq;
  if (f === "daily") return true;
  if (f === "every_other") return diffDays(date, parse(step.startDate)) % 2 === 0;
  return (WEEK_DAYS[f] ?? []).includes(date.getDay());
}

export function describeStages(stages: Stage[]) {
  if (!stages.length) return "ежедневно";
  return stages
    .map((s) => FREQ_LABEL[String(s.freq)] + (s.weeks ? ` · ${s.weeks} нед.` : ""))
    .join(" → ");
}

export const PRODUCTS: Product[] = [
  { id: "p1", name: "Мягкий гель для умывания", brand: "Lumène Lab", category: "Очищение", active: false, actives: "глицерин, бетаин", instruction: "Вспенить во влажных ладонях, массировать 30–40 секунд, смыть тёплой водой." },
  { id: "p2", name: "Гидрофильное масло", brand: "Nordic Calm", category: "Очищение", active: false, actives: "масло жожоба", instruction: "Нанести на сухую кожу, помассировать, эмульгировать водой и смыть." },
  { id: "p3", name: "Тоник с пантенолом", brand: "Aqua Derm", category: "Тонизирование", active: false, actives: "пантенол 2%", instruction: "Нанести ладонями похлопывающими движениями, не протирать." },
  { id: "p4", name: "Сыворотка с ниацинамидом 5%", brand: "Clarté", category: "Сыворотки", active: false, actives: "ниацинамид 5%, цинк", instruction: "3–4 капли на всё лицо, дождаться впитывания 1 минуту." },
  { id: "p5", name: "Ретинол 0,2% в сквалане", brand: "Clarté", category: "Активы", active: true, actives: "ретинол 0,2%", instruction: "Горошина на сухую кожу, избегая век и уголков губ. Только вечером." },
  { id: "p6", name: "Азелаиновая кислота 10%", brand: "Derma Nord", category: "Активы", active: true, actives: "азелаиновая кислота 10%", instruction: "Тонкий слой на зоны покраснений и постакне." },
  { id: "p7", name: "Витамин C 10%", brand: "Solenne", category: "Активы", active: true, actives: "аскорбилглюкозид 10%", instruction: "Утром после тоника, 3 капли. Хранить в темноте." },
  { id: "p8", name: "Крем с церамидами", brand: "Barrier Lab", category: "Увлажнение", active: false, actives: "церамиды, холестерин", instruction: "Горошина на лицо и шею, распределить лёгкими движениями." },
  { id: "p9", name: "Лёгкий флюид увлажняющий", brand: "Aqua Derm", category: "Увлажнение", active: false, actives: "гиалуроновая кислота", instruction: "Нанести тонким слоем, подходит под макияж." },
  { id: "p10", name: "Солнцезащитный флюид SPF 50", brand: "Solenne", category: "Защита", active: false, actives: "фильтры широкого спектра", instruction: "Две фаланги пальца на лицо, обновлять каждые 2–3 часа на улице." },
  { id: "p11", name: "Восстанавливающий бальзам", brand: "Barrier Lab", category: "Восстановление", active: false, actives: "пантенол 5%, мадекассосид", instruction: "При сухости и раздражении — вместо крема на ночь." },
  { id: "p12", name: "AHA-пилинг 7%", brand: "Derma Nord", category: "Активы", active: true, actives: "гликолевая кислота 7%", instruction: "Нанести на 5 минут, смыть. Не сочетать с ретинолом в один вечер." },
];

const step = (productId: string, note = "", stages: Stage[] = [], start = 0, paused = false): Step => ({
  id: uid(),
  productId,
  note,
  paused,
  startDate: daysAgo(start),
  stages,
});

export const CLIENTS: Client[] = [
  {
    id: "c1",
    name: "Валерия Попкова",
    age: 32,
    phone: "+7 900 000-11-22",
    email: "maria.demo@example.com",
    since: daysAgo(60),
    skinType: "Комбинированная, обезвоженная",
    goal: "Выровнять тон, уменьшить постакне, мягко ввести ретинол",
    complaints: ["Постакне на щеках", "Расширенные поры в Т-зоне", "Тусклый тон к вечеру"],
    features: ["Склонность к покраснениям", "Тонкий эпидермис на скулах", "Жирный блеск в Т-зоне"],
    allergies: "Эфирные масла цитрусовых",
    restrictions: "Не использовать кислоты выше 10%; планирует отпуск на море через 2 месяца",
    notes: "Хорошо переносит ниацинамид. Ретинол вводим медленно, контроль сухости через 2 недели.",
    questionnaire: [
      { q: "Как кожа ощущается после умывания?", a: "Стянутость на щеках, Т-зона нормальная" },
      { q: "Бывают ли высыпания?", a: "Единичные перед циклом, на подбородке" },
      { q: "Сколько часов сна?", a: "6–7 часов" },
      { q: "Используете ли SPF?", a: "Только летом" },
      { q: "Предыдущий опыт с активами", a: "Кислотный тоник — было жжение" },
    ],
    routine: {
      am: [
        step("p1"),
        step("p3"),
        step("p4", "Тонким слоем, особенно на Т-зону"),
        step("p9"),
        step("p10", "Каждый день, даже в пасмурную погоду"),
      ],
      pm: [
        step("p2", "Только в дни с макияжем или SPF"),
        step("p1"),
        step("p5", "Если есть сухость — нанести поверх крема (метод сэндвича)", [
          { freq: 2, weeks: 2 },
          { freq: 3, weeks: 3 },
          { freq: "every_other", weeks: null },
        ], 17),
        step("p6", "", [{ freq: 3, weeks: null }], 30, true),
        step("p8"),
      ],
    },
    history: [
      { id: uid(), date: daysAgo(60), text: "Составлена базовая схема: очищение, ниацинамид, SPF." },
      { id: uid(), date: daysAgo(30), text: "Добавлена азелаиновая кислота 10% — 3 раза в неделю вечером." },
      { id: uid(), date: daysAgo(17), text: "Введён ретинол 0,2%: 2 раза в неделю → 3 раза в неделю → через день." },
      { id: uid(), date: daysAgo(17), text: "Азелаиновая кислота поставлена на паузу на время адаптации к ретинолу." },
    ],
    photos: [
      { id: uid(), date: daysAgo(60), label: "Старт · анфас" },
      { id: uid(), date: daysAgo(30), label: "1 месяц · анфас" },
      { id: uid(), date: daysAgo(3), label: "2 месяца · анфас" },
    ],
    diary: [
      { id: uid(), date: daysAgo(1), rating: 4, text: "Лёгкое шелушение у крыльев носа после ретинола, в остальном спокойно." },
      { id: uid(), date: daysAgo(5), rating: 5, text: "Кожа ровная, покраснений нет." },
      { id: uid(), date: daysAgo(10), rating: 3, text: "Немного пощипывало после ретинола, нанесла бальзам." },
    ],
    done: {
      [daysAgo(1)]: { am: [], pm: [] },
    },
  },
  {
    id: "c2",
    name: "Екатерина Власова",
    age: 41,
    phone: "+7 900 000-33-44",
    email: "ekaterina.demo@example.com",
    since: daysAgo(120),
    skinType: "Сухая, зрелая",
    goal: "Улучшить упругость, снизить сухость",
    complaints: ["Мелкие морщины у глаз", "Сухость зимой"],
    features: ["Тонкая кожа", "Реакция на смену климата"],
    allergies: "Не выявлены",
    restrictions: "Беременность не планируется; розацеа исключена",
    notes: "Предпочитает минимум шагов утром.",
    questionnaire: [
      { q: "Как кожа ощущается после умывания?", a: "Сильная стянутость" },
      { q: "Используете ли SPF?", a: "Да, круглый год" },
    ],
    routine: {
      am: [step("p3"), step("p7", "", [{ freq: "daily", weeks: null }], 40), step("p8"), step("p10")],
      pm: [step("p2"), step("p5", "", [{ freq: 3, weeks: 4 }, { freq: "every_other", weeks: null }], 50), step("p11")],
    },
    history: [{ id: uid(), date: daysAgo(50), text: "Ретинол: 3 раза в неделю → через день." }],
    photos: [{ id: uid(), date: daysAgo(120), label: "Старт · анфас" }],
    diary: [],
    done: {},
  },
  {
    id: "c3",
    name: "Алина Громова",
    age: 24,
    phone: "+7 900 000-55-66",
    email: "alina.demo@example.com",
    since: daysAgo(14),
    skinType: "Жирная, склонная к акне",
    goal: "Уменьшить воспаления, выровнять рельеф",
    complaints: ["Воспаления на лбу и подбородке", "Жирный блеск"],
    features: ["Комедоны", "Постакне-пятна"],
    allergies: "Бензоилпероксид — раздражение",
    restrictions: "Принимает гормональную терапию — согласовано с врачом",
    notes: "Первая консультация. Начали с азелаиновой кислоты.",
    questionnaire: [{ q: "Бывают ли высыпания?", a: "Постоянно, 3–5 воспалений" }],
    routine: {
      am: [step("p1"), step("p4"), step("p9"), step("p10")],
      pm: [step("p1"), step("p6", "", [{ freq: 2, weeks: 2 }, { freq: "daily", weeks: null }], 14), step("p9")],
    },
    history: [{ id: uid(), date: daysAgo(14), text: "Стартовая схема с азелаиновой кислотой." }],
    photos: [],
    diary: [],
    done: {},
  },
  {
    id: "c4",
    name: "Ольга Мельник",
    age: 37,
    phone: "+7 900 000-77-88",
    email: "olga.demo@example.com",
    since: daysAgo(200),
    skinType: "Нормальная, чувствительная",
    goal: "Поддерживающий уход, профилактика пигментации",
    complaints: ["Пигментные пятна после лета"],
    features: ["Чувствительность к кислотам"],
    allergies: "Отдушки",
    restrictions: "Только средства без отдушек",
    notes: "Стабильный результат, осмотр раз в 2 месяца.",
    questionnaire: [],
    routine: {
      am: [step("p3"), step("p7", "", [{ freq: 3, weeks: null }], 90), step("p9"), step("p10")],
      pm: [step("p1"), step("p12", "", [{ freq: 1, weeks: null }], 60), step("p8")],
    },
    history: [{ id: uid(), date: daysAgo(90), text: "Добавлен витамин C 3 раза в неделю." }],
    photos: [],
    diary: [],
    done: {},
  },
];

export const CURRENT_CLIENT_ID = "c1";
