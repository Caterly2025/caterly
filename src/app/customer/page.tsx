"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";

type Restaurant = {
  id: string;
  name: string;
  description: string | null;
};

type Menu = {
  id: string;
  name: string;
};

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
};

type CartItem = {
  item: MenuItem;
  quantity: number;
};

export default function CustomerPage() {
  const { user, loading: authLoading } = useSupabaseUser();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  const [menus, setMenus] = useState<Menu[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);

  const [items, setItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [specialRequest, setSpecialRequest] = useState("");

  // 1. Load all restaurants, but only after auth is ready and user exists
  useEffect(() => {
    const loadRestaurants = async () => {
      if (authLoading || !user) {
        return;
      }

      setLoadingRestaurants(true);
      setMessage(null);

      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, description")
        .order("name");

      if (error) {
        console.error(error);
        setMessage("Error loading restaurants.");
        setLoadingRestaurants(false);
        return;
      }

      const list = (data || []) as Restaurant[];
      setRestaurants(list);

      // Auto-select first restaurant if any
      if (list.length > 0) {
        setSelectedRestaurant(list[0]);
      }

      setLoadingRestaurants(false);
    };

    loadRestaurants();
  }, [authLoading, user]);

  // 2. When restaurant changes, load its menus
  useEffect(() => {
    const loadMenus = async () => {
      if (!selectedRestaurant || !user) {
        setMenus([]);
        setSelectedMenu(null);
        setItems([]);
        return;
      }

      setLoadingMenu(true);
      setMessage(null);

      const { data, error } = await supabase
        .from("menus")
        .select("id, name")
        .eq("restaurant_id", selectedRestaurant.id)
        .order("name");

      if (error) {
        console.error(error);
        setMessage("Error loading menus for restaurant.");
        setLoadingMenu(false);
        return;
      }

      const menuList = (data || []) as Menu[];
      setMenus(menuList);

      // Auto-select first menu if any
      if (menuList.length > 0) {
        setSelectedMenu(menuList[0]);
      } else {
        setSelectedMenu(null);
        setItems([]);
      }

      setLoadingMenu(false);
    };

    loadMenus();
  }, [selectedRestaurant, user]);

  // 3. When menu changes, load menu items
  useEffect(() => {
    const loadItems = async () => {
      if (!selectedMenu || !user) {
        setItems([]);
        return;
      }

      setLoadingItems(true);
      setMessage(null);

      const { data, error } = await supabase
        .from("menu_items")
        .select("id, name, description, price")
        .eq("menu_id", selectedMenu.id)
        .order("name");

      if (error) {
        console.error(error);
        setMessage("Error loading menu items.");
        setLoadingItems(false);
        return;
      }

      setItems((data || []) as MenuItem[]);
      setLoadingItems(false);
    };

    loadItems();
  }, [selectedMenu, user]);

  // --- Cart logic ---
  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const changeQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((c) => c.item.id !== itemId));
      return;
    }
    setCart((prev) =>
      prev.map((c) => (c.item.id === itemId ? { ...c, quantity } : c))
    );
  };

  const total = cart.reduce(
    (sum, c) => sum + c.item.price * c.quantity,
    0
  );

  // --- Place order for currently selected restaurant/menu ---
  const placeOrder = async () => {
    if (!user) {
      setMessage("You must be logged in to place an order.");
      return;
    }
    if (!selectedRestaurant) {
      setMessage("Please select a restaurant first.");
      return;
    }
    if (cart.length === 0) {
      setMessage("Add at least one item to cart first.");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      // 1. Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: user.id, // 👈 real auth user id
          restaurant_id: selectedRestaurant.id,
          status: "pending",
          special_request: specialRequest || null,
          total,
        })
        .select("id")
        .single();

      if (orderError || !order) {
        console.error(orderError);
        setMessage("Error creating order.");
        setSubmitting(false);
        return;
      }

      const orderId = order.id;

      // 2. Create order_items
      const orderItemsPayload = cart.map((c) => ({
        order_id: orderId,
        menu_item_id: c.item.id,
        quantity: c.quantity,
        price: c.item.price,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItemsPayload);

      if (itemsError) {
        console.error(itemsError);
        setMessage("Order created but items failed.");
        setSubmitting(false);
        return;
      }

      setMessage("Order placed successfully!");
      setCart([]);
      setSpecialRequest("");
    } catch (err) {
      console.error(err);
      setMessage("Unexpected error placing order.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Auth gating for this page ---
  if (authLoading) {
    return <div>Checking authentication...</div>;
  }

  if (!user) {
    return (
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1>Customer View – Caterly</h1>
        <p>You must be logged in to browse menus and place orders.</p>
        <p>
          Go to <a href="/auth">Auth</a> to login or sign up.
        </p>
      </div>
    );
  }

  // --- Main UI when logged in ---
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h1>Customer View – Caterly</h1>

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

      {/* Restaurant & Menu selectors */}
      <div
        style={{
          display: "flex",
          gap: "2rem",
          marginBottom: "1.5rem",
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: 1 }}>
          <h3>Choose a restaurant</h3>
          {loadingRestaurants ? (
            <p>Loading restaurants...</p>
          ) : restaurants.length === 0 ? (
            <p>No restaurants found.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {restaurants.map((r) => (
                <li key={r.id} style={{ marginBottom: 6 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRestaurant(r);
                      setCart([]); // reset cart when switching
                      setSelectedMenu(null);
                      setItems([]);
                    }}
                    style={{
                      padding: "0.5rem 0.75rem",
                      borderRadius: 4,
                      border:
                        selectedRestaurant?.id === r.id
                          ? "2px solid #111827"
                          : "1px solid #d1d5db",
                      backgroundColor:
                        selectedRestaurant?.id === r.id ? "#e5e7eb" : "white",
                      width: "100%",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    {r.description && (
                      <div style={{ fontSize: "0.85rem", color: "#4b5563" }}>
                        {r.description}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <h3>Choose a menu</h3>
          {loadingMenu ? (
            <p>Loading menus...</p>
          ) : !selectedRestaurant ? (
            <p>Select a restaurant to see menus.</p>
          ) : menus.length === 0 ? (
            <p>No menus found for this restaurant.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {menus.map((m) => (
                <li key={m.id} style={{ marginBottom: 6 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMenu(m);
                      setCart([]); // optional: clear cart when switching menu
                    }}
                    style={{
                      padding: "0.5rem 0.75rem",
                      borderRadius: 4,
                      border:
                        selectedMenu?.id === m.id
                          ? "2px solid #111827"
                          : "1px solid #d1d5db",
                      backgroundColor:
                        selectedMenu?.id === m.id ? "#e5e7eb" : "white",
                      width: "100%",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{m.name}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start" }}>
        {/* Menu items */}
        <div style={{ flex: 2 }}>
          <h3>Menu items</h3>
          {loadingItems ? (
            <p>Loading items...</p>
          ) : !selectedMenu ? (
            <p>Select a menu to see items.</p>
          ) : items.length === 0 ? (
            <p>No items found for this menu.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {items.map((item) => (
                <li
                  key={item.id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 6,
                    padding: "0.75rem 1rem",
                    marginBottom: "0.5rem",
                    background: "white",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    {item.description && (
                      <div style={{ fontSize: "0.9rem", color: "#555" }}>
                        {item.description}
                      </div>
                    )}
                    <div style={{ marginTop: 4 }}>
                      ${item.price.toFixed(2)}
                    </div>
                  </div>
                  <button onClick={() => addToCart(item)}>Add</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Cart */}
        <div
          style={{
            flex: 1,
            border: "1px solid #ddd",
            borderRadius: 6,
            padding: "1rem",
            background: "white",
          }}
        >
          <h3>Your cart</h3>
          {selectedRestaurant && (
            <div style={{ fontSize: "0.9rem", marginBottom: 8 }}>
              Restaurant: <strong>{selectedRestaurant.name}</strong>
            </div>
          )}
          {cart.length === 0 ? (
            <p>No items yet.</p>
          ) : (
            <>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {cart.map((c) => (
                  <li
                    key={c.item.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 8,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div>{c.item.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "#555" }}>
                        ${c.item.price.toFixed(2)} ×{" "}
                        <input
                          type="number"
                          value={c.quantity}
                          min={1}
                          style={{ width: 50 }}
                          onChange={(e) =>
                            changeQuantity(
                              c.item.id,
                              Number(e.target.value || 0)
                            )
                          }
                        />
                      </div>
                    </div>
                    <div>
                      ${(c.item.price * c.quantity).toFixed(2)}
                    </div>
                  </li>
                ))}
              </ul>

              <hr />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <strong>Total</strong>
                <strong>${total.toFixed(2)}</strong>
              </div>

              <div style={{ marginBottom: 8 }}>
                <label>
                  Special request:{" "}
                  <textarea
                    value={specialRequest}
                    onChange={(e) => setSpecialRequest(e.target.value)}
                    rows={2}
                    style={{ width: "100%" }}
                  />
                </label>
              </div>

              <button onClick={placeOrder} disabled={submitting}>
                {submitting ? "Placing order..." : "Place order"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
