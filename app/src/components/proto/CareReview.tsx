import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { signPhotos, uploadClientPhoto } from "@/lib/photos";
import { cn } from "@/lib/utils";
import { PageTitle, Panel, fmtDate } from "./shared";

export type Decision = "keep" | "remove" | "replace" | "finish";
type Status = "draft" | "submitted" | "in_review" | "done";
interface Review { id: string; client_id: string; status: Status; general_comment: string; submitted_at: string | null; completed_at: string | null; created_at: string }
interface Item { id: string; review_id: string; photo_path: string; name: string; client_comment: string; decision: Decision | null; specialist_comment: string; url?: string | undefined }

export const DECISIONS: { key: Decision; label: string; cls: string }[] = [
  { key: "keep", label: "Оставить", cls: "bg-[oklch(0.94_0.05_150)] text-[oklch(0.38_0.08_150)] border-[oklch(0.85_0.07_150)]" },
  { key: "remove", label: "Убрать", cls: "bg-[oklch(0.94_0.04_20)] text-[oklch(0.45_0.12_20)] border-[oklch(0.86_0.07_20)]" },
  { key: "replace", label: "Заменить", cls: "bg-[oklch(0.95_0.05_75)] text-[oklch(0.45_0.1_60)] border-[oklch(0.87_0.08_75)]" },
  { key: "finish", label: "Можно закончить", cls: "bg-[oklch(0.95_0.02_240)] text-[oklch(0.42_0.05_250)] border-[oklch(0.86_0.03_240)]" },
];
const STATUS_LABEL: Record<Status, string> = { draft: "Черновик", submitted: "Отправлено на разбор", in_review: "На разборе", done: "Разбор готов" };

function DecisionPill({ d }: { d: Decision | null }) {
  const x = DECISIONS.find((v) => v.key === d);
  if (!x) return <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">Без решения</span>;
  return <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", x.cls)}>{x.label}</span>;
}

function StatusBadge({ s }: { s: Status }) {
  return <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", s === "done" ? "bg-primary text-primary-foreground" : "glass-chip text-primary")}>{STATUS_LABEL[s]}</span>;
}

async function loadCare(clientId: string) {
  const [{ data: reviews }, { data: items }] = await Promise.all([
    supabase.from("care_reviews").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
    supabase.from("care_items").select("*").eq("client_id", clientId).order("created_at"),
  ]);
  const list = (items ?? []) as Item[];
  const urls = await signPhotos(list.map((i) => i.photo_path));
  return { reviews: (reviews ?? []) as Review[], items: list.map((i) => ({ ...i, url: urls.get(i.photo_path) })) };
}

function useCare(clientId: string) {
  const [data, setData] = useState<{ reviews: Review[]; items: Item[] } | null>(null);
  const reload = useCallback(() => loadCare(clientId).then(setData).catch(() => toast.error("Не удалось загрузить уход")), [clientId]);
  useEffect(() => { setData(null); void reload(); }, [reload]);
  return { data, reload, setData };
}

function ItemPhoto({ it }: { it: Item }) {
  return it.url ? <img src={it.url} alt={it.name || "Средство"} className="aspect-square w-full rounded-2xl bg-muted object-cover" /> : <div className="aspect-square w-full rounded-2xl bg-muted" />;
}

/* ─────────────── Клиентка ─────────────── */

