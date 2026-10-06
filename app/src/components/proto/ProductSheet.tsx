import { useState } from "react";
import { Check, Repeat } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Client, Step } from "@/lib/demo-data";
import { useStore } from "@/lib/store";
import { mainCategory, purposeTags } from "@/lib/taxonomy";
import { ProductImage, Tag, productDescription } from "./shared";

/** Карточка назначенного средства для клиентки. Внутренние заметки специалиста не показываются. */
export function ProductSheet({ client, step, onClose, readOnly }: { client: Client; step: Step | null; onClose: () => void; readOnly?: boolean }) {
  const { product, updateClient } = useStore();
  const [alts, setAlts] = useState(false);
  if (!step) return null;
  // step — оригинальный шаг из опубликованной схемы; выбранное средство берём из choices.
  const chosenId = client.choices?.[step.id];
  const alt = step.alternatives?.find((a) => a.productId === chosenId);
  const current = alt ? alt.productId : step.productId;
  const p = product(current);
  const usage = alt?.usage || step.usage || p?.instruction;
  const options = [{ productId: step.productId, usage: step.usage }, ...(step.alternatives ?? [])];

  const choose = (id: string) => {
    updateClient(client.id, (c) => {
      const ch = { ...(c.choices ?? {}) };
      if (id === step.productId) delete ch[step.id];
      else ch[step.id] = id;
      return { ...c, choices: ch };
    });
    setAlts(false);
    toast.success("Средство выбрано — специалист получит уведомление");
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto overflow-x-hidden rounded-3xl">
        <DialogHeader>
          <DialogTitle className="break-words pr-6 text-left">{alts ? "Разрешённые альтернативы" : p?.name ?? "Средство"}</DialogTitle>
        </DialogHeader>
        {alts ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Эти средства одобрены специалистом для этого этапа. Выбранное займёт то же место в схеме.</p>
            {options.map((o) => {
              const op = product(o.productId);
              const on = o.productId === current;
              return (
                <button key={o.productId} disabled={readOnly} onClick={() => choose(o.productId)} className="flex w-full min-w-0 items-center gap-3 rounded-2xl bg-muted/45 p-2.5 text-left hover:bg-muted/70">
                  <ProductImage product={op} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground">{op?.brand}</div>
                    <div className="break-words text-sm font-semibold">{op?.name ?? "Средство"}</div>
                    {o.productId === step.productId && <div className="text-[11px] text-muted-foreground">основное назначение</div>}
                  </div>
                  {on && <Check className="h-4 w-4 shrink-0 text-secondary" />}
                </button>
              );
            })}
            <Button variant="ghost" className="w-full" onClick={() => setAlts(false)}>Назад к карточке</Button>
          </div>
        ) : (
          <div className="min-w-0 space-y-4 text-sm">
            <div className="flex min-w-0 gap-3">
              <ProductImage product={p} size="lg" />
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{p?.brand}</div>
                <div className="break-words font-semibold">{p?.name}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {p && <Tag>{mainCategory(p)}</Tag>}
                  {p && purposeTags(p).slice(0, 3).map((t) => <Tag key={t} tone="sky">{t}</Tag>)}
                </div>
                {alt && <p className="mt-1 text-[11px] text-secondary">Выбрано вами вместо основного средства</p>}
              </div>
            </div>
            {p && <Block title="Описание">{productDescription(p)}</Block>}
            {p?.actives && <Block title="Ключевые компоненты">{p.actives}</Block>}
            {p?.inci && <Block title="Полный состав (INCI)"><span className="text-xs">{p.inci}</span></Block>}
            {usage && <Block title="Способ применения">{usage}</Block>}
            {(step.advice || step.note) && (
              <Block title="Рекомендации специалиста">
                {step.advice && <p>{step.advice}</p>}
                {step.note && <p className="mt-1">{step.note}</p>}
              </Block>
            )}
            {!!step.alternatives?.length && (
              <Button variant="outline" className="w-full" onClick={() => setAlts(true)}><Repeat className="h-4 w-4" /> Посмотреть альтернативы</Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 break-words rounded-2xl bg-muted/40 p-3">
      <div className="mb-1 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{title}</div>
      <div className="text-foreground/85">{children}</div>
    </div>
  );
}
