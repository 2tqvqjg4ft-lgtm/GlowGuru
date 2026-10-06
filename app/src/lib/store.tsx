import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CLIENTS, PRODUCTS, describeExtra, describeStages, iso, uid, type Client, type Product, type Slot, type Step } from "./demo-data";
import { fetchProducts, upsertProducts } from "./library";
import { signPhotos } from "./photos";
import { notifyPlanPublished } from "./push.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Store {
  /** Специалист: реальные клиенты + изолированные демо-карточки. Клиент: только своя карточка. */
  clients: Client[];
  loading: boolean;
  products: Product[];
  product: (id: string) => Product | undefined;
  updateClient: (id: string, fn: (c: Client) => Client, historyText?: string) => void;
  saveProducts: (list: Product[]) => Promise<void>;
  /** Убрать средство из локального списка после удаления. */
  dropProduct: (id: string) => void;
  /** Специалист: сохранить черновик схемы (клиент его не видит). */
  saveDraft: (id: string) => Promise<void>;
  /** Специалист: опубликовать текущую схему клиенту с записью истории изменений. */
  publish: (id: string) => Promise<void>;
  /** Клиент: отметить, что опубликованная схема открыта. */
  markPlanViewed: (id: string) => Promise<void>;
  /** Убрать клиента из списка (после удаления на сервере). */
  removeClient: (id: string) => void;
}

// Контекст переживает горячую перезагрузку модуля в режиме разработки.
const g = globalThis as { __glowStoreCtx?: React.Context<Store | null> };
const Ctx = (g.__glowStoreCtx ??= createContext<Store | null>(null));

// Поля, которые ведёт сам клиент; всё остальное — схема специалиста.
const JOURNAL_KEYS = ["diary", "photos", "done", "choices"] as const;
const OWN_KEYS = ["id", "name", "phone", "age", "since", "email", "demo", "published", "notifications", "publishedAt", "viewedAt", "planStatus", "questionnaireDone", "birthDate"];
const SLOT_LABEL: Record<Slot, string> = { am: "Утро", pm: "Вечер" };

const DEMO: Client[] = CLIENTS.map((c) => ({ ...c, demo: true, published: true, planStatus: "published", questionnaireDone: true }));

type ProfileRow = { id: string; full_name: string; phone: string | null; birth_date: string | null; created_at: string };

function blank(p: ProfileRow): Client {
  const age = p.birth_date ? Math.floor((Date.now() - new Date(p.birth_date).getTime()) / 31557600000) : 0;
  return {
    id: p.id, name: p.full_name || "Без имени", age, phone: p.phone ?? "", email: "", since: p.created_at.slice(0, 10), birthDate: p.birth_date,
    skinType: "", goal: "", complaints: [], features: [], allergies: "", restrictions: "", notes: "", questionnaire: [],
    routine: { am: [], pm: [] }, history: [], photos: [], diary: [], done: {},
  };
}

const planPart = (c: Client) => Object.fromEntries(Object.entries(c).filter(([k]) => !OWN_KEYS.includes(k) && !(JOURNAL_KEYS as readonly string[]).includes(k)));
// Ссылки на фото временные — в базе храним только путь.
const strip = <T extends { url?: string | undefined; path?: string | undefined }>(x: T) => (x.path ? { ...x, url: undefined } : x);
const journalPart = (c: Client) => ({ diary: c.diary.map(strip), photos: c.photos.map(strip), done: c.done, choices: c.choices ?? {} });
/** Подпись схемы ухода (только средства) — для сравнения черновика с опубликованной версией. */
const planSig = (plan: Record<string, unknown>) => JSON.stringify(plan["routine"] ?? null);
/** Заметки специалиста клиенту не публикуются. */
const publicPart = (plan: Record<string, unknown>) => ({ ...plan, notes: "" });

export interface QuestionnaireData {
  firstName: string; lastName: string; birthDate: string; complaints: string; skinType: string;
  currentCare: string; actives: string; allergies: string; restrictions: string; goal: string;
}
export const Q_LABELS: [keyof QuestionnaireData, string][] = [
  ["complaints", "Основные жалобы"], ["skinType", "Тип / состояние кожи"], ["currentCare", "Текущий домашний уход"],
  ["actives", "Используемые активы"], ["allergies", "Аллергии"], ["restrictions", "Ограничения / противопоказания"], ["goal", "Главная цель ухода"],
];

