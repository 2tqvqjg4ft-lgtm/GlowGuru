import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

// Главная ссылка должна отдавать нейтральное превью (иконка + «Кабинет клиента»),
// поэтому редирект по роли выполняется только в браузере, а не на сервере:
// мессенджеры и поисковики получают эту страницу как есть.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      throw redirect({ to: "/specialist" });
    }
  },
  head: () => ({
    meta: [
      { title: "GLOWGURU — кабинет клиента" },
      { name: "description", content: "Ваша схема домашнего ухода, дневник кожи и связь со специалистом." },
      { property: "og:title", content: "GLOWGURU — кабинет клиента" },
      { property: "og:description", content: "Ваша схема домашнего ухода, дневник кожи и связь со специалистом." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://esthetics-suite-pro.lovable.app/icon-512.png" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "GLOWGURU — кабинет клиента" },
      { name: "twitter:description", content: "Ваша схема домашнего ухода, дневник кожи и связь со специалистом." },
      { name: "twitter:image", content: "https://esthetics-suite-pro.lovable.app/icon-512.png" },
    ],
  }),
  component: HomeSplash,
});

function HomeSplash() {
  const router = useRouter();
  useEffect(() => {
    // На сервере beforeLoad не выполняется, поэтому первый вход по ссылке
    // перенаправляем отсюда — по роли дальше разберётся /specialist.
    router.navigate({ to: "/specialist", replace: true });
  }, [router]);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#FAFBFD]">
      <img src="/icon-512.png" alt="GLOWGURU" className="h-20 w-20 rounded-[22%] shadow-sm" />
      <div className="text-lg font-extrabold tracking-tight text-[#1A2438]">GLOWGURU</div>
    </div>
  );
}
