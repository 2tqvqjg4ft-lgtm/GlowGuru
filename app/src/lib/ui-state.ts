import { useEffect, useState, type RefObject, type SetStateAction } from "react";

/**
 * Рабочее место (раздел, выбранная клиентка, вкладка, фильтры, прокрутка) хранится на устройстве,
 * чтобы после выгрузки вкладки iOS открывалось то же место. Храним только идентификаторы и
 * положения — без персональных данных.
 */
const PREFIX = "glow-ui:";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(PREFIX + key);
    return v === null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* нет места */ }
}

export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => read(key, initial));
  const setPersistentValue = (next: SetStateAction<T>) => setValue((current) => {
    const resolved = typeof next === "function" ? (next as (previous: T) => T)(current) : next;
    write(key, resolved);
    return resolved;
  });
  useEffect(() => { write(key, value); }, [key, value]);
  return [value, setPersistentValue] as const;
}

/** Запоминает и восстанавливает прокрутку окна (el не задан) или контейнера. */
export function useScrollMemory(key: string, el?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const target = () => el?.current ?? null;
    const get = () => (target() ? target()!.scrollTop : window.scrollY);
    const saved = read<number>("scroll:" + key, 0);
    // Контент может дорисовываться (данные, фото) — несколько попыток восстановить
    let tries = 0;
    let restoring = true;
    const restore = () => {
      const t = target();
      if (t) t.scrollTop = saved; else window.scrollTo({ top: saved });
      if (Math.abs(get() - saved) > 2 && tries++ < 20) setTimeout(restore, 100);
      else restoring = false;
    };
    requestAnimationFrame(restore);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const save = () => write("scroll:" + key, get());
    const onScroll = () => {
      if (restoring) return;
      clearTimeout(timer);
      timer = setTimeout(save, 150);
    };
    const onHide = () => {
      clearTimeout(timer);
      // Safari may close the page before the debounced scroll handler runs.
      write("scroll:" + key, get());
    };
    const node: HTMLElement | Window = target() ?? window;
    node.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearTimeout(timer);
      if (!restoring) save();
      node.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
