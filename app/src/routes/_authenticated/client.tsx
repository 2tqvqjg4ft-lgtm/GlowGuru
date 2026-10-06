import { createFileRoute } from "@tanstack/react-router";
import { ClientApp } from "@/components/proto/ClientApp";

export const Route = createFileRoute("/_authenticated/client")({
  head: () => ({
    meta: [
      { title: "Кабинет клиента — GLOWGURU" },
      { name: "description", content: "Уход на сегодня, план, календарь активов и дневник кожи." },
      { property: "og:title", content: "Кабинет клиента — GLOWGURU" },
      { property: "og:description", content: "Уход на сегодня, план, календарь активов и дневник кожи." },
       { property: "og:type", content: "website" },
       { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClientApp,
});
