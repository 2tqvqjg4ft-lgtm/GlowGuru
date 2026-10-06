import type { Product } from "./demo-data";

/** Основные категории библиотеки и назначения внутри них. */
export const MAIN_CATEGORIES: { name: string; purposes: string[]; keys: RegExp }[] = [
  { name: "Демакияж и первый этап очищения", purposes: ["Мицеллярная вода", "Гидрофильное масло", "Бальзам", "Щербет", "Очищающее молочко"], keys: /демакияж|мицелляр|гидрофил|cleansing oil|бальзам для снятия|щербет|молочко|первый этап/i },
  { name: "Умывание", purposes: ["Пенка", "Гель", "Крем-гель"], keys: /умыван|пенк|foam|cleanser|гель для умыв|очищен/i },
  { name: "Тоники и эссенции", purposes: ["Увлажняющие", "Успокаивающие", "Осветляющие", "Отшелушивающие"], keys: /тоник|toner|эссенц|essence|лосьон/i },
  { name: "Сыворотки", purposes: ["Увлажняющие", "Восстанавливающие", "Успокаивающие", "Осветляющие", "Себорегулирующие"], keys: /сыворот|serum|ампул|концентрат|актив|ретино/i },
  { name: "Кремы и флюиды", purposes: ["Увлажняющие", "Питательные", "Восстанавливающие", "Успокаивающие", "Себорегулирующие", "Лёгкие флюиды", "Гель-кремы"], keys: /крем|cream|флюид|fluid|эмульс|увлажн/i },
  { name: "SPF", purposes: ["SPF 30", "SPF 50", "Крем", "Флюид", "Стик", "Спрей", "Тонирующий"], keys: /spf|солнцезащ|sun|санскрин/i },
  { name: "Дополнительное очищение и эксфолиация", purposes: ["Энзимная пудра", "Домашний пилинг", "Отшелушивающий тоник"], keys: /энзим|пудр|пилинг|peel|эксфол|скраб|гоммаж/i },
  { name: "Маски", purposes: ["Увлажняющие", "Восстанавливающие", "Успокаивающие", "Очищающие"], keys: /маск|mask/i },
  { name: "Дополнительный уход", purposes: ["Вокруг глаз", "Шея и декольте", "Уход за губами", "Локальные средства", "Вспомогательные средства"], keys: /глаз|век|eye|шея|декольт|губ|lip|локальн|точечн|патч/i },
  { name: "Терапевтические препараты", purposes: ["Адапален", "Третиноин", "Бензоилпероксид", "Азелаиновая кислота", "Антибиотики", "Комбинированные препараты"], keys: /терапевт|препарат|адапал|дифферин|третиноин|бензоил|клиндам|эритромиц|метронид|антибиот/i },
];
export const OTHER_CATEGORY = "Другое";
export const CATEGORY_NAMES = MAIN_CATEGORIES.map((c) => c.name);

const lc = (s: string) => s.replace(/\s+/g, " ").trim().toLocaleLowerCase("ru");

/** Основная категория — по типу продукта (сохранённая категория, подкатегория, название), не по составу. */
export function mainCategory(p: Pick<Product, "category" | "subcategory" | "name">): string {
  const exact = MAIN_CATEGORIES.find((c) => lc(c.name) === lc(p.category));
  if (exact) return exact.name;
  for (const text of [p.category, p.subcategory ?? "", p.name]) {
    const hit = MAIN_CATEGORIES.find((c) => c.keys.test(text));
    if (hit) return hit.name;
  }
  return OTHER_CATEGORY;
}

export const purposesOf = (cat: string) => MAIN_CATEGORIES.find((c) => c.name === cat)?.purposes ?? [];