function applyQuestionnaire(c: Client, q: Partial<QuestionnaireData> | undefined): Client {
  if (!q) return c;
  return {
    ...c,
    questionnaire: c.questionnaire.length ? c.questionnaire : Q_LABELS.filter(([k]) => q[k]).map(([k, label]) => ({ q: label, a: String(q[k]) })),
    skinType: c.skinType || q.skinType || "",
    goal: c.goal || q.goal || "",
    allergies: c.allergies || q.allergies || "",
    restrictions: c.restrictions || q.restrictions || "",
    complaints: c.complaints.length ? c.complaints : (q.complaints ? q.complaints.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean) : []),
  };
}

interface Pub { plan: Record<string, unknown>; at: string }

async function loadClients(ids: string[], role: "specialist" | "client", pubs: Map<string, Pub>): Promise<Client[]> {
  const spec = role === "specialist";
  const [{ data: profiles }, drafts, { data: published }, { data: journals }, { data: quests }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, phone, birth_date, created_at").in("id", ids),
    spec ? supabase.from("client_plans").select("client_id, data").in("client_id", ids) : Promise.resolve({ data: [] as { client_id: string; data: unknown }[] }),
    supabase.from("published_plans").select("client_id, data, published_at, viewed_at").in("client_id", ids),
    supabase.from("client_journal").select("client_id, data").in("client_id", ids),
    supabase.from("questionnaires").select("client_id, data").in("client_id", ids),
  ]);
  const draft = new Map((drafts.data ?? []).map((r) => [r.client_id, r.data as Partial<Client>]));
  const pub = new Map((published ?? []).map((r) => [r.client_id, r]));
  const jour = new Map((journals ?? []).map((r) => [r.client_id, r.data as Partial<Client>]));
  const qs = new Map((quests ?? []).map((r) => [r.client_id, r.data as Partial<QuestionnaireData>]));

  const list = (profiles ?? []).map((p) => {
    const base = blank(p);
    const pr = pub.get(p.id);
    const pubPlan = pr ? planPart({ ...base, ...(pr.data as Partial<Client>) } as Client) : null;
    if (pr && pubPlan) pubs.set(p.id, { plan: pubPlan, at: pr.published_at });
    // Клиент видит только опубликованную версию; специалист — черновик.
    const src = spec ? (draft.get(p.id) ?? (pr?.data as Partial<Client> | undefined) ?? {}) : ((pr?.data as Partial<Client> | undefined) ?? {});
    const plan = planPart({ ...base, ...src } as Client);
    const jr = jour.get(p.id) ?? {};
    let c = { ...base, ...plan, ...journalPart({ ...base, ...jr } as Client) } as Client;
    const status: Client["planStatus"] = !pubPlan ? (draft.has(p.id) ? "draft" : "none") : planSig(plan) !== planSig(pubPlan) ? "dirty" : "published";
    c = applyQuestionnaire(c, qs.get(p.id));
    return { ...c, published: !!pr, publishedAt: pr?.published_at ?? null, viewedAt: pr?.viewed_at ?? null, planStatus: status, questionnaireDone: qs.has(p.id) };
  });

  // Временные ссылки на фото из закрытого хранилища
  const paths = list.flatMap((c) => [...c.photos, ...c.diary].map((x) => x.path).filter((x): x is string => !!x));
  const urls = await signPhotos(paths);
  const sign = <T extends { path?: string | undefined; url?: string | undefined }>(x: T) => (x.path ? { ...x, url: urls.get(x.path) } : x);
  return list.map((c) => ({ ...c, photos: c.photos.map(sign), diary: c.diary.map(sign) }));
}

