import { createFileRoute, redirect } from "@tanstack/react-router";
import { SpecialistApp } from "@/components/proto/SpecialistApp";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/specialist")({
  // Проверка роли по базе; данные дополнительно защищены правилами доступа на стороне базы.
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.rpc("has_role", { _user_id: context.user.id, _role: "specialist" });
    if (!data) throw redirect({ to: "/client" });
  },
  head: () => ({
    meta: [
      { title: "Кабинет специалиста — GLOWGURU" },
      { name: "description", content: "Клиенты, библиотека средств, редактор схем ухода и календарь активов." },
      { property: "og:title", content: "Кабинет специалиста — GLOWGURU" },
      { property: "og:description", content: "Клиенты, библиотека средств, редактор схем ухода и календарь активов." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SpecialistApp,
});
