"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

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

  const activeView: "customer" | "owner" = useMemo(() => {
    if (pathname.startsWith("/owner")) return "owner";
    return "customer";
  }, [pathname]);

  const customerNav = [
    { href: "/customer/orders", label: "Orders" },
    { href: "/customer/invoices", label: "Invoices" },
    { href: "/customer", label: "Start new order" },
  ];

  const ownerNav = [
    { href: "/owner", label: "Manage restaurants" },
    { href: "/owner/menus", label: "Manage menus" },
    { href: "/owner/employee", label: "Manage employees" },
  ];

  const activeNavLinks = activeView === "owner" ? ownerNav : customerNav;

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
      <header className="top-nav">
        <div className="top-nav-inner">
          <div className="nav-left">
            <Link href="/" className="brand">
              <span className="brand-mark">C</span>
              <span className="brand-text">Caterly</span>
            </Link>
            <div className="view-switch">
              <Link
                href="/customer"
                className={`view-pill ${activeView === "customer" ? "view-pill-active" : ""}`}
              >
                Customer
              </Link>
              <Link
                href="/owner"
                className={`view-pill ${activeView === "owner" ? "view-pill-active" : ""}`}
              >
                Owner
              </Link>
            </div>
          </div>

          <div className="nav-right">
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

            <div className="profile-chip">
              <span className="profile-label">Profile</span>
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
          </div>
        </div>

        <div className="sub-nav">
          {activeNavLinks.map((link) => (
            <Link key={link.href} href={link.href} className="sub-nav-link">
              {link.label}
            </Link>
          ))}
        </div>
      </header>

      {/* Main content */}
      <main>{children}</main>
    </>
  );
}

export default AppShell;