/** Правила распознавания компонентов INCI. Каждое вещество — отдельный тег, без объединения. */
type Rule = { tag: string; sure: RegExp; maybe?: RegExp };
const RULES: Rule[] = [
  { tag: "ретинол", sure: /\bretinol\b(?!\s*palmitate)/i },
  { tag: "ретиноиды", sure: /retinyl (palmitate|propionate|acetate|retinoate)|retinal(dehyde)?\b|hydroxypinacolone retinoate|granactive retinoid/i, maybe: /bakuchiol/i },
  { tag: "адапален", sure: /\badapalene\b/i },
  { tag: "третиноин", sure: /\btretinoin\b|retinoic acid/i },
  { tag: "бензоилпероксид", sure: /benzoyl peroxide/i },
  { tag: "антибиотики", sure: /clindamycin|erythromycin|metronidazole|nadifloxacin/i },
  { tag: "азелаиновая кислота", sure: /azelaic acid/i, maybe: /potassium azeloyl diglycinate|azeloglicina/i },
  { tag: "ниацинамид", sure: /\bniacinamide\b|nicotinamide\b/i },
  { tag: "витамин C", sure: /ascorbic acid|ascorbyl (glucoside|phosphate|palmitate|tetraisopalmitate)|ethyl ascorbic|sodium ascorbyl|magnesium ascorbyl|ascorbyl tetraisopalmitate/i },
  { tag: "транексамовая кислота", sure: /tranexamic acid/i },
  { tag: "AHA", sure: /glycolic acid|lactic acid|mandelic acid|malic acid|tartaric acid/i, maybe: /citric acid/i },
  { tag: "BHA / салициловая кислота", sure: /salicylic acid|betaine salicylate/i, maybe: /willow bark|salix alba/i },
  { tag: "PHA", sure: /gluconolactone|lactobionic acid/i },
  { tag: "церамиды", sure: /ceramide\s*(np|ap|eop|ns|as|eos|ng|1|2|3|6)|ceramides?\b/i },
  { tag: "пептиды", sure: /peptide|palmitoyl (tri|tetra|penta|hexa)|acetyl hexapeptide|copper tripeptide/i },
  { tag: "гиалуроновая кислота", sure: /hyaluronic acid|sodium hyaluronate|hydrolyzed hyaluronic/i },
  { tag: "пантенол", sure: /panthenol/i },
  { tag: "центелла", sure: /centella asiatica|madecassoside|asiaticoside|madecassic acid/i },
  { tag: "мочевина", sure: /\burea\b/i },
  { tag: "цинк", sure: /zinc pca|zinc gluconate/i },
  { tag: "арбутин", sure: /arbutin/i },
  { tag: "UV-фильтр: оксид цинка", sure: /zinc oxide/i },
  { tag: "UV-фильтр: диоксид титана", sure: /titanium dioxide/i, maybe: /\bci 77891\b/i },
  { tag: "UV-фильтры химические", sure: /avobenzone|butyl methoxydibenzoylmethane|octocrylene|bis-ethylhexyloxyphenol|tinosorb|uvinul|ethylhexyl (triazone|salicylate|methoxycinnamate)|diethylamino hydroxybenzoyl|homosalate|methylene bis-benzotriazolyl|drometrizole|terephthalylidene|mexoryl/i },
];

export type Detected = { sure: string[]; maybe: string[] };

/** Теги по INCI. Не определяет концентрацию и пригодность — только наличие компонента. */
export function detectTags(inci: string | undefined): Detected {
  const text = inci ?? "";
  const sure: string[] = [], maybe: string[] = [];
  if (!text.trim()) return { sure, maybe };
  for (const r of RULES) {
    if (r.sure.test(text)) sure.push(r.tag);
    else if (r.maybe?.test(text)) maybe.push(r.tag);
  }
  return { sure, maybe };
}

export const CONFIRMED_PREFIX = "тег: ";
/** Подтверждённые специалистом неоднозначные теги хранятся среди направлений с префиксом. */
export const confirmedTags = (p: Pick<Product, "directions">) =>
  (p.directions ?? []).filter((d) => d.startsWith(CONFIRMED_PREFIX)).map((d) => d.slice(CONFIRMED_PREFIX.length));
export const plainDirections = (p: Pick<Product, "directions">) => (p.directions ?? []).filter((d) => !d.startsWith(CONFIRMED_PREFIX));

/** Все компонентные теги продукта (автоматически + подтверждённые). */
export function componentTags(p: Pick<Product, "inci" | "directions">): string[] {
  const d = detectTags(p.inci);
  const confirmed = confirmedTags(p).filter((t) => d.maybe.includes(t) || d.sure.includes(t));
  return Array.from(new Set([...d.sure, ...confirmed]));
}

/** Назначения: подкатегория + направления действия (без служебных тегов). */
export function purposeTags(p: Pick<Product, "subcategory" | "directions">): string[] {
  return Array.from(new Set([p.subcategory ?? "", ...plainDirections(p)].map((s) => s.trim()).filter(Boolean)));
}