export function ClientCare({ clientId }: { clientId: string }) {
  const { data, reload } = useCare(clientId);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  if (!data) return <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-muted-foreground" />;
  const open = data.reviews.find((r) => r.status === "draft");
  const past = data.reviews.filter((r) => r.status !== "draft");
  const draftItems = open ? data.items.filter((i) => i.review_id === open.id) : [];

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      let rid = open?.id;
      if (!rid) {
        const { data: r, error } = await supabase.from("care_reviews").insert({ client_id: clientId }).select("id").single();
        if (error) throw error;
        rid = r.id;
      }
      for (const f of Array.from(files)) {
        const { path } = await uploadClientPhoto(clientId, f);
        const { error } = await supabase.from("care_items").insert({ review_id: rid, client_id: clientId, photo_path: path, name: files.length === 1 ? name.trim() : "", client_comment: files.length === 1 ? comment.trim() : "" });
        if (error) throw error;
      }
      setName(""); setComment("");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось добавить фото");
    } finally { setBusy(false); }
  };
  const remove = async (it: Item) => {
    const { error } = await supabase.from("care_items").delete().eq("id", it.id);
    if (error) { toast.error("Не удалось удалить"); return; }
    await supabase.storage.from("client-photos").remove([it.photo_path]);
    await reload();
  };
  const submit = async () => {
    if (!open) return;
    setBusy(true);
    const { error } = await supabase.from("care_reviews").update({ status: "submitted" }).eq("id", open.id);
    setBusy(false);
    if (error) { toast.error("Не удалось отправить"); return; }
    toast.success("Отправлено специалисту");
    await reload();
  };

  const hasDone = past.some((r) => r.status === "done");
  return (
    <>
      <PageTitle eyebrow="Разбор ухода" title="Мой текущий уход" />
      <p className="-mt-3 mb-5 max-w-xl text-sm text-muted-foreground">Добавьте средства, которыми пользуетесь сейчас. Специалист отметит, что оставить, убрать или заменить.</p>

      <Panel className="mb-6 space-y-3">
        <div className="text-sm font-semibold">{hasDone || past.length ? "Добавить ещё средства" : "Загрузить свой уход"}</div>
        <p className="text-xs text-muted-foreground">Лучше одно средство на одно фото — так специалист даст решение по каждой банке.</p>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название средства (необязательно)" />
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Короткий комментарий (необязательно)" rows={2} />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy} onClick={() => camera.current?.click()}><Camera className="h-4 w-4" /> Сделать фото</Button>
          <Button variant="outline" disabled={busy} onClick={() => gallery.current?.click()}><ImagePlus className="h-4 w-4" /> Из галереи</Button>
          {busy && <Loader2 className="h-5 w-5 animate-spin self-center text-muted-foreground" />}
        </div>
        <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void add(e.target.files); e.target.value = ""; }} />
        <input ref={gallery} type="file" accept="image/*" multiple hidden onChange={(e) => { void add(e.target.files); e.target.value = ""; }} />

        {draftItems.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {draftItems.map((it) => (
                <div key={it.id} className="relative">
                  <ItemPhoto it={it} />
                  <button onClick={() => void remove(it)} aria-label="Удалить фото" className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-panel">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {it.name && <div className="mt-1.5 truncate text-sm font-medium">{it.name}</div>}
                </div>
              ))}
            </div>
            <Button className="w-full" disabled={busy} onClick={submit}><Send className="h-4 w-4" /> Отправить специалисту</Button>
          </>
        )}
      </Panel>

      {past.map((r) => (
        <ReviewResult key={r.id} review={r} items={data.items.filter((i) => i.review_id === r.id)} />
      ))}
    </>
  );
}

function ReviewResult({ review, items }: { review: Review; items: Item[] }) {
  const done = review.status === "done";
  return (
    <section className="mb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">Отправлено {review.submitted_at ? fmtDate(review.submitted_at.slice(0, 10)) : ""}</div>
        <StatusBadge s={review.status} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <div key={it.id} className="surface space-y-2 p-3">
            <ItemPhoto it={it} />
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 truncate font-semibold">{it.name || "Средство"}</div>
              {done && <DecisionPill d={it.decision} />}
            </div>
            {it.client_comment && <p className="text-xs text-muted-foreground">Ваш комментарий: {it.client_comment}</p>}
            {done && it.specialist_comment && (
              <div className="rounded-xl bg-accent/35 px-3 py-2 text-sm"><div className="text-[11px] font-semibold uppercase tracking-wide text-secondary">Комментарий специалиста</div>{it.specialist_comment}</div>
            )}
          </div>
        ))}
      </div>
      {done && review.general_comment && (
        <Panel className="mt-3"><div className="mb-1 text-xs font-semibold uppercase tracking-wide text-secondary">Общий комментарий специалиста</div><p className="text-sm">{review.general_comment}</p></Panel>
      )}
    </section>
  );
}

/* ─────────────── Специалист ─────────────── */

/** Число новых (ещё не разобранных) средств у клиентки. */
export function useCareNewCount(clientId: string) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let off = false;
    void (async () => {
      const { data: rs } = await supabase.from("care_reviews").select("id").eq("client_id", clientId).eq("status", "submitted");
      if (!clientId || !rs?.length) { if (!off) setN(0); return; }
      const { count } = await supabase.from("care_items").select("id", { count: "exact", head: true }).in("review_id", rs.map((r) => r.id));
      if (!off) setN(count ?? 0);
    })();
    return () => { off = true; };
  }, [clientId]);
  return n;
}

