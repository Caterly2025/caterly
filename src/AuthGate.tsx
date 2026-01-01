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
    const hasOAuthHash =
      typeof window !== "undefined" &&
      window.location.hash &&
      window.location.hash.includes("access_token");

    async function initializeSession() {
      // Handle the OAuth callback hash and persist the session
      if (hasOAuthHash) {
        const { data, error } = await supabase.auth.getSessionFromUrl({
          storeSession: true,
        });

        if (error) {
          console.error("getSessionFromUrl error:", error.message);
        } else {
          setUserEmail(data.session?.user?.email ?? null);
        }

        window.history.replaceState(null, "", window.location.pathname);
      }

      // Fetch current user (covers both fresh sessions and existing ones)
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("getUser error:", error.message);
      }
      setUserEmail(data.user?.email ?? null);
      setLoading(false);
    }

    initializeSession();

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
