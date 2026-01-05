"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

  const toggleLightDark = () => {
    const nextMode = theme === "dark" ? "light" : "dark";
    handleThemeChange(nextMode);
  };

  const isActive = (href: string) => pathname?.startsWith(href);

  const mainLinks = [
    { href: "/customer", label: "Customer" },
    { href: "/owner", label: "Owner" },
    { href: "/admin", label: "Admin" },
  ];

  const customerNav = [
    { href: "/customer", label: "Discover" },
    { href: "/customer/orders", label: "My Orders" },
    { href: "/customer/invoices", label: "Invoices" },
  ];

  const ownerNav = [
    { href: "/owner", label: "Manage" },
    { href: "/owner/orders", label: "Orders" },
    { href: "/owner/invoices", label: "Invoices" },
    { href: "/owner/employee", label: "Staff" },
  ];

  const adminNav = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/reports", label: "Reports" },
  ];

  const activeSubNav = pathname?.startsWith("/owner")
    ? ownerNav
    : pathname?.startsWith("/admin")
    ? adminNav
    : customerNav;

  return (
    <>
      {/* Top navigation bar */}
      <header className="top-nav">
        <div className="top-nav-rows">
          <div className="top-nav-inner">
            {/* Left: Brand */}
            <div className="nav-left">
              <Link href="/" className="brand">
                <span className="brand-mark">C</span>
                <div className="brand-text-block">
                  <span className="brand-text">Caterly</span>
                  <span className="brand-sub">Green CraveCart</span>
                </div>
              </Link>
            </div>

            {/* Middle: top-level navigation */}
            <nav className="nav-links">
              {mainLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link ${isActive(link.href) ? "nav-link-active" : ""}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right: profile + auth + theme toggle */}
            <div className="nav-right">
              <div className="nav-actions">
                <Link className="pill-button" href="#">
                  Live Updates
                </Link>
                <Link className="ghost-button" href="#">
                  Help
                </Link>
              </div>

              <div className="profile-chip">
                <span className="profile-label">User</span>
                <span className="profile-value">
                  {authLoading ? "Checking..." : user?.email ?? "Guest"}
                </span>
                <span className="profile-role">{roleLabel}</span>
              </div>

              <div className="theme-toggle">
                <button
                  type="button"
                  onClick={toggleLightDark}
                  className={`theme-switch ${theme === "dark" ? "theme-switch-on" : ""}`}
                  aria-label="Toggle dark mode"
                  aria-pressed={theme === "dark"}
                >
                  <span className="switch-track">
                    <span className="switch-thumb" />
                  </span>
                  <span className="switch-label">{theme === "dark" ? "On" : "Off"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleThemeChange("system")}
                  className={`theme-toggle-btn ${
                    theme === "system" ? "theme-toggle-btn-active" : ""
                  }`}
                  aria-label="System theme"
                >
                  System
                </button>
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
            {activeSubNav.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`sub-nav-link ${isActive(link.href) ? "sub-nav-link-active" : ""}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="page-shell">{children}</main>
    </>
  );
}

export default AppShell;