export function SpecialistCare({ clientId, onChanged }: { clientId: string; onChanged?: () => void }) {
  const { data, reload, setData } = useCare(clientId);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  if (!data) return <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-muted-foreground" />;
  const reviews = data.reviews.filter((r) => r.status !== "draft");
  if (!reviews.length) return <Panel><p className="text-sm text-muted-foreground">Клиентка пока не присылала свой текущий уход.</p></Panel>;

  const patchItem = (id: string, p: Partial<Item>) => setData((d) => d && { ...d, items: d.items.map((i) => (i.id === id ? { ...i, ...p } : i)) });
  const patchReview = (id: string, p: Partial<Review>) => setData((d) => d && { ...d, reviews: d.reviews.map((r) => (r.id === id ? { ...r, ...p } : r)) });
  const startReview = async (r: Review) => {
    if (r.status !== "submitted") return;
    patchReview(r.id, { status: "in_review" });
    await supabase.from("care_reviews").update({ status: "in_review" }).eq("id", r.id);
    onChanged?.();
  };
  const setDecision = async (r: Review, it: Item, d: Decision) => {
    patchItem(it.id, { decision: d });
    const { error } = await supabase.from("care_items").update({ decision: d }).eq("id", it.id);
    if (error) toast.error("Не удалось сохранить");
    void startReview(r);
  };
  const debounce = (key: string, fn: () => Promise<{ error: unknown }>) => {
    clearTimeout(timers.current.get(key));
    timers.current.set(key, setTimeout(() => void fn().then(({ error }) => error && toast.error("Не удалось сохранить")), 700));
  };
  const finish = async (r: Review) => {
    const { error } = await supabase.from("care_reviews").update({ status: "done", general_comment: r.general_comment }).eq("id", r.id);
    if (error) { toast.error("Не удалось отправить"); return; }
    toast.success("Разбор отправлен клиентке");
    await reload();
    onChanged?.();
  };

  return (
    <div className="space-y-8">
      {reviews.map((r) => {
        const items = data.items.filter((i) => i.review_id === r.id);
        const locked = r.status === "done";
        return (
          <section key={r.id}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-muted-foreground">Прислано {r.submitted_at ? fmtDate(r.submitted_at.slice(0, 10)) : ""} · {items.length} шт.</div>
              <StatusBadge s={r.status} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((it) => (
                <div key={it.id} className="surface space-y-3 p-3">
                  <ItemPhoto it={it} />
                  <div>
                    <div className="font-semibold">{it.name || "Средство без названия"}</div>
                    {it.client_comment && <p className="text-xs text-muted-foreground">Клиентка: {it.client_comment}</p>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {DECISIONS.map((d) => (
                      <button key={d.key} disabled={locked} onClick={() => void setDecision(r, it, d.key)}
                        className={cn("min-h-9 rounded-full border px-3 text-xs font-semibold transition-all active:scale-95 disabled:cursor-default", it.decision === d.key ? d.cls : "border-border bg-background text-muted-foreground", locked && it.decision !== d.key && "opacity-40")}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <Textarea rows={2} disabled={locked} value={it.specialist_comment} placeholder="Комментарий к средству"
                    onChange={(e) => { const v = e.target.value; patchItem(it.id, { specialist_comment: v }); debounce(it.id, async () => supabase.from("care_items").update({ specialist_comment: v }).eq("id", it.id)); void startReview(r); }} />
                </div>
              ))}
            </div>
            <Panel className="mt-3 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-secondary">Общий комментарий специалиста</div>
              <Textarea rows={3} disabled={locked} value={r.general_comment} placeholder="Например: оставляем очищение и крем, сыворотку убираем…"
                onChange={(e) => { const v = e.target.value; patchReview(r.id, { general_comment: v }); debounce(r.id, async () => supabase.from("care_reviews").update({ general_comment: v }).eq("id", r.id)); }} />
              {!locked && <Button className="w-full" onClick={() => void finish(r)}><Send className="h-4 w-4" /> Отправить разбор клиенту</Button>}
            </Panel>
          </section>
        );
      })}
    </div>
  );
}
