"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { useNotifications } from "@/hooks/useNotifications";


type OrderStatusHistoryRow = {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_at: string;
};

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
  order_number: string | null;
  status: string;
  special_request: string | null;
  total: number | null;
  created_at: string;
  restaurants:
    | { name: string }
    | { name: string }[]
    | null;
  order_items: OrderItemRow[];
  order_status_history: OrderStatusHistoryRow[];
};




const formatStatus = (status: string) => {
  switch (status) {
    case "pending":
      return "Pending owner review";
    case "owner_review":
      return "Approved by owner";
    case "changes_requested":
      return "Changes requested by owner";
    case "customer_accepted":
      return "Accepted by you";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
};

export default function CustomerOrdersPage() {
  const { user, loading: authLoading } = useSupabaseUser();

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);

  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    markAllRead,
  } = useNotifications("customer");

  const loadOrders = async (currentUserId: string) => {
    setLoadingOrders(true);
    setMessage(null);


  

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      order_number,
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
      ),
      order_status_history (
        id,
        old_status,
        new_status,
        changed_by,
        changed_at
      )
    `
    )
    .eq("customer_id", currentUserId)
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

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoadingOrders(false);
      return;
    }
    void loadOrders(user.id);
  }, [authLoading, user]);

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

  const acceptOrder = async (orderId: string) => {
    if (!user) return;

    setActionOrderId(orderId);
    setMessage(null);

    const { error } = await supabase
      .from("orders")
      .update({ status: "customer_accepted" })
      .eq("id", orderId)
      .eq("customer_id", user.id); // extra safety

    if (error) {
      console.error(error);
      setMessage("Failed to accept the order.");
    } else {
      setMessage("Order accepted. The restaurant can now generate an invoice.");
      await loadOrders(user.id);
    }

    setActionOrderId(null);
  };

  const cancelOrder = async (orderId: string) => {
    if (!user) return;

    if (!window.confirm("Are you sure you want to cancel this order?")) {
      return;
    }

    setActionOrderId(orderId);
    setMessage(null);

    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId)
      .eq("customer_id", user.id);

    if (error) {
      console.error(error);
      setMessage("Failed to cancel the order.");
    } else {
      setMessage("Order cancelled.");
      await loadOrders(user.id);
    }

    setActionOrderId(null);
  };

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

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <h1>My Orders</h1>

      {/* Notifications for customer */}
      <div
        style={{
          marginBottom: "0.75rem",
          padding: "0.5rem 0.75rem",
          border: "1px solid #e5e7eb",
          borderRadius: 6,
          background: "#f9fafb",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.25rem",
          }}
        >
          <div>
            <strong>Updates on your orders</strong>{" "}
            <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
              {notificationsLoading
                ? "(loading...)"
                : unreadCount > 0
                ? `(${unreadCount} unread)`
                : "(no unread)"}
            </span>
          </div>
          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            style={{ fontSize: "0.8rem" }}
          >
            Mark all read
          </button>
        </div>

        {notifications.length === 0 ? (
          <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
            No updates yet.
          </div>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              maxHeight: 120,
              overflowY: "auto",
              fontSize: "0.85rem",
            }}
          >
            {notifications.slice(0, 5).map((n) => (
              <li
                key={n.id}
                style={{
                  padding: "2px 0",
                  opacity: n.is_read ? 0.6 : 1,
                }}
              >
                <span>
                  {new Date(n.created_at).toLocaleString()} – {n.message}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>


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

      {loadingOrders ? (
        <p>Loading your orders...</p>
      ) : orders.length === 0 ? (
        <p>You haven’t placed any orders yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {orders.map((order) => {
            const allowDecision =
              order.status === "owner_review" ||
              order.status === "changes_requested";

            return (
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
                    <strong>  Order {order.order_number ?? `#${order.id.slice(0, 8)}`} </strong>

                    <div style={{ fontSize: "0.8rem", color: "#666" }}>
                      Placed at:{" "}
                      {new Date(order.created_at).toLocaleString()}
                    </div>
                    <div style={{ fontSize: "0.9rem", marginTop: 4 }}>
                      Restaurant:{" "}
                      <strong>{getRestaurantName(order.restaurants)}</strong>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div>
                      <span>Status: </span>
                      <strong>{formatStatus(order.status)}</strong>
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
                    <strong>Your special request:</strong>{" "}
                    {order.special_request}
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


                {/* Status history timeline */}
                {order.order_status_history && order.order_status_history.length > 0 && (
                  <div style={{ marginTop: 6, fontSize: "0.85rem" }}>
                    <strong>Status history:</strong>
                    <ul style={{ margin: "4px 0 0 0", paddingLeft: "1.1rem" }}>
                      {[...order.order_status_history]
                        .sort(
                          (a, b) =>
                            new Date(a.changed_at).getTime() -
                            new Date(b.changed_at).getTime()
                        )
                        .map((h) => (
                          <li key={h.id}>
                            <span>
                              {new Date(h.changed_at).toLocaleString()} –{" "}
                              {h.old_status
                                ? `${formatStatus(h.old_status)} → `
                                : ""}
                              <strong>{formatStatus(h.new_status)}</strong>
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}


                {/* Customer decision buttons */}
                {allowDecision && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "0.5rem",
                      marginTop: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => acceptOrder(order.id)}
                      disabled={actionOrderId === order.id}
                    >
                      {actionOrderId === order.id
                        ? "Accepting..."
                        : "Accept final order"}
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelOrder(order.id)}
                      disabled={actionOrderId === order.id}
                    >
                      {actionOrderId === order.id
                        ? "Cancelling..."
                        : "Cancel order"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
