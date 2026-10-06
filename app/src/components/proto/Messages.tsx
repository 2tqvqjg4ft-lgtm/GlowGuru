import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Camera, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { sendSpecialistMessage } from "@/lib/push.functions";
import { markChatNotificationsRead } from "./NotificationCenter";
import { signPhotos, uploadClientPhoto } from "@/lib/photos";
import { cn } from "@/lib/utils";
import { PageTitle, Panel } from "./shared";

interface Msg { id: string; body: string; created_at: string; read_at: string | null; client_id: string; sender_id: string; photo_path: string | null; url?: string | undefined }
const fmt = (s: string) => new Date(s).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/** Переписка по одному клиенту: загрузка, обновление каждые 10 с, отметка «прочитано» для входящих. */
function useThread(clientId: string, me: string | undefined) {
  const [list, setList] = useState<Msg[]>([]);
  const load = useCallback(async () => {
    if (!clientId || !me) return;
    const { data } = await supabase.from("messages").select("*").eq("client_id", clientId).order("created_at", { ascending: true }).limit(300);
    const rows = (data ?? []) as Msg[];
    const urls = await signPhotos(rows.map((m) => m.photo_path).filter((x): x is string => !!x));
    setList(rows.map((m) => ({ ...m, url: m.photo_path ? urls.get(m.photo_path) : undefined })));
    if (rows.some((m) => !m.read_at && m.sender_id !== me))
      void supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("client_id", clientId).neq("sender_id", me).is("read_at", null);
    void markChatNotificationsRead(me, clientId);
  }, [clientId, me]);
  useEffect(() => {
    setList([]);
    void load();
    const t = setInterval(() => void load(), 10000);
    return () => clearInterval(t);
  }, [load]);
  return { list, reload: load };
}

function Thread({ list, me, otherName }: { list: Msg[]; me: string; otherName: string }) {
  const end = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState<string>();
  useEffect(() => end.current?.scrollIntoView({ block: "nearest" }), [list.length]);
  if (!list.length) return <Panel className="text-sm text-muted-foreground">Сообщений пока нет.</Panel>;
  return (
    <Panel className="max-h-[60vh] space-y-2 overflow-y-auto">
      {list.map((m) => {
        const mine = m.sender_id === me;
        return (
          <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] rounded-2xl px-3.5 py-2.5", mine ? "bg-primary text-primary-foreground" : "bg-muted/60")}>
              <div className="mb-1 text-[11px] opacity-70">{mine ? "Вы" : otherName} · {fmt(m.created_at)}{mine && ` · ${m.read_at ? "прочитано" : "не прочитано"}`}</div>
              {m.url && (
                <button onClick={() => setFull(m.url)} className="mb-1 block">
                  <img src={m.url} alt="Фото в сообщении" className="max-h-56 rounded-xl object-cover" />
                </button>
              )}
              {m.body && <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>}
            </div>
          </div>
        );
      })}
      <div ref={end} />
      {full && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 p-4" onClick={() => setFull(undefined)}>
          <button className="absolute right-4 top-4 rounded-full bg-card p-2" aria-label="Закрыть"><X className="h-5 w-5" /></button>
          <img src={full} alt="Фото в полном размере" className="max-h-full max-w-full rounded-xl object-contain" />
        </div>
      )}
    </Panel>
  );
}

