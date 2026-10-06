import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark } from "@/components/proto/shared";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Новый пароль — GLOWGURU" },
      { name: "description", content: "Задайте новый пароль для входа в GLOWGURU." },
      { property: "og:title", content: "Новый пароль — GLOWGURU" },
      { property: "og:description", content: "Смена пароля в GLOWGURU." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Пароль изменён");
    const { data: u } = await supabase.auth.getUser();
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user!.id);
    nav({ to: roles?.some((r) => r.role === "specialist") ? "/specialist" : "/client" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm surface space-y-3 p-6 sm:p-8 animate-fade-up">
        <Wordmark className="text-primary" />
        <h1 className="font-display text-3xl">Новый пароль</h1>
        <Input type="password" placeholder="Новый пароль (от 8 символов)" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Button className="w-full" disabled={busy}>{busy ? "Подождите…" : "Сохранить пароль"}</Button>
      </form>
    </div>
  );
}
