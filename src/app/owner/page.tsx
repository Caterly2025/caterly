"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";

type OrderItemRow = {
  id: string;
  quantity: number;
  price: number;
  menu_items:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};

type OrderRow = {
  id: string;
  status: string;
  special_request: string | null;
  total: number | null;
  created_at: string;
  order_items: OrderItemRow[];
};

type Restaurant = {
  id: string;
  name: string;
  description: string | null;
};

export default function OwnerPage() {
  const { user, loading: authLoading } = useSupabaseUser();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // Load restaurants owned by this user
  useEffect(() => {
    const loadRestaurants = async () => {
      if (authLoading || !user) return;

      setMessage(null);

      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, description")
        .eq("owner_id", user.id)
        .order("created_at");

      if (error) {
        console.error(error);
        setMessage("Error loading your restaurants.");
        return;
      }

      const list = (data || []) as Restaurant[];
      setRestaurants(list);

      if (list.length > 0) {
        setSelectedRestaurant(list[0]);
      } else {
        setSelectedRestaurant(null);
        setOrders([]);
      }
    };

    void loadRestaurants();
  }, [authLoading, user]);

  // Load orders for selected restaurant
  const loadOrders = async (restaurantId: string) => {
    if (!user || !restaurantId) return;

    setLoadingOrders(true);
    setMessage(null);

    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, status, special_request, total, created_at, order_items(id, quantity, price, menu_items(name))"
      )
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMessage("Error loading orders.");
      setLoadingOrders(false);
      return;
    }

    setOrders((data || []) as unknown as OrderRow[]);
    setLoadingOrders(false);
  };

  // When selectedRestaurant changes, reload orders
  useEffect(() => {
    if (selectedRestaurant && user) {
      void loadOrders(selectedRestaurant.id);
    } else {
      setOrders([]);
    }
  }, [selectedRestaurant, user]);

  const updateStatus = async (orderId: string, status: string) => {
    setMessage(null);

    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);

    if (error) {
      console.error(error);
      setMessage("Failed to update status.");
      return;
    }

    setMessage("Order status updated.");
    if (selectedRestaurant) {
      await loadOrders(selectedRestaurant.id);
    }
  };

  // --- Auth gating ---
  if (authLoading) {
    return <div>Checking authentication...</div>;
  }

  if (!user) {
    return (
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1>Owner View – Caterly</h1>
        <p>You must be logged in as an owner to view this page.</p>
        <p>
          Go to <a href="/auth">Auth</a> to login or sign up.
        </p>
      </div>
    );
  }

  // --- No restaurants case ---
  if (!authLoading && user && restaurants.length === 0) {
    return (
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1>Owner View – Caterly</h1>
        <p>You don’t have any restaurants assigned to your account yet.</p>
        <p>
          Use the <a href="/admin">Admin</a> page (or ask an admin) to create a
          restaurant with <code>owner_id = {user.id}</code>.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <h1>Owner View – Caterly</h1>

      {message && (
        <div
          style={{
            background: "#e0f2fe",
            border: "1px solid #bae6fd",
            padding: "0.5rem 1rem",
            marginBottom: "1rem",
            borderRadius: 4,
          }}
        >
          {message}
        </div>
      )}

      {/* Restaurant selector */}
      <div style={{ marginBottom: "1rem" }}>
        <h2>Your restaurants</h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {restaurants.map((r) => (
            <li key={r.id} style={{ marginBottom: 6 }}>
              <button
                type="button"
                onClick={() => setSelectedRestaurant(r)}
                style={{
                  padding: "0.4rem 0.6rem",
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
                  <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                    {r.description}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {selectedRestaurant && (
        <p>
          Managing restaurant: <strong>{selectedRestaurant.name}</strong>
        </p>
      )}

      {/* Orders list */}
      <h2>Orders</h2>
      {loadingOrders ? (
        <p>Loading orders...</p>
      ) : orders.length === 0 ? (
        <p>No orders yet for this restaurant.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {orders.map((order) => (
            <div
              key={order.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 6,
                padding: "1rem",
                background: "white",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <div>
                  <strong>Order #{order.id.slice(0, 8)}</strong>
                  <div style={{ fontSize: "0.8rem", color: "#666" }}>
                    Placed at: {new Date(order.created_at).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span>Status: </span>
                  <strong>{order.status}</strong>
                </div>
              </div>

              {order.special_request && (
                <div style={{ marginBottom: 8 }}>
                  <strong>Special request:</strong> {order.special_request}
                </div>
              )}

              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  marginBottom: 8,
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: "left",
                        borderBottom: "1px solid #ddd",
                      }}
                    >
                      Item
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        borderBottom: "1px solid #ddd",
                      }}
                    >
                      Qty
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        borderBottom: "1px solid #ddd",
                      }}
                    >
                      Price
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        borderBottom: "1px solid #ddd",
                      }}
                    >
                      Line Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {order.order_items?.map((oi) => {
                    const itemName = Array.isArray(oi.menu_items)
                      ? oi.menu_items[0]?.name ?? "Unknown item"
                      : oi.menu_items?.name ?? "Unknown item";

                    return (
                      <tr key={oi.id}>
                        <td style={{ padding: "4px 0" }}>{itemName}</td>
                        <td style={{ padding: "4px 0", textAlign: "right" }}>
                          {oi.quantity}
                        </td>
                        <td style={{ padding: "4px 0", textAlign: "right" }}>
                          ${oi.price.toFixed(2)}
                        </td>
                        <td style={{ padding: "4px 0", textAlign: "right" }}>
                          {(oi.price * oi.quantity).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong>Total:</strong>{" "}
                  ${order.total?.toFixed(2) ?? "0.00"}
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => updateStatus(order.id, "owner_review")}
                  >
                    Mark as Reviewed
                  </button>
                  <button
                    onClick={() =>
                      updateStatus(order.id, "changes_requested")
                    }
                  >
                    Request Changes
                  </button>
                  <button
                    onClick={() =>
                      updateStatus(order.id, "customer_accepted")
                    }
                  >
                    Mark as Accepted
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
