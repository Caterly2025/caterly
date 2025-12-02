"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";

type OrderItemRow = {
  id: string;
  quantity: number;
  price: number;
  menu_items:
    | { name: string }
    | { name: string }[]
    | null;
};

type OrderRow = {
  id: string;
  status: string;
  special_request: string | null;
  total: number | null;
  created_at: string;
  restaurants:
    | { name: string }
    | { name: string }[]
    | null;
  order_items: OrderItemRow[];
};

export default function CustomerOrdersPage() {
  const { user, loading: authLoading } = useSupabaseUser();

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadOrders = async () => {
      if (authLoading) return;
      if (!user) {
        setLoadingOrders(false);
        return;
      }

      setLoadingOrders(true);
      setMessage(null);

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          status,
          special_request,
          total,
          created_at,
          restaurants ( name ),
          order_items (
            id,
            quantity,
            price,
            menu_items ( name )
          )
        `
        )
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setMessage("Error loading your orders.");
        setLoadingOrders(false);
        return;
      }

      setOrders((data || []) as unknown as OrderRow[]);
      setLoadingOrders(false);
    };

    void loadOrders();
  }, [authLoading, user]);

  if (authLoading) {
    return <div>Checking authentication...</div>;
  }

  if (!user) {
    return (
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1>My Orders – Caterly</h1>
        <p>You must be logged in to see your orders.</p>
        <p>
          Go to <a href="/auth">Auth</a> to login or sign up.
        </p>
      </div>
    );
  }

  const getRestaurantName = (r: OrderRow["restaurants"]) => {
    if (!r) return "Unknown restaurant";
    if (Array.isArray(r)) return r[0]?.name ?? "Unknown restaurant";
    return r.name;
  };

  const getItemName = (m: OrderItemRow["menu_items"]) => {
    if (!m) return "Unknown item";
    if (Array.isArray(m)) return m[0]?.name ?? "Unknown item";
    return m.name;
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <h1>My Orders</h1>

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

      {loadingOrders ? (
        <p>Loading your orders...</p>
      ) : orders.length === 0 ? (
        <p>You haven’t placed any orders yet.</p>
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
                  <div style={{ fontSize: "0.9rem", marginTop: 4 }}>
                    Restaurant:{" "}
                    <strong>{getRestaurantName(order.restaurants)}</strong>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div>
                    <span>Status: </span>
                    <strong>{order.status}</strong>
                  </div>
                  {order.total != null && (
                    <div style={{ marginTop: 4 }}>
                      <strong>Total: ${order.total.toFixed(2)}</strong>
                    </div>
                  )}
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
                  {order.order_items?.map((oi) => (
                    <tr key={oi.id}>
                      <td style={{ padding: "4px 0" }}>
                        {getItemName(oi.menu_items)}
                      </td>
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
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
