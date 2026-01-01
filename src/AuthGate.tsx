import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthGate() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      // Option A: no redirectTo needed. Supabase will come back to the same origin.
    });
    if (error) console.error("Google sign-in error:", error.message);
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Sign out error:", error.message);
  }

  useEffect(() => {
    // 1) Supabase will parse #access_token on page load and store session automatically.
    // 2) Fetch current user
    supabase.auth.getUser().then(({ data, error }) => {
      if (error) console.error("getUser error:", error.message);
      setUserEmail(data.user?.email ?? null);
      setLoading(false);
    });

    // 3) Keep UI in sync
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);

      // Optional: clean up the URL hash after login
      if (window.location.hash && window.location.hash.includes("access_token")) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  // Also clean hash even before auth state event fires (more reliable)
  useEffect(() => {
    if (window.location.hash && window.location.hash.includes("access_token")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  if (loading) return <div>Loading...</div>;

  if (!userEmail) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Sign in</h2>
        <button onClick={signInWithGoogle}>Continue with Google</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div>Signed in as: {userEmail}</div>
      <button onClick={signOut} style={{ marginTop: 12 }}>
        Sign out
      </button>
    </div>
  );
}
