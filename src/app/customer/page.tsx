"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { MapRestaurant } from "@/components/RestaurantMap";

const RestaurantMap = dynamic(() => import("@/components/RestaurantMap"), {
  ssr: false,
});

type RestaurantRow = MapRestaurant & { heroImage?: string };

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

const fallbackImages = [
  "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80",
];

const fallbackRestaurants: RestaurantRow[] = [
  {
    id: "fallback-1",
    name: "Bella's Bistro",
    description: "217 Post Street Suite F, New Yor, BA",
    address: "217 Post Street Suite F",
    city: "New Yor",
    state: "BA",
    zip_code: "",
    primary_phone: "(415) 632-5095",
    latitude: 37.7749,
    longitude: -122.4194,
    heroImage: fallbackImages[0],
  },
  {
    id: "fallback-2",
    name: "Taco Fiesta",
    description: "3477 New York Suite F, Sacramento",
    address: "3477 New York Suite F",
    city: "Sacramento",
    state: "CA",
    zip_code: "",
    primary_phone: "",
    latitude: 37.7849,
    longitude: -122.4294,
    heroImage: fallbackImages[1],
  },
  {
    id: "fallback-3",
    name: "Golden Plate Catering",
    description: "3477 New York Suite F, Sacramento",
    address: "3477 New York Suite F",
    city: "Sacramento",
    state: "CA",
    zip_code: "",
    primary_phone: "",
    latitude: 37.7949,
    longitude: -122.4094,
    heroImage: fallbackImages[2],
  },
];

const sampleOrderItems = [
  { name: "6x Chicken Tacos", note: "no red onions", price: 34 },
  { name: "2 Beef Enchiladas", note: null, price: 30 },
];

const pastOrders = [
  {
    id: "order-1",
    title: "Bella's Bistro",
    date: "April 12, 2024",
    total: 60,
    status: "Completed" as const,
  },
  {
    id: "order-2",
    title: "Taco Fiesta",
    date: "April 1, 2024",
    total: 95,
    status: "Completed" as const,
  },
];

const invoiceList = [
  { id: "INV-20240110", status: "Unpaid" },
  { id: "INV-20240115", status: "Unpaid" },
  { id: "INV-20240135", status: "Paid" },
  { id: "INV-20240135B", status: "Paid" },
];

