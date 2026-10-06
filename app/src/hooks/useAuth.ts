import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"specialist" | "client" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let lastId: string | null | undefined;
    const load = async (u: User | null) => {
      const id = u?.id ?? null;
      if (id === lastId) return; // тот же пользователь (обновление сессии) — ничего не сбрасываем
      lastId = id;
      setUser(u);
      if (u) {
        const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.id);
        setRole(data?.some((r) => r.role === "specialist") ? "specialist" : data?.length ? "client" : null);
      } else setRole(null);
      setLoading(false);
    };
    supabase.auth.getSession().then(({ data }) => load(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => void load(s?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  return { user, role, loading };
}
