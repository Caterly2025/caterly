"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { supabase } from "@/lib/supabaseClient";

type ThemeMode = "system" | "light" | "dark";
type UserRole = "customer" | "owner" | "admin" | "employee" | null;

const THEME_STORAGE_KEY = "caterly-theme";

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;

  if (mode === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", mode);
  }
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useSupabaseUser();
  const [role, setRole] = useState<UserRole>(null);

  const [theme, setTheme] = useState<ThemeMode>("system");

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Load theme from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    const initial: ThemeMode = stored ?? "system";
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const handleThemeChange = (mode: ThemeMode) => {
    setTheme(mode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    }
    applyTheme(mode);
  };

  // Load user role from user_profiles
  useEffect(() => {
    if (!user) {
      setRole(null);
      return;
    }

    const loadProfile = async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading user profile role:", error);
        setRole(null);
        return;
      }

      setRole((data?.role as UserRole) ?? null);
    };

    void loadProfile();
  }, [user]);

  const roleLabel =
    role === "owner"
      ? "Owner"
      : role === "customer"
      ? "Customer"
      : role === "admin"
      ? "Admin"
      : role === "employee"
      ? "Employee"
      : "Guest";

  return (
    <>
      {/* Top navigation bar */}
      <header className="top-nav">
        <div className="top-nav-inner">
          {/* Left: Brand */}
          <div className="nav-left">
            <Link href="/" className="brand">
              <span className="brand-mark">C</span>
              <span className="brand-text">Caterly</span>
            </Link>
          </div>

          {/* Middle: top-level navigation */}
          <nav className="nav-links">
            <Link href="/customer" className="nav-link">
              Customer
            </Link>
            <Link href="/owner" className="nav-link">
              Owner
            </Link>
            <Link href="/admin" className="nav-link">
              Admin
            </Link>
          </nav>

          {/* Right: profile + auth + theme toggle */}
          <div className="nav-right">
            <div className="profile-chip">
              <span className="profile-label">User</span>
              <span className="profile-value">
                {authLoading ? "Checking..." : user?.email ?? "Guest"}
              </span>
              <span className="profile-role">{roleLabel}</span>
            </div>

            {user ? (
              <button type="button" className="btn btn-secondary" onClick={handleLogout}>
                Logout
              </button>
            ) : (
              <Link href="/auth" className="btn btn-primary">
                Login / Signup
              </Link>
            )}

            <div className="theme-toggle">
              <button
                type="button"
                onClick={() => handleThemeChange("light")}
                className={`theme-toggle-btn ${
                  theme === "light" ? "theme-toggle-btn-active" : ""
                }`}
                aria-label="Light theme"
              >
                ☀
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange("system")}
                className={`theme-toggle-btn ${
                  theme === "system" ? "theme-toggle-btn-active" : ""
                }`}
                aria-label="System theme"
              >
                🖥️
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange("dark")}
                className={`theme-toggle-btn ${
                  theme === "dark" ? "theme-toggle-btn-active" : ""
                }`}
                aria-label="Dark theme"
              >
                🌙
              </button>
            </div>
          </div>
        </div>

        <div className="sub-nav">
          <div className="sub-nav-group">
            <span className="sub-nav-title">Customer</span>
            <Link href="/customer/orders" className="sub-nav-link">
              My Orders
            </Link>
            <Link href="/customer/invoices" className="sub-nav-link">
              Invoices
            </Link>
          </div>

          <div className="sub-nav-group">
            <span className="sub-nav-title">Owner</span>
            <Link href="/admin" className="sub-nav-link">
              Admin
            </Link>
            <Link href="/owner/onboarding" className="sub-nav-link">
              Onboarding
            </Link>
            <Link href="/owner/employee" className="sub-nav-link">
              Employees
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main>{children}</main>
    </>
  );
}

export default AppShell;
