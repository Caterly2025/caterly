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

  // Build nav links based on role
  const navLinks =
    role === "owner"
      ? [
          { href: "/owner", label: "Owner Orders" },
          { href: "/owner/employees", label: "Employees" },
          { href: "/customer", label: "Customer View" },
        ]
      : role === "customer"
      ? [
          { href: "/customer", label: "Browse Menu" },
          { href: "/customer/orders", label: "My Orders" },
          { href: "/customer/invoices", label: "My Invoices" },
        ]
      : role === "admin"
      ? [{ href: "/admin", label: "Admin Dashboard" }]
      : [
          { href: "/customer", label: "Customer" },
          { href: "/owner", label: "Owner" },
        ];

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

          {/* Middle: Role-based links */}
          <nav className="nav-links">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="nav-link">
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right: role + theme toggle */}
          <div className="nav-right">
            <div className="role-pill">
              <span className="role-dot" />
              <span className="role-text">
                {authLoading ? "Checking..." : roleLabel}
              </span>
            </div>

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
      </header>

      {/* Main content */}
      <main>{children}</main>
    </>
  );
}

export default AppShell;
