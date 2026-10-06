import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark } from "@/components/proto/shared";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Вход — GLOWGURU" },
      { name: "description", content: "Вход в личный кабинет GLOWGURU для клиентов и специалиста." },
      { property: "og:title", content: "Вход — GLOWGURU" },
      { property: "og:description", content: "Вход в личный кабинет GLOWGURU." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://esthetics-suite-pro.lovable.app/icon-512.png" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:image", content: "https://esthetics-suite-pro.lovable.app/icon-512.png" },
    ],
  }),
  component: () => <AuthPage />,
});

export function AuthPage({ initialMode = "in" }: { initialMode?: "in" | "up" } = {}) {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email, password, options: { emailRedirectTo: window.location.origin + "/client", data: { full_name: name } },
        });
        if (error) throw error;
        if (!data.session) return setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      const { data: u } = await supabase.auth.getUser();
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user!.id);
      nav({ to: roles?.some((r) => r.role === "specialist") ? "/specialist" : "/client" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm surface p-6 sm:p-8 animate-fade-up">
        <Wordmark className="text-primary" />
        {sent ? (
          <p className="mt-4 text-sm">Мы отправили письмо на {email}. Подтвердите адрес по ссылке из письма, затем войдите.</p>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-3">
            <h1 className="font-display text-3xl">{mode === "in" ? "Вход" : "Регистрация"}</h1>
            {mode === "up" && <Input placeholder="Имя и фамилия" value={name} onChange={(e) => setName(e.target.value)} required />}
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Пароль" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button className="w-full" disabled={busy}>{busy ? "Подождите…" : mode === "in" ? "Войти" : "Создать аккаунт"}</Button>
            {mode === "in" && (
              <button type="button" className="w-full text-center text-xs text-primary" onClick={async () => {
                if (!email) { toast.error("Введите email, затем нажмите «Забыли пароль?»"); return; }
                const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
                if (error) toast.error(error.message);
                else toast.success("Письмо для смены пароля отправлено на " + email);
              }}>Забыли пароль?</button>
            )}
            <button type="button" className="w-full text-center text-xs text-muted-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
              {mode === "in" ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
