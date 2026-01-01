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
    async function init() {
      // Handle PKCE-based OAuth callback that returns a `code` query param.
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const errorDescription = url.searchParams.get("error_description");

      if (errorDescription) {
        console.error("OAuth error:", errorDescription);
      }

      if (code) {
        setLoading(true);
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("exchangeCodeForSession error:", error.message);
        } else {
          setUserEmail(data.session?.user?.email ?? null);
          // Clean up the URL so the auth code isn't exposed or reused.
          window.history.replaceState(null, "", url.origin + url.pathname);
        }
      }

      // Fetch current user after handling any OAuth callback.
      supabase.auth.getUser().then(({ data, error }) => {
        if (error) console.error("getUser error:", error.message);
        setUserEmail(data.user?.email ?? null);
        setLoading(false);
      });
    }

    init();

    // Keep UI in sync with auth state changes.
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