export default function CustomerHomePage() {
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);

  const [selectedRestaurant, setSelectedRestaurant] =
    useState<RestaurantRow | null>(null);

  const [menus, setMenus] = useState<MenuRow[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemRow[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [searchZip, setSearchZip] = useState("");

  const loadRestaurants = async () => {
    setLoadingRestaurants(true);
    setMessage(null);

    const { data, error } = await supabase
      .from("restaurants")
      .select(
        "id,name,description,address,city,state,zip_code,primary_phone,latitude,longitude"
      )
      .order("name", { ascending: true });

    if (error) {
      console.error("Error loading restaurants:", error);
      setMessage("Error loading restaurants. Showing featured examples instead.");
      setRestaurants(fallbackRestaurants);
      setLoadingRestaurants(false);
      return;
    }

    const decorated = (data || []).map((r, idx) => ({
      ...(r as RestaurantRow),
      heroImage: fallbackImages[idx % fallbackImages.length],
    }));

    setRestaurants(decorated);
    setLoadingRestaurants(false);
  };

  const loadMenuForRestaurant = async (restaurantId: string) => {
    setLoadingMenu(true);
    setMessage(null);

    const { data: menuData, error: menuErr } = await supabase
      .from("menus")
      .select("id,name,restaurant_id")
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
      .select("id,name,description,price,menu_id")
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

  const preparedRestaurants: RestaurantRow[] = useMemo(() => {
    const list = restaurants.length > 0 ? restaurants : fallbackRestaurants;
    return list.map((r, idx) => ({
      ...r,
      heroImage: r.heroImage ?? fallbackImages[idx % fallbackImages.length],
    }));
  }, [restaurants]);

  const spotlight = preparedRestaurants.slice(0, 3);

  const currentRestaurant = selectedRestaurant ?? spotlight[0] ?? null;

  return (
    <div className="page customer-page">
      <div className="customer-hero">
        <div>
          <p className="eyebrow">Delivery dashboard</p>
          <h1>Food Delivery Map</h1>
          <p className="muted">
            Track your orders, browse catering partners, and explore menus near you.
          </p>
        </div>
        <div className="hero-search">
          <label htmlFor="zip-search">Enter your address or ZIP code</label>
          <div className="search-row">
            <input
              id="zip-search"
              className="input"
              placeholder="Zip Code"
              value={searchZip}
              onChange={(e) => setSearchZip(e.target.value)}
            />
            <button className="btn btn-primary">Search</button>
          </div>
          {message ? <div className="muted" style={{ marginTop: 6 }}>{message}</div> : null}
        </div>
      </div>

      <div className="map-grid">
        <div className="map-panel card">
          <div className="map-panel-header">
            <div>
              <div className="panel-title">Restaurants & Delivery Map</div>
              <div className="muted small">
                Click a pin or card to view menu details for that restaurant.
              </div>
            </div>
            <div className="pill-row">
              <span className="pill">Unpaid: 3</span>
              <span className="pill pill-success">Completed: 15</span>
            </div>
          </div>

          <div className="map-wrapper">
            <div className="map-overlay">
              {loadingRestaurants ? (
                <div className="muted">Loading restaurants...</div>
              ) : (
                spotlight.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`restaurant-card ${
                      selectedRestaurant?.id === r.id ? "restaurant-card-active" : ""
                    }`}
                    onClick={() => {
                      setSelectedRestaurant(r);
                      void loadMenuForRestaurant(r.id);
                    }}
                  >
                    <div className="card-thumb">
                      <Image
                        src={r.heroImage || fallbackImages[0]}
                        alt={r.name}
                        fill
                        sizes="120px"
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                    <div className="card-body">
                      <div className="card-title-row">
                        <div className="card-title">{r.name}</div>
                        <span className="star">★</span>
                      </div>
                      <div className="card-meta">{r.description}</div>
                      <div className="card-meta">
                        {[r.address, r.city, r.state].filter(Boolean).join(", ")}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="map-canvas">
              <RestaurantMap
                restaurants={preparedRestaurants}
                onSelect={(r) => {
                  setSelectedRestaurant(r);
                  void loadMenuForRestaurant(r.id);
                }}
                height={520}
              />
            </div>
          </div>
        </div>

        <div className="sidebar column-gap">
          <div className="card order-card">
            <div className="panel-title">Current Order</div>
            <div className="order-restaurant">
              <div>
                <div className="order-title">Taco Fiesta</div>
                <div className="muted small">April 15, 2024 • Delivery</div>
              </div>
              <span className="badge badge-paid">Paid</span>
            </div>

            <div className="progress-row">
              <div className="progress">
                <div className="progress-fill" style={{ width: "70%" }} />
              </div>
              <div className="small muted">70%</div>
            </div>

            <div className="stepper">
              <div className="step step-complete">Preparing</div>
              <div className="step step-current">Packaging</div>
              <div className="step">Driver picked up</div>
              <div className="step">Driver en route</div>
            </div>

            <div className="line-item-grid">
              {sampleOrderItems.map((item) => (
                <div key={item.name} className="line-item">
                  <div>
                    <div className="line-item-name">{item.name}</div>
                    {item.note ? <div className="muted tiny">{item.note}</div> : null}
                  </div>
                  <div className="line-item-price">${item.price.toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div className="line-item-footer">
              <span>Total:</span>
              <strong>$130.00</strong>
            </div>
          </div>

          <div className="card past-orders">
            <div className="panel-title">Past Orders</div>
            <div className="past-order-list">
              {pastOrders.map((order) => (
                <div key={order.id} className="past-order">
                  <div>
                    <div className="order-title">{order.title}</div>
                    <div className="muted small">{order.date}</div>
                    <div className="muted small">Total: ${order.total.toFixed(2)}</div>
                  </div>
                  <span className="badge badge-completed">{order.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card invoices">
            <div className="panel-title">Invoices</div>
            <div className="invoice-list">
              {invoiceList.map((invoice) => (
                <div key={invoice.id} className="invoice-row">
                  <div>
                    <div className="invoice-id">{invoice.id}</div>
                    <div className="muted tiny">Invoices pending payment</div>
                  </div>
                  <span
                    className={`badge ${
                      invoice.status === "Paid" ? "badge-paid" : "badge-unpaid"
                    }`}
                  >
                    {invoice.status}
                  </span>
                </div>
              ))}
            </div>
            <button className="btn btn-link">View all invoices »</button>
          </div>
        </div>
      </div>

      <div className="card menu-section">
        <div className="menu-header">
          <div>
            <div className="panel-title">Available Menus</div>
            <div className="muted small">
              {currentRestaurant ? (
                <>Showing menus for <strong>{currentRestaurant.name}</strong></>
              ) : (
                <>Select a restaurant to view menus</>
              )}
            </div>
          </div>
          <div className="pill-row">
            <span className="pill">Delivery</span>
            <span className="pill">My address</span>
          </div>
        </div>

        <div style={{ marginTop: "1rem" }}>
          {!currentRestaurant ? (
            <div className="empty-block">
              <div className="empty-icon">📍</div>
              Select a restaurant to view menus & items.
            </div>
          ) : loadingMenu ? (
            <div className="muted">Loading menus...</div>
          ) : menus.length === 0 ? (
            <div className="muted">No menus found for this restaurant.</div>
          ) : (
            <div className="menu-grid">
              {menus.map((m) => (
                <div key={m.id} className="menu-card">
                  <div className="menu-card-header">
                    <div className="menu-title">{m.name}</div>
                    <div className="muted tiny">{itemsByMenu.get(m.id)?.length ?? 0} items</div>
                  </div>
                  <div className="menu-items">
                    {(itemsByMenu.get(m.id) || []).map((it) => (
                      <div key={it.id} className="menu-item-row">
                        <div>
                          <div className="menu-item-name">{it.name}</div>
                          {it.description ? (
                            <div className="muted tiny">{it.description}</div>
                          ) : null}
                        </div>
                        <div className="menu-item-price">${Number(it.price ?? 0).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="muted tiny" style={{ marginTop: 8 }}>
                    Next: we’ll add cart + edit/submit order flow here.
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
