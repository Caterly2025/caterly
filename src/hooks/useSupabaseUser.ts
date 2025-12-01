"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

export function useSupabaseUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    const loadUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (ignore) return;

        if (error) {
          // Supabase returns AuthSessionMissingError when there's no logged-in session.
          const isSessionMissing =
            (error as any).name === "AuthSessionMissingError" ||
            error.message?.toLowerCase().includes("auth session missing");

          if (isSessionMissing) {
            // This is the "no user yet" case – not really an error for us.
            setUser(null);
          } else {
            console.error("Supabase getUser error:", error);
          }
        } else {
          setUser(data?.user ?? null);
        }

        setLoading(false);
      } catch (err) {
        if (!ignore) {
          console.error("Unexpected getUser error:", err);
          setLoading(false);
        }
      }
    };

    void loadUser();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!ignore) {
          setUser(session?.user ?? null);
        }
      }
    );

    return () => {
      ignore = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
