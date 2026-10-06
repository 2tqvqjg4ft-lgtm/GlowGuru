import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  entity_type: string | null;
  entity_id: string | null;
  client_id: string | null;
  created_at: string;
  read_at: string | null;
}

const T = () => supabase.from("notifications" as never) as any;

/** Реальные уведомления текущего пользователя с обновлением в реальном времени. */
export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const uid = user?.id;

  const load = useCallback(async () => {
    if (!uid) return;
    const { data } = await T().select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(100);
    setItems((data ?? []) as AppNotification[]);
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    void load();
    const ch = supabase
      .channel(`notif-${uid}`)
      .on("postgres_changes" as never, { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` } as never, () => void load())
      .subscribe();
    const t = setInterval(() => void load(), 30000);
    const onRead = () => void load();
    window.addEventListener("glow:notifications", onRead);
    return () => {
      clearInterval(t);
      window.removeEventListener("glow:notifications", onRead);
      void supabase.removeChannel(ch);
    };
  }, [uid, load]);

  const markRead = async (id: string) => {
    const now = new Date().toISOString();
    setItems((l) => l.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: now } : n)));
    await T().update({ read_at: now }).eq("id", id).is("read_at", null);
  };
  const markAll = async () => {
    if (!uid) return;
    const now = new Date().toISOString();
    setItems((l) => l.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await T().update({ read_at: now }).eq("user_id", uid).is("read_at", null);
  };

  const unread = items.filter((n) => !n.read_at).length;
  const unreadChat = items.filter((n) => !n.read_at && n.entity_type === "chat").length;
  return { items, unread, unreadChat, markRead, markAll };
}

/** Пометить прочитанными уведомления чата с этой клиенткой (когда чат открыт напрямую). */
export async function markChatNotificationsRead(me: string, clientId: string) {
  const { data } = await T()
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", me)
    .eq("entity_type", "chat")
    .eq("client_id", clientId)
    .is("read_at", null)
    .select("id");
  if (data?.length) window.dispatchEvent(new Event("glow:notifications"));
}

const fmt = (s: string) => new Date(s).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

export function NotificationBell({ n, onOpen }: { n: ReturnType<typeof useNotifications>; onOpen: (x: AppNotification) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={n.unread ? `Уведомления, непрочитанных: ${n.unread}` : "Уведомления"}
        className="glass-chip relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary transition-all active:scale-95"
      >
        <Bell className="h-[18px] w-[18px]" />
        {n.unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold leading-none text-secondary-foreground ring-2 ring-background">
            {n.unread > 99 ? "99+" : n.unread}
          </span>
        )}
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex h-[100dvh] w-full max-w-full flex-col gap-0 border-none bg-background p-0 sm:max-w-md [&>button]:top-[calc(1rem+env(safe-area-inset-top))] [&>button]:h-10 [&>button]:w-10 [&>button]:rounded-full [&>button]:flex [&>button]:items-center [&>button]:justify-center">
          <SheetHeader className="shrink-0 space-y-2 border-b border-border/60 px-4 pb-3 pt-[calc(1.1rem+env(safe-area-inset-top))] text-left sm:px-5">
            <SheetTitle className="pr-12 font-sans text-xl font-semibold">Уведомления</SheetTitle>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">{n.unread ? `Новых: ${n.unread}` : "Все прочитаны"}</span>
              <button
                onClick={() => void n.markAll()}
                disabled={!n.unread}
                className="glass-chip flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-primary transition-all active:scale-95 disabled:opacity-50"
              >
                <CheckCheck className="h-4 w-4" /> Прочитать все
              </button>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-4">
            {n.items.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-4 py-16 text-center text-sm text-muted-foreground">
                <Bell className="h-6 w-6 opacity-50" /> Пока уведомлений нет
              </div>
            )}
            {([["Новые", n.items.filter((x) => !x.read_at)], ["Прочитанные", n.items.filter((x) => x.read_at)]] as const).map(([label, list]) =>
              list.length ? (
                <section key={label} className="mb-4">
                  <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</h3>
                  <ul className="space-y-2">
                    {list.map((x) => (
                      <li key={x.id}>
                        <button
                          onClick={() => {
                            void n.markRead(x.id);
                            setOpen(false);
                            onOpen(x);
                          }}
                          className={cn(
                            "flex min-h-16 w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all active:scale-[0.99]",
                            x.read_at ? "border-transparent bg-muted/35 text-foreground/70" : "border-primary/10 bg-card shadow-panel",
                          )}
                        >
                          <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", x.read_at ? "bg-border" : "bg-secondary")} aria-hidden />
                          <span className="min-w-0 flex-1">
                            <span className={cn("block break-words text-[15px] leading-snug", x.read_at ? "font-medium" : "font-semibold")}>{x.title}</span>
                            {x.body && <span className="mt-1 line-clamp-3 block break-words text-[13px] leading-snug text-muted-foreground">{x.body}</span>}
                            <span className="mt-1.5 block text-xs text-muted-foreground">{fmt(x.created_at)}</span>
                          </span>
                          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null,
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
