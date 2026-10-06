import { useMemo, useState } from "react";
import { ChevronLeft, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Product } from "@/lib/demo-data";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CATEGORY_NAMES, OTHER_CATEGORY, componentTags, mainCategory, purposeTags } from "@/lib/taxonomy";
import { ProductImage } from "./shared";

const chip = (a: boolean) => cn("max-w-full shrink-0 break-words rounded-full border px-3 py-1.5 text-left text-xs font-medium transition-all", a ? "glass-active" : "glass-chip text-primary/75");

/** Выбор средства из библиотеки: категория → фильтры → карточки с фото. */
export function ProductPicker({ open, onClose, onPick, exclude, title = "Добавить из библиотеки" }: {
  open: boolean; onClose: () => void; onPick: (p: Product) => void; exclude?: string; title?: string;
}) {
  const { products } = useStore();
  const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [purpose, setPurpose] = useState<string | null>(null);
  const [comp, setComp] = useState<string | null>(null);

  const pool = useMemo(() => products.filter((p) => !p.archived && p.id !== exclude).map((p) => ({ p, cat: mainCategory(p), purposes: purposeTags(p), comps: componentTags(p) })), [products, exclude]);
  const counts = useMemo(() => { const m = new Map<string, number>(); pool.forEach((x) => m.set(x.cat, (m.get(x.cat) ?? 0) + 1)); return m; }, [pool]);
  const cats = [...CATEGORY_NAMES, ...(counts.get(OTHER_CATEGORY) ? [OTHER_CATEGORY] : [])];
  const inCat = pool.filter((x) => !cat || x.cat === cat);
  const purposes = Array.from(new Set(inCat.flatMap((x) => x.purposes))).sort((a, b) => a.localeCompare(b, "ru"));
  const comps = Array.from(new Set(inCat.flatMap((x) => x.comps))).sort((a, b) => a.localeCompare(b, "ru"));
  const s = q.toLowerCase().trim();
  const list = inCat.filter((x) => (!purpose || x.purposes.includes(purpose)) && (!comp || x.comps.includes(comp)) && (!s || `${x.p.brand} ${x.p.name}`.toLowerCase().includes(s)));
  const showList = !!cat || !!s;

  const reset = () => { setCat(null); setQ(""); setPurpose(null); setComp(null); };
  const close = () => { reset(); onClose(); };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] min-w-0 max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 space-y-3 px-4 pb-3 pt-5 text-left sm:px-6">
          <DialogTitle className="pr-8 font-display text-2xl">{title}</DialogTitle>
          <div className="relative">
            <Search className="absolute left-4 top-3 h-4 w-4 text-muted-foreground" />
            <Input autoFocus={false} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по бренду и названию" className="h-10 rounded-full bg-card pl-10 text-base md:text-sm" />
          </div>
          {cat && (
            <button onClick={() => { setCat(null); setPurpose(null); setComp(null); }} className="flex items-center gap-1 text-sm font-semibold text-secondary">
              <ChevronLeft className="h-4 w-4" /> {cat}
            </button>
          )}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-5 sm:px-6">
          {!showList ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {cats.map((c) => (
                <button key={c} onClick={() => setCat(c)} disabled={!counts.get(c)} className="surface flex min-w-0 items-center justify-between gap-2 p-3 text-left text-sm font-medium disabled:opacity-45">
                  <span className="min-w-0 break-words">{c}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{counts.get(c) ?? 0}</span>
                </button>
              ))}
            </div>
          ) : (
            <>
              {purposes.length > 0 && <>
                <p className="eyebrow mb-1.5">Назначение</p>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {purposes.map((t) => <button key={t} onClick={() => setPurpose(purpose === t ? null : t)} className={chip(purpose === t)}>{t}</button>)}
                </div>
              </>}
              {comps.length > 0 && <>
                <p className="eyebrow mb-1.5">Компоненты</p>
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {comps.map((t) => <button key={t} onClick={() => setComp(comp === t ? null : t)} className={chip(comp === t)}>{t}</button>)}
                </div>
              </>}
              <p className="mb-2 text-xs text-muted-foreground">Найдено: {list.length}</p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {list.slice(0, 90).map(({ p }) => (
                  <button key={p.id} onClick={() => { onPick(p); close(); }} className="surface flex min-w-0 flex-col p-2 text-left active:scale-[0.98]">
                    <ProductImage product={p} size="lg" />
                    <span className="mt-2 truncate px-1 text-[11px] font-bold uppercase tracking-wide text-secondary">{p.brand}</span>
                    <span className="line-clamp-2 break-words px-1 pb-1 text-sm font-semibold leading-snug">{p.name}</span>
                  </button>
                ))}
              </div>
              {list.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Ничего не найдено</p>}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
