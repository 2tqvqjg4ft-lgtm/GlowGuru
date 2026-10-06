import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { StoreProvider } from "@/lib/store";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-light text-foreground">404</h1>
        <h2 className="mt-4 text-xl text-foreground">Страница не найдена</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Возможно, она была перемещена или адрес указан неверно.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-secondary"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const missingModule = /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module/i.test(error.message);
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl text-foreground">Страница не загрузилась</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Что-то пошло не так. Попробуйте обновить или вернуться на главную.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
               if (missingModule) {
                 window.location.reload();
                 return;
               }
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-secondary"
          >
            Попробовать снова
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            На главную
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
       { name: "theme-color", content: "#1A2438" },
       { name: "apple-mobile-web-app-capable", content: "yes" },
       { name: "apple-mobile-web-app-title", content: "GLOWGURU" },
      { title: "GLOWGURU — сопровождение ухода за кожей" },
      {
        name: "description",
        content: "GLOWGURU — ведение клиентов и индивидуальных схем домашнего ухода.",
      },
      { property: "og:title", content: "GLOWGURU — сопровождение ухода за кожей" },
      {
        property: "og:description",
        content: "Индивидуальные схемы домашнего ухода и графики активов.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=Manrope:wght@300;400;500;600&display=swap",
      },
       { rel: "icon", href: "/favicon.png?v=20260926", type: "image/png" },
       { rel: "apple-touch-icon", href: "/apple-touch-icon.png?v=20260926", sizes: "180x180", type: "image/png" },
       { rel: "manifest", href: "/manifest.webmanifest?v=20260926" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const EARLY_RECOVERY = `
// A dev-server update or deploy can invalidate a module chunk an open tab still
// references ("Importing a module script failed"). Reload once, before React
// mounts, so the tab fetches current module URLs instead of staying blank.
(function () {
  var KEY = "glow-module-reload";
   var moduleError = /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Failed to load module script/i;
  function recover() {
    var last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 30000) return;
    sessionStorage.setItem(KEY, String(Date.now()));
    window.location.reload();
  }
  window.addEventListener("vite:preloadError", function (e) { e.preventDefault(); recover(); });
  window.addEventListener("error", function (e) {
     if (e && ((e.target && e.target.tagName === "SCRIPT") || moduleError.test(e.message || ""))) recover();
  }, true);
   window.addEventListener("unhandledrejection", function (e) {
     if (moduleError.test(String(e.reason && (e.reason.message || e.reason)))) {
       e.preventDefault();
       recover();
     }
   });
})();
`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: EARLY_RECOVERY }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    // Safari присылает SIGNED_IN при каждом возврате во вкладку — реагируем только на смену аккаунта,
    // иначе проверка доступа перезапускается и рабочее место сбрасывается.
    let lastId: string | null | undefined;
    supabase.auth.getSession().then(({ data }) => { if (lastId === undefined) lastId = data.session?.user.id ?? null; });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      const id = session?.user.id ?? null;
      if (id === lastId && event !== "USER_UPDATED") return;
      if (event === "USER_UPDATED" && id === lastId) return;
      lastId = id;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <StoreProvider>
        <Outlet />
      </StoreProvider>
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
