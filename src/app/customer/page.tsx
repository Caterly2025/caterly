"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";

type RestaurantRow = {
  id: string;
  name: string;
  cuisine_type: string | null;
  address: string | null;
  zip_code: string | null;
  primary_phone: string | null;
};

type MenuRow = {
  id: string;
  name: string;
  restaurant_id: string;
};

type MenuItemRow = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  menu_id: string;
};

export default function CustomerHomePage() {
  const { user, loading: authLoading } = useSupabaseUser();

  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);

  const [view, setView] = useState<"list" | "map">("map");

  const [selectedRestaurant, setSelectedRestaurant] =
    useState<RestaurantRow | null>(null);

  const [menus, setMenus] = useState<MenuRow[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemRow[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);

  const [message, setMessage] = useState<string | null>(null);

  const loadRestaurants = async () => {
    setLoadingRestaurants(true);
    setMessage(null);

    const { data, error } = await supabase
      .from("restaurants")
      .select("id, name, cuisine_type, address, zip_code, primary_phone")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error loading restaurants:", error);
      setMessage("Error loading restaurants.");
      setRestaurants([]);
      setLoadingRestaurants(false);
      return;
    }

    setRestaurants((data || []) as RestaurantRow[]);
    setLoadingRestaurants(false);
  };

  const loadMenuForRestaurant = async (restaurantId: string) => {
    setLoadingMenu(true);
    setMessage(null);

    const { data: menuData, error: menuErr } = await supabase
      .from("menus")
      .select("id, name, restaurant_id")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: true });

    if (menuErr) {
      console.error("Error loading menus:", menuErr);
      setMenus([]);
      setMenuItems([]);
      setLoadingMenu(false);
      setMessage("Error loading menus.");
      return;
    }

    const m = (menuData || []) as MenuRow[];
    setMenus(m);

    if (m.length === 0) {
      setMenuItems([]);
      setLoadingMenu(false);
      return;
    }

    const menuIds = m.map((x) => x.id);

    const { data: itemsData, error: itemsErr } = await supabase
      .from("menu_items")
      .select("id, name, description, price, menu_id")
      .in("menu_id", menuIds)
      .order("name", { ascending: true });

    if (itemsErr) {
      console.error("Error loading menu items:", itemsErr);
      setMenuItems([]);
      setLoadingMenu(false);
      setMessage("Error loading menu items.");
      return;
    }

    setMenuItems((itemsData || []) as MenuItemRow[]);
    setLoadingMenu(false);
  };

  useEffect(() => {
    void loadRestaurants();
  }, []);

  const itemsByMenu = useMemo(() => {
    const map = new Map<string, MenuItemRow[]>();
    for (const item of menuItems) {
      const list = map.get(item.menu_id) || [];
      list.push(item);
      map.set(item.menu_id, list);
    }
    return map;
  }, [menuItems]);

  return (
    <>
      {/* Hero header like your screenshot */}
      <div className="hero">
        <div className="hero-inner">
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <h1 className="hero-title">Home</h1>
              <div className="hero-subtitle">
                Order premium catering from local restaurants
              </div>
            </div>

            <div className="hero-actions">
              <Link className="btn btn-secondary" href="/customer/orders">
                My Orders
              </Link>
              <Link className="btn btn-secondary" href="/auth/owner">
                Restaurant Login
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="page">
        <div className="container">
          {message && <div className="alert alert-error">{message}</div>}

          <div className="card" style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "1.1rem" }}>📍</span>
              <div style={{ fontSize: "1.2rem", fontWeight: 900 }}>
                Select Your Area
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              <button
                type="button"
                className={`chip ${view === "list" ? "chip-active" : ""}`}
                onClick={() => setView("list")}
              >
                List View
              </button>
              <button
                type="button"
                className={`chip ${view === "map" ? "chip-active" : ""}`}
                onClick={() => setView("map")}
              >
                Map View
              </button>
            </div>

            {/* Map placeholder (we’ll wire Leaflet next once we store lat/lng or geocode by zip) */}
            {view === "map" ? (
              <div
                style={{
                  width: "100%",
                  height: 420,
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  overflow: "hidden",
                  background: "linear-gradient(180deg, rgba(2,132,199,0.10), rgba(2,132,199,0.02))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "1rem",
                }}
              >
                <div style={{ textAlign: "center", maxWidth: 560 }}>
                  <div style={{ fontSize: "1.25rem", fontWeight: 900, marginBottom: 6 }}>
                    Map View (next)
                  </div>
                  <div style={{ color: "var(--muted)" }}>
                    You said you like selecting restaurants from a map — we’ll add Leaflet pins
                    once restaurants have <strong>lat/lng</strong> (or we geocode from zip).
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <button className="btn btn-secondary" onClick={() => setView("list")}>
                      Use List View for now
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {loadingRestaurants ? (
                  <div>Loading restaurants...</div>
                ) : restaurants.length === 0 ? (
                  <div style={{ color: "var(--muted)" }}>
                    No restaurants available yet.
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
                    {restaurants.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className="card"
                        style={{
                          textAlign: "left",
                          cursor: "pointer",
                          border:
                            selectedRestaurant?.id === r.id
                              ? "1px solid rgba(11,127,102,0.45)"
                              : "1px solid var(--border)",
                        }}
                        onClick={() => {
                          setSelectedRestaurant(r);
                          void loadMenuForRestaurant(r.id);
                        }}
                      >
                        <div style={{ fontWeight: 900, fontSize: "1.05rem", marginBottom: 6 }}>
                          {r.name}
                        </div>
                        <div style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
                          {r.cuisine_type ? <div>{r.cuisine_type}</div> : null}
                          {r.address || r.zip_code ? (
                            <div>
                              {r.address ? r.address : ""}
                              {r.zip_code ? ` ${r.zip_code}` : ""}
                            </div>
                          ) : null}
                          {r.primary_phone ? <div>📞 {r.primary_phone}</div> : null}
                        </div>

                        <div style={{ marginTop: 12 }}>
                          <span className="btn btn-primary" style={{ width: "auto" }}>
                            Select
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected restaurant menus */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
              <div>
                <div style={{ fontSize: "1.1rem", fontWeight: 900 }}>Available Menus</div>
                <div style={{ color: "var(--muted)", fontSize: "0.95rem" }}>
                  {selectedRestaurant ? (
                    <>Showing menus for <strong>{selectedRestaurant.name}</strong></>
                  ) : (
                    <>Select an area/restaurant to view available menus</>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button className="btn btn-secondary" onClick={loadRestaurants}>
                  Refresh
                </button>
              </div>
            </div>

            <div style={{ marginTop: "1rem" }}>
              {!selectedRestaurant ? (
                <div style={{ color: "var(--muted)", padding: "1rem", textAlign: "center" }}>
                  <div style={{ fontSize: "2rem" }}>📍</div>
                  Select a restaurant to view menus & items.
                </div>
              ) : loadingMenu ? (
                <div>Loading menus...</div>
              ) : menus.length === 0 ? (
                <div style={{ color: "var(--muted)" }}>
                  No menus found for this restaurant.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {menus.map((m) => (
                    <div key={m.id} className="card" style={{ boxShadow: "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 900 }}>{m.name}</div>
                        <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                          {itemsByMenu.get(m.id)?.length ?? 0} items
                        </div>
                      </div>

                      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0.75rem" }}>
                        {(itemsByMenu.get(m.id) || []).map((it) => (
                          <div
                            key={it.id}
                            style={{
                              border: "1px solid var(--border)",
                              borderRadius: 12,
                              padding: "0.75rem",
                              background: "var(--surface-2)",
                            }}
                          >
                            <div style={{ fontWeight: 900 }}>{it.name}</div>
                            {it.description ? (
                              <div style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: 4 }}>
                                {it.description}
                              </div>
                            ) : null}
                            <div style={{ marginTop: 8, fontWeight: 900, color: "var(--primary)" }}>
                              ${Number(it.price ?? 0).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Next step: "Add to order" UX goes here (cart) */}
                      <div style={{ marginTop: 12, color: "var(--muted)", fontSize: "0.9rem" }}>
                        Next: we’ll add cart + edit/submit order flow here.
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