/** Список изменений между опубликованной и новой схемой — для истории. */
function diffRoutine(prev: Client["routine"] | undefined, next: Client["routine"], name: (id: string) => string, isActive: (id: string) => boolean): string[] {
  const out: string[] = [];
  for (const slot of ["am", "pm", "extra"] as const) {
    const L = slot === "extra" ? "Доп. уход" : SLOT_LABEL[slot];
    const a: Step[] = prev?.[slot] ?? [];
    const b = next[slot] ?? [];
    const am = new Map(a.map((s) => [s.id, s]));
    const bm = new Map(b.map((s) => [s.id, s]));
    for (const s of a) if (!bm.has(s.id)) out.push(`${L}: удалено «${name(s.productId)}».`);
    for (const s of b) {
      const o = am.get(s.id);
      const n = name(s.productId);
      if (!o) {
        out.push(`${L}: добавлено «${n}»${isActive(s.productId) && s.stages.length ? ` (${describeStages(s.stages)})` : ""}${s.note ? `. Комментарий: «${s.note}»` : ""}.`);
        continue;
      }
      if (o.productId !== s.productId) out.push(`${L}: замена «${name(o.productId)}» → «${n}».`);
      if (o.paused !== s.paused) out.push(`${L}: «${n}» ${s.paused ? "поставлено на паузу" : "возвращено в схему"}.`);
      if (JSON.stringify([o.schedule, o.times]) !== JSON.stringify([s.schedule, s.times])) out.push(`${L}: «${n}» — изменено расписание: ${describeExtra(s)}.`);
      if (JSON.stringify(o.stages) !== JSON.stringify(s.stages)) out.push(`${L}: «${n}» — изменена частота: ${describeStages(s.stages)}.`);
      if ((o.note ?? "") !== (s.note ?? "")) out.push(`${L}: «${n}» — изменён комментарий${s.note ? `: «${s.note}»` : " (удалён)"}.`);
      if ((o.usage ?? "") !== (s.usage ?? "")) out.push(`${L}: «${n}» — изменён способ применения${s.usage ? `: «${s.usage}»` : ""}.`);
      if ((o.advice ?? "") !== (s.advice ?? "")) out.push(`${L}: «${n}» — рекомендация специалиста${s.advice ? `: «${s.advice}»` : " удалена"}.`);
      const oa = new Set((o.alternatives ?? []).map((x) => x.productId));
      const na = new Set((s.alternatives ?? []).map((x) => x.productId));
      const addA = [...na].filter((x) => !oa.has(x)).map(name);
      const delA = [...oa].filter((x) => !na.has(x)).map(name);
      if (addA.length) out.push(`${L}: к «${n}» разрешены альтернативы: ${addA.map((x) => `«${x}»`).join(", ")}.`);
      if (delA.length) out.push(`${L}: для «${n}» отменены альтернативы: ${delA.map((x) => `«${x}»`).join(", ")}.`);
    }
    const ao = a.filter((s) => bm.has(s.id)).map((s) => s.id).join();
    const bo = b.filter((s) => am.has(s.id)).map((s) => s.id).join();
    if (ao !== bo) out.push(`${L}: изменён порядок нанесения.`);
  }
  return out;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, role, loading: authLoading } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const loadedFor = useRef<string | null>(null);
  const ref = useRef(clients);
  ref.current = clients;
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pendingWrites = useRef(new Map<string, Client>());
  const pubs = useRef(new Map<string, Pub>());

  useEffect(() => {
    if (!user) return;
    fetchProducts()
      .then((list) => list.length && setProducts(list))
      .catch(() => toast.error("Не удалось загрузить библиотеку средств"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !role) {
      setClients([]);
      setLoading(false);
      return;
    }
    // Экран загрузки только при первом входе — повторная загрузка не должна закрывать открытые разделы
    if (!loadedFor.current || loadedFor.current !== user.id) setLoading(true);
    loadedFor.current = user.id;
    pubs.current = new Map();
    (async () => {
      if (role === "specialist") {
        const { data: roles } = await supabase.from("user_roles").select("user_id, role");
        const specialists = new Set((roles ?? []).filter((r) => r.role === "specialist").map((r) => r.user_id));
        const clientIds = [...new Set((roles ?? []).filter((r) => r.role === "client" && !specialists.has(r.user_id)).map((r) => r.user_id))];
        const real = clientIds.length ? await loadClients(clientIds, role, pubs.current) : [];
        setClients(real);
      } else {
        setClients(await loadClients([user.id], role, pubs.current));
      }
      setLoading(false);
    })().catch(() => {
      toast.error("Не удалось загрузить данные");
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, role, authLoading]);

  const writeNow = useCallback(
    async (c: Client) => {
      const { error } =
        role === "specialist"
          ? await supabase.from("client_plans").upsert({ client_id: c.id, data: planPart(c) as never })
          : await supabase.from("client_journal").upsert({ client_id: c.id, data: journalPart(c) as never });
      if (error) throw error;
    },
    [role],
  );

  const persist = useCallback(
    (c: Client) => {
      if (c.demo || !role) return;
      clearTimeout(timers.current.get(c.id));
      pendingWrites.current.set(c.id, c);
      timers.current.set(
        c.id,
        setTimeout(() => {
          timers.current.delete(c.id);
          writeNow(c).then(() => pendingWrites.current.delete(c.id)).catch(() => toast.error("Не удалось сохранить изменения"));
        }, 600),
      );
    },
    [role, writeNow],
  );

  useEffect(() => {
    const flush = () => {
      for (const [id, c] of pendingWrites.current) {
        clearTimeout(timers.current.get(id));
        timers.current.delete(id);
        void writeNow(c).then(() => pendingWrites.current.delete(id)).catch(() => {});
      }
    };
    const onVisibility = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [writeNow]);

  const setOne = (next: Client) => {
    const list = ref.current.map((c) => (c.id === next.id ? next : c));
    ref.current = list;
    setClients(list);
  };

  const value: Store = {
    clients,
    removeClient: (id) => {
      const list = ref.current.filter((c) => c.id !== id);
      ref.current = list;
      setClients(list);
    },
    loading: loading || authLoading,
    products,
    product: (id) => products.find((p) => p.id === id),
    updateClient: (id, fn, historyText) => {
      const cur = ref.current.find((c) => c.id === id);
      if (!cur) return;
      let next = fn(cur);
      // У реальных клиентов история пишется при публикации; у демо — сразу.
      if (historyText && cur.demo) next = { ...next, history: [{ id: uid(), date: iso(new Date()), text: historyText }, ...next.history] };
      if (!cur.demo && role === "specialist") {
        const pub = pubs.current.get(id);
        next = { ...next, planStatus: !pub ? "draft" : planSig(planPart(next)) !== planSig(pub.plan) ? "dirty" : "published" };
      }
      setOne(next);
      persist(next);
    },
    saveProducts: async (list) => {
      await upsertProducts(list);
      setProducts((cur) => {
        const map = new Map(cur.map((p) => [p.id, p]));
        const added: Product[] = [];
        for (const p of list) (map.has(p.id) ? map.set(p.id, p) : added.push(p));
        return [...added, ...cur.map((p) => map.get(p.id)!)];
      });
    },
    dropProduct: (id) => setProducts((cur) => cur.filter((p) => p.id !== id)),
    saveDraft: async (id) => {
      const cur = ref.current.find((c) => c.id === id);
      if (!cur || cur.demo || role !== "specialist") return;
      clearTimeout(timers.current.get(id));
      await writeNow(cur);
      pendingWrites.current.delete(id);
    },
    markPlanViewed: async (id) => {
      if (role !== "client" || !user || user.id !== id) return;
      const now = new Date().toISOString();
      const { error } = await supabase.from("published_plans").update({ viewed_at: now }).eq("client_id", id).is("viewed_at", null);
      if (!error) { const c = ref.current.find((x) => x.id === id); if (c) setOne({ ...c, viewedAt: now }); }
    },
    publish: async (id) => {
      const cur = ref.current.find((c) => c.id === id);
      if (!cur || cur.demo || role !== "specialist" || !user) return;
      clearTimeout(timers.current.get(id));
      pendingWrites.current.delete(id);
      const prev = pubs.current.get(id);
      const nm = (pid: string) => products.find((p) => p.id === pid)?.name ?? "средство";
      const act = (pid: string) => !!products.find((p) => p.id === pid)?.active;
      const now = new Date().toISOString();
      const changes = diffRoutine(prev?.plan["routine"] as Client["routine"] | undefined, cur.routine, nm, act);
      const entries = (changes.length ? changes : [prev ? "Схема опубликована повторно без изменений в средствах." : "Схема опубликована."]).map((text) => ({ id: uid(), date: now, text }));
      const next: Client = { ...cur, history: [...entries, ...cur.history] };
      const plan = planPart(next);
      const { error: e1 } = await supabase.from("client_plans").upsert({ client_id: id, data: plan as never });
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("published_plans").upsert({ client_id: id, data: publicPart(plan) as never, published_at: now, published_by: user.id, viewed_at: null });
      if (e2) throw e2;
      pubs.current.set(id, { plan, at: now });
      setOne({ ...next, published: true, publishedAt: now, viewedAt: null, planStatus: "published" });
      notifyPlanPublished({ data: { clientId: id, first: !prev, changes } }).catch(() => {});
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("StoreProvider missing");
  return s;
}

export { DEMO as DEMO_CLIENTS };
