"use client";

import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { supabase } from "@/lib/supabaseClient";

export function AppHeader() {
  const { user, loading } = useSupabaseUser();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header
      style={{
        padding: "1rem 2rem",
        backgroundColor: "#111827",
        color: "white",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: "1.2rem" }}>Caterly</div>
      <nav style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <a href="/" style={{ color: "white", textDecoration: "none" }}>
          Home
        </a>
        <a href="/customer" style={{ color: "white", textDecoration: "none" }}>
          Customer
        </a>|
        <a href="/customer/orders" style={{ color: "white", textDecoration: "none" }}>
  My Orders
</a>

        <a href="/owner" style={{ color: "white", textDecoration: "none" }}>
          Owner
        </a>
        <a href="/admin" style={{ color: "white", textDecoration: "none" }}>
          Admin
        </a>

        <span style={{ marginLeft: "1rem" }}>|</span>

        {loading ? (
          <span style={{ fontSize: "0.9rem" }}>Checking auth…</span>
        ) : user ? (
          <>
            <span style={{ fontSize: "0.9rem" }}>
              {user.email ?? user.id.slice(0, 8)}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              style={{ marginLeft: "0.5rem" }}
            >
              Logout
            </button>
          </>
        ) : (
          <a
            href="/auth"
            style={{
              color: "white",
              textDecoration: "none",
              fontSize: "0.9rem",
            }}
          >
            Login / Signup
          </a>
        )}
      </nav>
    </header>
  );
}
