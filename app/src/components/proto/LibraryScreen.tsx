import { usePersistentState, useScrollMemory } from "@/lib/ui-state";
import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, Camera, Download, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Product } from "@/lib/demo-data";
import { useStore } from "@/lib/store";
import { CSV_COLUMNS, analyzeCsv, deleteProduct, isProductUsed, resizeImage, type ImportRow } from "@/lib/library";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { readDraftPhoto, removeDraftPhoto, saveDraftPhoto } from "@/lib/product-drafts";
import { CATEGORY_NAMES, CONFIRMED_PREFIX, OTHER_CATEGORY, componentTags, detectTags, mainCategory, purposeTags, purposesOf } from "@/lib/taxonomy";
import { PageTitle, Panel, ProductImage, Tag, productDescription } from "./shared";

const TEMPLATE_ROWS = [
  ["GG-0001", "Barrier Lab", "Крем с церамидами", "Увлажнение", "Крем для лица", "увлажнение; восстановление барьера; успокаивающее действие", "", "Лёгкий крем для сухой кожи", "церамиды; холестерин", "Aqua, Glycerin, Ceramide NP, Cholesterol", "Горошину на лицо утром и вечером", "Хорошо сочетается с ретинолом", "нет"],
  ["GG-0002", "Clarté", "Ретинол 0.2% в сквалане", "Активы", "Ретиноиды", "обновление; антивозрастной уход", "", "Мягкий ретинол для старта", "ретинол 0.2%", "Squalane, Retinol, Tocopherol", "Только вечером на сухую кожу", "Вводить по этапам", "да"],
];

function downloadTemplate() {
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const csv = "\uFEFF" + [CSV_COLUMNS as readonly string[], ...TEMPLATE_ROWS].map((r) => r.map(esc).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = "glowguru_products_template.csv";
  a.click();
}

const normCat = (c: string) => c.replace(/\s+/g, " ").trim();
const uniqueLabels = (values: string[]) => {
  const seen = new Set<string>();
  return values.map(normCat).filter((value) => {
    const key = value.toLocaleLowerCase("ru");
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.localeCompare(b, "ru"));
};
const DRAFT_PREFIX = "glow-product-draft:";
type Draft = { f: Product; dirText: string; at: number };
const draftKey = (uid: string, id: string | null) => `${DRAFT_PREFIX}${uid}:${id ?? "new"}`;
function readDraft(key: string): Draft | null {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as Draft) : null; } catch { return null; }
}