export function ClientMessages() {
  const { user } = useAuth();
  const { list, reload } = useThread(user?.id ?? "", user?.id);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<{ path: string; url: string }>();
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  const attach = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try { setPhoto(await uploadClientPhoto(user.id, f)); } catch (e) { toast.error(e instanceof Error ? e.message : "Не удалось загрузить фото"); } finally { setBusy(false); }
  };
  const submit = async () => {
    setBusy(true);
    const { error } = await supabase.from("messages").insert({ client_id: user.id, sender_id: user.id, body: text.trim().slice(0, 2000), photo_path: photo?.path ?? null });
    setBusy(false);
    if (error) { toast.error("Не удалось отправить"); return; }
    setText(""); setPhoto(undefined);
    await reload();
  };

  return (
    <>
      <PageTitle eyebrow="Сообщения" title="Чат со специалистом" />
      <div className="space-y-3">
        <Thread list={list} me={user.id} otherName="Специалист" />
        <Panel className="space-y-3">
          <Textarea rows={3} maxLength={2000} placeholder="Напишите сообщение" value={text} onChange={(e) => setText(e.target.value)} />
          {photo && (
            <div className="relative inline-block">
              <img src={photo.url} alt="Прикреплённое фото" className="h-20 w-20 rounded-xl object-cover" />
              <button onClick={() => setPhoto(undefined)} className="absolute -right-2 -top-2 rounded-full bg-card p-1 shadow-panel" aria-label="Убрать фото"><X className="h-3 w-3" /></button>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-muted/70 px-4 text-sm font-medium hover:bg-muted">
              <Camera className="h-4 w-4" /> {busy && !photo ? "Загружаем…" : "Прикрепить фото"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { void attach(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            <Button size="sm" onClick={submit} disabled={busy || (!text.trim() && !photo)}>{busy ? "Отправляем…" : "Отправить"}</Button>
          </div>
        </Panel>
      </div>
    </>
  );
}

export function SpecialistMessages({ initialClient = "" }: { initialClient?: string }) {
  const { user, role, loading } = useAuth();
  const send = useServerFn(sendSpecialistMessage);
  const [clients, setClients] = useState<{ id: string; full_name: string }[]>([]);
  const [to, setTo] = useState<string>("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const { list, reload } = useThread(to, user?.id);
  useEffect(() => { if (initialClient) setTo(initialClient); }, [initialClient]);

  useEffect(() => {
    if (role !== "specialist") return;
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "client");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (!ids.length) return;
      const { data } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      setClients(data ?? []);
      setTo((cur) => cur || data?.[0]?.id || "");
    })();
  }, [role]);

  if (loading) return null;
  if (role !== "specialist" || !user)
    return (
      <>
        <PageTitle eyebrow="Сообщения" title="Сообщения клиентам" />
        <Panel className="space-y-3 text-sm">
          <p>{user ? "Этот раздел доступен только специалисту." : "Чтобы писать клиентам, войдите как специалист."}</p>
          {!user && <Button asChild size="sm"><Link to="/auth">Войти</Link></Button>}
        </Panel>
      </>
    );

  const submit = async () => {
    setBusy(true);
    try {
      await send({ data: { clientId: to, body: text } });
      toast.success("Отправлено, клиентка получит уведомление");
      setText("");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось отправить");
    } finally {
      setBusy(false);
    }
  };
  const name = clients.find((c) => c.id === to)?.full_name || "Клиент";

  return (
    <>
      <PageTitle eyebrow="Сообщения" title="Сообщения клиентам" />
      {clients.length === 0 ? (
        <Panel className="text-sm text-muted-foreground">Пока ни один клиент не зарегистрировался.</Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
          <Panel className="flex gap-1 overflow-x-auto p-2 lg:flex-col">
            {clients.map((c) => (
              <button key={c.id} onClick={() => setTo(c.id)}
                className={cn("shrink-0 rounded-xl px-3 py-2 text-left text-sm", to === c.id ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                {c.full_name || "Без имени"}
              </button>
            ))}
          </Panel>
          <div className="min-w-0 space-y-3">
            <Thread list={list} me={user.id} otherName={name} />
            <Panel className="space-y-3">
              <Textarea rows={3} maxLength={2000} placeholder="Текст сообщения" value={text} onChange={(e) => setText(e.target.value)} />
              <Button size="sm" onClick={submit} disabled={busy || !text.trim() || !to}>{busy ? "Отправляем…" : "Отправить"}</Button>
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
