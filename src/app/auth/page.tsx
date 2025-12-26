"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) {
          setMessage(error.message);
        } else {
          setMessage(
            "Sign-up successful. If email confirmations are enabled, check your email, then sign in."
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setMessage(error.message);
        } else {
          setMessage("Signed in successfully.");
        }
      }
    } catch (err) {
      console.error(err);
      setMessage("Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setMessage(null);
    setOauthLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      setMessage(error.message);
      setOauthLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "0 auto" }}>
      <h1>{mode === "signin" ? "Sign In" : "Sign Up"}</h1>

      {message && (
        <div
          style={{
            background: "#fee2e2",
            border: "1px solid #fecaca",
            padding: "0.5rem 1rem",
            marginBottom: "1rem",
            borderRadius: 4,
          }}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 8 }}>
          <label>
            Email:
            <input
              type="email"
              style={{ width: "100%" }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>
            Password:
            <input
              type="password"
              style={{ width: "100%" }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
        </div>
        <button type="submit" disabled={loading}>
          {loading
            ? "Working..."
            : mode === "signin"
            ? "Sign In"
            : "Create Account"}
        </button>
      </form>

      <div style={{ margin: "16px 0" }}>
        <button type="button" onClick={handleGoogleAuth} disabled={oauthLoading}>
          {oauthLoading ? "Redirecting..." : "Continue with Google"}
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        {mode === "signin" ? (
          <button type="button" onClick={() => setMode("signup")}>
            Need an account? Sign up
          </button>
        ) : (
          <button type="button" onClick={() => setMode("signin")}>
            Already have an account? Sign in
          </button>
        )}
      </div>
    </div>
  );
}
