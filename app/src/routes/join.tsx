import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "./auth";

const T = "GLOWGURU — регистрация клиента";
const D = "Создайте личный кабинет: ваша схема домашнего ухода, дневник кожи и связь со специалистом.";
const IMG = "https://esthetics-suite-pro.lovable.app/icon-512.png";

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: T },
      { name: "description", content: D },
      { property: "og:title", content: T },
      { property: "og:description", content: D },
      { property: "og:type", content: "website" },
      { property: "og:image", content: IMG },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:image", content: IMG },
    ],
  }),
  component: () => <AuthPage initialMode="up" />,
});