export function LibraryScreen() {
  const { products } = useStore();
  const { user } = useAuth();
  const [q, setQ] = usePersistentState("lib:q", "");
  const [cat, setCat] = usePersistentState("lib:cat", "Все");
  const [dir, setDir] = usePersistentState("lib:dir", "Все");
  const [showArchived, setShowArchived] = usePersistentState("lib:archived", false);
  const [limit, setLimit] = useState(60);
  // Открытая карточка средства переживает перезагрузку вкладки: храним только её ID
  const [editingId, setEditingId] = usePersistentState<string | null>("lib:editing", null);
  const editing: Product | "new" | null = editingId === "new" ? "new" : (editingId && products.find((p) => p.id === editingId)) || null;
  const setEditing = (v: Product | "new" | null) => setEditingId(v === "new" ? "new" : v ? v.id : null);
  const [importing, setImporting] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<Draft | null>(null);

  // Несохранённый черновик нового средства (например, после перезагрузки страницы)
  useEffect(() => {
    if (user && !editing) setPendingDraft(readDraft(draftKey(user.id, null)));
  }, [user, editing]);

  const visible = useMemo(() => products.filter((p) => !!p.archived === showArchived), [products, showArchived]);
  const [comp, setComp] = usePersistentState("lib:comp", "Все");
  const tagged = useMemo(() => visible.map((p) => ({ p, cat: mainCategory(p), purposes: purposeTags(p), comps: componentTags(p) })), [visible]);
  const cats = useMemo(() => ["Все", ...CATEGORY_NAMES, ...(tagged.some((x) => x.cat === OTHER_CATEGORY) ? [OTHER_CATEGORY] : [])], [tagged]);
  const selectedCat = cats.includes(cat) ? cat : "Все";
  const inCat = useMemo(() => tagged.filter((x) => selectedCat === "Все" || x.cat === selectedCat), [tagged, selectedCat]);
  const dirs = useMemo(() => ["Все", ...uniqueLabels(inCat.flatMap((x) => x.purposes))], [inCat]);
  const comps = useMemo(() => ["Все", ...uniqueLabels(inCat.flatMap((x) => x.comps))], [inCat]);
  const selectedDir = dirs.find((c) => c.toLocaleLowerCase("ru") === normCat(dir).toLocaleLowerCase("ru")) ?? "Все";
  const selectedComp = comps.includes(comp) ? comp : "Все";
  const list = useMemo(() => {
    const s = q.toLowerCase().trim();
    return inCat.filter((x) =>
      (selectedDir === "Все" || x.purposes.some((d) => normCat(d).toLocaleLowerCase("ru") === selectedDir.toLocaleLowerCase("ru"))) &&
      (selectedComp === "Все" || x.comps.includes(selectedComp)) &&
      [x.p.id, x.p.name, x.p.brand, x.p.actives, x.p.inci ?? "", x.p.category, x.p.subcategory ?? "", x.p.description ?? ""].join(" ").toLowerCase().includes(s),
    ).map((x) => x.p);
  }, [inCat, q, selectedDir, selectedComp]);
  const archivedCount = products.filter((p) => p.archived).length;

  const chip = (active: boolean) => cn("shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-medium transition-all", active ? "glass-active" : "glass-chip text-primary/75 hover:text-primary");

  return (
    <>
      <PageTitle eyebrow="Библиотека средств" title={`${products.length - archivedCount} средств`}>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setImporting(true)}><Upload className="h-4 w-4" /> Импорт средств</Button>
          <Button size="sm" onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Новое средство</Button>
        </div>
      </PageTitle>
      <div className="relative mb-4">
        <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск: название, бренд, ID, компонент, INCI" className="h-11 rounded-full bg-card pl-10 shadow-panel" />
      </div>
      <p className="eyebrow mb-1.5">Категория</p>
      <div className="mb-3 flex min-w-0 flex-wrap gap-1.5">
        {cats.map((c) => <button key={c} onClick={() => { setCat(c); setDir("Все"); setComp("Все"); }} className={cn(chip(selectedCat === c), "max-w-full whitespace-normal break-words text-left")}>{c}</button>)}
      </div>
      {dirs.length > 1 && <>
        <p className="eyebrow mb-1.5">Назначение</p>
        <div className="mb-3 flex min-w-0 flex-wrap gap-1.5">
          {dirs.map((c) => <button key={c} onClick={() => setDir(c)} className={cn(chip(selectedDir === c), "max-w-full whitespace-normal break-words text-left")}>{c}</button>)}
        </div>
      </>}
      {comps.length > 1 && <>
        <p className="eyebrow mb-1.5">Компоненты (по INCI)</p>
        <div className="mb-5 flex min-w-0 flex-wrap gap-1.5">
          {comps.map((c) => <button key={c} onClick={() => setComp(c)} className={cn(chip(selectedComp === c), "max-w-full whitespace-normal break-words text-left")}>{c}</button>)}
        </div>
      </>}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Найдено: {list.length}</p>
        {(archivedCount > 0 || showArchived) && (
          <button onClick={() => { setShowArchived(!showArchived); setCat("Все"); setDir("Все"); setComp("Все"); }} className={chip(showArchived)}>
            <Archive className="mr-1 inline h-3.5 w-3.5" />{showArchived ? "Вернуться к библиотеке" : `Архив · ${archivedCount}`}
          </button>
        )}
      </div>
      {pendingDraft && !editing && (
        <Panel className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="min-w-0 text-sm">Есть несохранённый черновик: <b className="break-words">{[pendingDraft.f.brand, pendingDraft.f.name].filter(Boolean).join(" — ") || "новое средство"}</b></p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => { if (user) { const key = draftKey(user.id, null); localStorage.removeItem(key); void removeDraftPhoto(key); } setPendingDraft(null); }}>Удалить</Button>
            <Button size="sm" onClick={() => setEditing("new")}>Восстановить</Button>
          </div>
        </Panel>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {list.slice(0, limit).map((p) => (
          <button key={p.id} onClick={() => setEditing(p)} className="surface group flex min-w-0 flex-col p-2 text-left transition-transform active:scale-[0.98]">
            <div className="relative">
              <ProductImage product={p} size="lg" />
              {p.active && <span className="absolute left-2 top-2"><Tag tone="ink">актив</Tag></span>}
              <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-card/85 text-muted-foreground opacity-0 shadow-panel transition-opacity group-hover:opacity-100"><Pencil className="h-3.5 w-3.5" /></span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col px-1.5 pb-1.5 pt-2.5">
              <span className="truncate text-[11px] font-medium text-muted-foreground">{mainCategory(p)}{p.subcategory ? ` · ${p.subcategory}` : ""}</span>
              <span className="mt-1 truncate text-xs font-bold uppercase tracking-wide text-secondary">{p.brand}</span>
              <span className="mt-0.5 line-clamp-2 break-words text-sm font-semibold leading-snug">{p.name}</span>
              <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.actives || productDescription(p)}</span>
            </div>
          </button>
        ))}
      </div>
      {list.length > limit && (
        <div className="mt-5 text-center"><Button variant="outline" onClick={() => setLimit(limit + 60)}>Показать ещё ({list.length - limit})</Button></div>
      )}
      {editing && user && <ProductDialog key={editing === "new" ? "new" : editing.id} userId={user.id} defaultCategory={selectedCat === "Все" || selectedCat === OTHER_CATEGORY ? "" : selectedCat} product={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {importing && <ImportDialog onClose={() => setImporting(false)} />}
    </>
  );
}

const EMPTY: Product = { id: "", name: "", brand: "", category: "", subcategory: "", directions: [], actives: "", inci: "", instruction: "", specialistNotes: "", description: "", active: false };

function ProductDialog({ product, onClose, userId, defaultCategory }: { product: Product | null; onClose: () => void; userId: string; defaultCategory: string }) {
  const { products, saveProducts, dropProduct } = useStore();
  const key = draftKey(userId, product?.id ?? null);
  const initialDraft = useMemo(() => readDraft(key), [key]);
  const [f, setF] = useState<Product>(
    (initialDraft ? { ...initialDraft.f, image: initialDraft.f.image ?? product?.image } : null) ?? product ?? { ...EMPTY, category: defaultCategory, id: `GG-${String(products.length + 1).padStart(4, "0")}` },
  );
  const [dirText, setDirText] = useState(initialDraft?.dirText ?? (product?.directions ?? []).join("; "));
  const [restored] = useState(!!initialDraft);
  const [photoReady, setPhotoReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<null | "delete" | "archive">(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollMemory(`product:${key}`, scrollRef);
  const set = (k: keyof Product) => (e: { target: { value: string } }) => setF((cur) => ({ ...cur, [k]: e.target.value }));
  const idTaken = !product && products.some((p) => p.id === f.id.trim());
  const detected = useMemo(() => detectTags(f.inci), [f.inci]);
  const dirList = dirText.split(/[;,]/).map((x) => x.trim()).filter(Boolean);
  const isConfirmed = (t: string) => dirList.includes(CONFIRMED_PREFIX + t);
  const toggleConfirm = (t: string) => { dirty.current = true; setDirText((isConfirmed(t) ? dirList.filter((x) => x !== CONFIRMED_PREFIX + t) : [...dirList, CONFIRMED_PREFIX + t]).join("; ")); };
  const formCat = CATEGORY_NAMES.includes(f.category) ? f.category : mainCategory(f);

  useEffect(() => {
    let mounted = true;
    readDraftPhoto(key).then((image) => {
      if (mounted && image && initialDraft) setF((current) => ({ ...current, image }));
    }).catch(() => {}).finally(() => { if (mounted) setPhotoReady(true); });
    return () => { mounted = false; };
  }, [key, initialDraft]);

  // Автосохранение черновика на устройстве (при каждом изменении, при сворачивании приложения)
  const dirty = useRef(false);
  const latest = useRef({ f, dirText });
  latest.current = { f, dirText };
  const writeDraft = () => {
    if (!dirty.current) return;
    const { f: current, dirText: directions } = latest.current;
    const d: Draft = { f: { ...current, image: current.image?.startsWith("data:") ? undefined : current.image }, dirText: directions, at: Date.now() };
    try { localStorage.setItem(key, JSON.stringify(d)); }
    catch { toast.error("Не хватает памяти устройства для черновика"); }
  };
  useEffect(() => {
    const t = setTimeout(writeDraft, 200);
    return () => clearTimeout(t);
  });
  useEffect(() => {
    const flush = () => writeDraft();
    const onVis = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", flush);
    return () => { document.removeEventListener("visibilitychange", onVis); window.removeEventListener("pagehide", flush); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const change = <T,>(fn: (v: T) => void) => (v: T) => { dirty.current = true; fn(v); };

  const clearDraft = () => { dirty.current = false; localStorage.removeItem(key); void removeDraftPhoto(key); };
  const discard = () => { clearDraft(); onClose(); };
  const close = () => { writeDraft(); onClose(); };

  const save = async () => {
    setSaving(true);
    try {
      await saveProducts([{
        ...f, id: f.id.trim(), category: normCat(f.category) || "Без категории", subcategory: normCat(f.subcategory ?? ""),
        directions: dirText.split(/[;,]/).map((s) => s.trim()).filter(Boolean),
      }]);
      clearDraft();
      toast.success(product ? "Карточка обновлена" : "Средство добавлено");
      onClose();
    } catch {
      writeDraft();
      toast.error("Не удалось сохранить. Черновик сохранён на устройстве — попробуйте ещё раз");
    } finally {
      setSaving(false);
    }
  };

  const askDelete = async () => {
    if (!product) return;
    setBusy(true);
    try { setConfirm((await isProductUsed(product.id)) ? "archive" : "delete"); }
    catch { toast.error("Не удалось проверить назначения средства"); }
    finally { setBusy(false); }
  };
  const doDelete = async () => {
    if (!product) return;
    setBusy(true);
    try {
      if (await isProductUsed(product.id)) { setConfirm("archive"); return; }
      await deleteProduct(product.id);
      dropProduct(product.id);
      clearDraft();
      toast.success("Средство удалено");
      onClose();
    } catch { toast.error("Не удалось удалить средство"); }
    finally { setBusy(false); }
  };
  const setArchived = async (archived: boolean) => {
    if (!product) return;
    setBusy(true);
    try {
      await saveProducts([{ ...product, archived }]);
      clearDraft();
      toast.success(archived ? "Средство перенесено в архив" : "Средство возвращено в библиотеку");
      onClose();
    } catch { toast.error("Не удалось сохранить"); }
    finally { setBusy(false); }
  };

  const field = (label: string, el: React.ReactNode, wide = false) => (
    <label className={cn("grid min-w-0 gap-1 text-xs text-muted-foreground", wide && "md:col-span-2")}>{label}{el}</label>
  );
  const inp = "min-w-0 w-full text-base md:text-sm";
  const ta = "min-w-0 w-full break-words text-base md:text-sm";

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] min-w-0 max-w-2xl flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 px-4 pb-2 pt-5 text-left sm:px-6">
          <DialogTitle className="pr-8 font-display text-2xl">{product ? "Редактировать средство" : "Новое средство"}</DialogTitle>
          <p className="text-[11px] text-muted-foreground">Черновик сохраняется автоматически на этом устройстве</p>
        </DialogHeader>
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-4 sm:px-6">
          {restored && (
            <p className="mb-3 rounded-2xl bg-muted/60 px-3 py-2 text-xs">
              Восстановлен несохранённый черновик.{" "}
              <button className="font-semibold text-secondary underline" onClick={discard}>Отменить изменения</button>
            </p>
          )}
          {restored && photoReady && !f.image && <p className="mb-3 text-xs text-muted-foreground">Если вы добавляли фото, загрузите его ещё раз — оно могло не сохраниться.</p>}
          <div className="mb-4 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
            <div className="w-20 shrink-0 sm:w-28"><ProductImage product={f} size="lg" /></div>
            <div className="grid min-w-0 justify-items-start gap-2">
              <Button size="sm" variant="outline" className="h-auto max-w-full whitespace-normal break-words text-left" onClick={() => fileRef.current?.click()}><Camera className="h-4 w-4 shrink-0" /> {f.image ? "Заменить фото" : "Загрузить фото"}</Button>
              {f.image && <Button size="sm" variant="ghost" onClick={() => { dirty.current = true; setF((c) => ({ ...c, image: undefined })); void removeDraftPhoto(key); }}>Убрать фото</Button>}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  const image = await resizeImage(file);
                  await saveDraftPhoto(key, image);
                  dirty.current = true;
                  setF((c) => ({ ...c, image }));
                } catch { toast.error("Не удалось сохранить фото черновика — проверьте память устройства"); }
              }} />
            </div>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2" onInput={() => { dirty.current = true; }}>
            {field("Уникальный ID", <Input className={inp} value={f.id} disabled={!!product} onChange={set("id")} />)}
            {field("Бренд", <Input className={inp} value={f.brand} onChange={set("brand")} />)}
            {field("Полное название", <Input className={inp} value={f.name} onChange={set("name")} />, true)}
            {field("Основная категория", <>
              <select className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-base md:text-sm" value={formCat === OTHER_CATEGORY ? "" : formCat} onChange={(e) => { dirty.current = true; setF((c) => ({ ...c, category: e.target.value })); }}>
                <option value="">{f.category && formCat === OTHER_CATEGORY ? `Сейчас: ${f.category} — выберите` : "Выберите тип продукта"}</option>
                {CATEGORY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </>)}
            {field("Назначение / подкатегория", <>
              <Input className={inp} list="glow-purposes" value={f.subcategory ?? ""} onChange={set("subcategory")} />
              <datalist id="glow-purposes">{purposesOf(formCat).map((c) => <option key={c} value={c} />)}</datalist>
            </>)}
            {field("Направления действия (через точку с запятой)", <Input className={inp} value={dirText} onChange={(e) => setDirText(e.target.value)} placeholder="увлажнение; восстановление барьера" />, true)}
            {field("Описание", <Textarea className={ta} value={f.description ?? ""} onChange={set("description")} />, true)}
            {field("Ключевые (активные) компоненты", <Input className={inp} value={f.actives} onChange={set("actives")} />, true)}
            {field("Полный состав INCI", <Textarea className={ta} rows={4} value={f.inci ?? ""} onChange={set("inci")} />, true)}
            {(detected.sure.length > 0 || detected.maybe.length > 0) && (
              <div className="grid min-w-0 gap-1.5 text-xs md:col-span-2">
                <span className="text-muted-foreground">Теги по составу (обновляются автоматически, без оценки концентрации)</span>
                <div className="flex flex-wrap gap-1.5">
                  {detected.sure.map((t) => <Tag key={t}>{t}</Tag>)}
                  {detected.maybe.map((t) => (
                    <button key={t} type="button" onClick={() => toggleConfirm(t)} className={cn("rounded-full border px-2.5 py-1", isConfirmed(t) ? "glass-active" : "border-dashed text-muted-foreground")}>
                      {isConfirmed(t) ? `✓ ${t}` : `${t}? подтвердить`}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {field("Общие правила применения", <Textarea className={ta} value={f.instruction} onChange={set("instruction")} />, true)}
            {field("Профессиональные заметки специалиста (клиент не видит)", <Textarea className={ta} value={f.specialistNotes ?? ""} onChange={set("specialistNotes")} />, true)}
            <label className="flex min-w-0 items-start gap-2 text-sm md:col-span-2">
              <Switch className="shrink-0" checked={f.active} onCheckedChange={change<boolean>((v) => setF((c) => ({ ...c, active: v })))} />
              <span className="min-w-0 break-words">Содержит активы (требует графика введения). Категория при этом не меняется.</span>
            </label>
          </div>
          {idTaken && <p className="mt-2 text-xs text-destructive">Такой ID уже есть в библиотеке.</p>}
          <p className="mt-3 text-xs text-muted-foreground">Индивидуальные назначения клиенту задаются в редакторе ухода и не меняют эту карточку.</p>
          {product && (
            <div className="mt-6 border-t border-border pt-4">
              {product.archived ? (
                <Button variant="outline" size="sm" disabled={busy} onClick={() => setArchived(false)}><Archive className="h-4 w-4" /> Вернуть из архива</Button>
              ) : (
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={busy} onClick={askDelete}><Trash2 className="h-4 w-4" /> Удалить средство</Button>
              )}
            </div>
          )}
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-border/60 bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
          <Button variant="ghost" onClick={close}>Отмена</Button>
          <Button disabled={!f.name.trim() || !f.id.trim() || idTaken || saving} onClick={save}>{saving ? "Сохраняю…" : "Сохранить"}</Button>
        </div>
      </DialogContent>
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="w-[calc(100vw-1rem)] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === "archive" ? "Средство используется в схемах клиентов" : "Удалить средство?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "archive"
                ? "Полностью удалить его нельзя: у клиентов пропадут назначения. Можно перенести в архив — оно исчезнет из библиотеки для новых назначений, но останется в действующих схемах, календаре и истории."
                : "Вы действительно хотите удалить это средство из библиотеки GLOWGURU?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Отмена</AlertDialogCancel>
            {confirm === "archive" ? (
              <Button disabled={busy} onClick={() => setArchived(true)}><Archive className="h-4 w-4" /> В архив</Button>
            ) : (
              <Button variant="destructive" disabled={busy} onClick={doDelete}><Trash2 className="h-4 w-4" /> Удалить средство</Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

function ImportDialog({ onClose }: { onClose: () => void }) {
  const { products, saveProducts } = useStore();
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [withUpdates, setWithUpdates] = useState(false);
  const [withSimilar, setWithSimilar] = useState(false);
  const [busy, setBusy] = useState(false);

  const count = (s: ImportRow["status"]) => rows?.filter((r) => r.status === s).length ?? 0;
  const toImport = (rows ?? []).filter((r) => r.status === "new" || (withUpdates && r.status === "update") || (withSimilar && r.status === "similar"));

  const run = async () => {
    setBusy(true);
    try {
      await saveProducts(toImport.map((r) => r.product!));
      toast.success(`Импортировано средств: ${toImport.length}`);
      onClose();
    } catch {
      toast.error("Импорт не удался, попробуйте ещё раз");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] min-w-0 max-w-2xl overflow-x-hidden overflow-y-auto p-4 sm:p-6">
        <DialogHeader><DialogTitle className="font-display text-2xl">Импорт средств из CSV</DialogTitle></DialogHeader>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">
            <Upload className="h-4 w-4" /> Выбрать CSV-файл
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setFileName(file.name);
              setRows(analyzeCsv(await file.text(), products));
            }} />
          </label>
          <Button variant="outline" size="sm" onClick={downloadTemplate}><Download className="h-4 w-4" /> Шаблон CSV</Button>
        </div>
        <p className="text-xs text-muted-foreground">Колонки: {CSV_COLUMNS.join(", ")}. Несколько направлений или компонентов разделяйте точкой с запятой.</p>
        {rows && (
          <>
            <p className="text-sm">Файл: {fileName}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {[["Найдено", rows.length], ["Новые", count("new")], ["Уже есть (ID)", count("update")], ["Похожие", count("similar")], ["С ошибками", count("error")]].map(([l, n]) => (
                <Panel key={l as string} className="p-3"><div className="text-2xl font-semibold tabular-nums">{n}</div><div className="text-[11px] text-muted-foreground">{l}</div></Panel>
              ))}
            </div>
            {count("update") > 0 && (
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={withUpdates} onCheckedChange={(v) => setWithUpdates(!!v)} /> Обновить карточки с совпадающим ID ({count("update")})</label>
            )}
            {count("similar") > 0 && (
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={withSimilar} onCheckedChange={(v) => setWithSimilar(!!v)} /> Всё равно добавить похожие по бренду и названию ({count("similar")})</label>
            )}
            {rows.some((r) => r.status === "error" || r.status === "similar") && (
              <div className="max-h-56 overflow-y-auto rounded-md border border-border text-xs">
                {rows.filter((r) => r.status === "error" || r.status === "similar").map((r) => (
                  <div key={r.line} className="border-b border-border px-3 py-2 last:border-0">
                    <span className="font-medium">Строка {r.line}: </span>
                    {r.status === "error" ? <span className="text-destructive">{r.errors.join(", ")}</span> : <span>похоже на «{r.similarTo}»</span>}
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>Отмена</Button>
              <Button disabled={!toImport.length || busy} onClick={run}>{busy ? "Импортирую…" : `Импортировать ${toImport.length}`}</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
