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

    router.push("/owner/onboarding");
  };

  return (
    <div className="page">
      <div className="page-narrow">
        <div className="card">
          <h1 className="page-title">Restaurant Owner Access</h1>
          <p className="page-subtitle">
            Create an owner account to manage your restaurant, employees, and orders.
          </p>

          {message && (
            <div className="alert alert-error">
              {message}
            </div>
          )}

          <div className="form-section">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
            />

            <label className="form-label">Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
              placeholder="+1 555-123-4567"
            />

            <label className="form-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />

            <label className="form-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </div>

          <div className="button-row">
            <button
              onClick={handleSignup}
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Creating..." : "Sign Up as Owner"}
            </button>

            <button
              onClick={handleLogin}
              className="btn btn-secondary"
              disabled={loading}
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
