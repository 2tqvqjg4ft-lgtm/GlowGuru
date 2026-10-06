import type { Client, Product, Step } from "./demo-data";
import { componentTags, mainCategory, purposeTags } from "./taxonomy";

export const THERAPY = "Терапевтические препараты";

/** Проценты, указанные в названии/активах, например «15%». */
const percents = (p: Product) => [...`${p.name} ${p.actives}`.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)].map((m) => Number(m[1]!.replace(",", ".")));
const activeSet = (p: Product) => new Set([...componentTags(p), ...p.actives.toLowerCase().split(/[,;/+]/).map((s) => s.trim()).filter((s) => s.length > 2)]);

export interface Suggestion { product: Product; reason: string }

/**
 * Возможные замены: общий активный компонент, та же категория (форма) и совпадающее назначение.
 * Если известна концентрация у обоих — она должна совпадать (±20%). Терапевтические препараты
 * автоматически не предлагаются: только ручной выбор специалиста.
 */
export function suggestAlternatives(base: Product | undefined, all: Product[], exclude: string[]): Suggestion[] {
  if (!base) return [];
  const cat = mainCategory(base);
  if (cat === THERAPY) return [];
  const actives = activeSet(base);
  if (!actives.size) return [];
  const purposes = new Set(purposeTags(base));
  const pc = percents(base);
  const out: Suggestion[] = [];
  for (const p of all) {
    if (p.id === base.id || p.archived || exclude.includes(p.id)) continue;
    if (mainCategory(p) !== cat) continue;
    const shared = [...activeSet(p)].filter((a) => actives.has(a));
    if (!shared.length) continue;
    const pp = purposeTags(p);
    if (purposes.size && pp.length && !pp.some((x) => purposes.has(x))) continue;
    const pc2 = percents(p);
    if (pc.length && pc2.length && Math.abs(pc[0]! - pc2[0]!) > pc[0]! * 0.2) continue;
    const conc = pc.length && pc2.length ? `, концентрация ${pc2[0]}%` : pc.length || pc2.length ? ", концентрация не указана — проверьте" : "";
    out.push({ product: p, reason: `${shared.slice(0, 3).join(", ")} · ${cat.toLowerCase()}${conc}` });
  }
  return out.slice(0, 8);
}

/** Шаг с учётом выбора клиентки — только из разрешённых специалистом альтернатив. */
export function applyChoice(step: Step, choices: Record<string, string> | undefined): Step {
  const id = choices?.[step.id];
  if (!id || id === step.productId) return step;
  const alt = step.alternatives?.find((a) => a.productId === id);
  if (!alt) return step;
  return { ...step, productId: alt.productId, usage: alt.usage || step.usage, chosenFrom: step.productId };
}

export function withChoices(c: Client): Client {
  const ch = c.choices;
  if (!ch || !Object.keys(ch).length) return c;
  const map = (l: Step[] | undefined) => l?.map((s) => applyChoice(s, ch));
  return { ...c, routine: { am: map(c.routine.am)!, pm: map(c.routine.pm)!, extra: map(c.routine.extra) } };
}
