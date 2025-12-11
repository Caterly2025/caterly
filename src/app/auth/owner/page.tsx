"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function OwnerAuthPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSignup = async () => {
    setMessage(null);

    if (!email || !password || !fullName || !phone) {
      setMessage("All fields are required for owner signup.");
      return;
    }

    setLoading(true);

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setLoading(false);
      setMessage(signUpError.message);
      return;
    }

    const user = authData.user;
    if (!user) {
      setLoading(false);
      setMessage("Sign-up incomplete. Check your email.");
      return;
    }

    // Create user profile
    const { error: profileError } = await supabase.from("user_profiles").insert({
      id: user.id,
      role: "owner",
      full_name: fullName,
      phone_number: phone,
    });

    if (profileError) {
      setMessage("Error creating user profile: " + profileError.message);
      setLoading(false);
      return;
    }

    router.push("/owner/onboarding");
    setLoading(false);
  };

  const handleLogin = async () => {
    setMessage(null);
    if (!email || !password) {
      setMessage("Email and password required.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setMessage(error.message);
      return;
    }

    router.push("/owner/onboarding"); // if they already have restaurant, onboarding will redirect them
  };

  return (
    <div style={{ maxWidth: 500, margin: "0 auto" }}>
      <h1>Owner Sign Up / Login</h1>

      {message && (
        <div style={{ background: "#fee2e2", padding: 10, borderRadius: 4 }}>
          {message}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <label>Full Name</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="input"
        />

        <label>Phone Number</label>
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="input"
          placeholder="+1 555-123-4567"
        />

        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
        <button onClick={handleSignup} className="btn-primary" disabled={loading}>
          {loading ? "Creating..." : "Sign Up as Owner"}
        </button>

        <button onClick={handleLogin} className="btn-secondary" disabled={loading}>
          Login
        </button>
      </div>
    </div>
  );
}
