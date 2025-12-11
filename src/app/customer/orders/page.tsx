"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { useNotifications } from "@/hooks/useNotifications";

// ---- Types ----

type RestaurantRef =
  | { name: string }
  | { name: string }[]
  | null;

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
  price: number | null;
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
  restaurants: RestaurantRef;
  order_items: OrderItemRow[];
  order_status_history: OrderStatusHistoryRow[];
};

// ---- Helpers ----

const formatStatus = (status: string) => {
  switch (status) {
    case "pending":
      return "Pending owner review";
    case "owner_review":
      return "Reviewed by owner";
    case "changes_requested":
      return "Changes requested";
    case "customer_accepted":
      return "Accepted by customer";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
};

const getRestaurantName = (r: RestaurantRef): string => {
  if (!r) return "Unknown restaurant";
  if (Array.isArray(r)) return r[0]?.name ?? "Unknown restaurant";
  return r.name;
};

const getMenuItemName = (
  m: OrderItemRow["menu_items"]
): string => {
  if (!m) return "Unknown item";
  if (Array.isArray(m)) return m[0]?.name ?? "Unknown item";
  return m.name;
};

const getNotificationIcon = (event: string) => {
  switch (event) {
    case "pending":
      return "🕒"; // new order / waiting
    case "owner_review":
      return "👀"; // reviewed by owner
    case "changes_requested":
      return "✏️"; // changes requested
    case "customer_accepted":
      return "✅"; // accepted by customer
    case "completed":
      return "🏁"; // completed
    case "cancelled":
      return "❌"; // cancelled
    default:
      return "ℹ️"; // generic info
  }
};

const renderStatusBadge = (status: string) => {
  let bg = "#e5e7eb";
  let color = "#111827";

  switch (status) {
    case "pending":
      bg = "#fef3c7";
      color = "#92400e";
      break;
    case "owner_review":
      bg = "#dcfce7";
      color = "#166534";
      break;
    case "changes_requested":
      bg = "#fce7f3";
      color = "#9d174d";
      break;
    case "customer_accepted":
      bg = "#dbeafe";
      color = "#1d4ed8";
      break;
    case "completed":
      bg = "#e5e7eb";
      color = "#111827";
      break;
    case "cancelled":
      bg = "#fee2e2";
      color = "#b91c1c";
      break;
  }

  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: "0.75rem",
        fontWeight: 600,
        background: bg,
        color,
      }}
    >
      {formatStatus(status)}
    </span>
  );
};

// ---- Component ----

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

  // Shared fetch logic so we can reuse after actions
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
      console.error("Error loading orders:", error);
      setMessage("Error loading your orders.");
      setOrders([]);
      setLoadingOrders(false);
      return;
    }

    setOrders((data || []) as OrderRow[]);
    setLoadingOrders(false);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setOrders([]);
      setLoadingOrders(false);
      return;
    }
    void loadOrders(user.id);
  }, [authLoading, user]);

  const handleAcceptChanges = async (orderId: string) => {
    if (!user) return;
    setActionOrderId(orderId);
    setMessage(null);

    const { error } = await supabase
      .from("orders")
      .update({ status: "customer_accepted" })
      .eq("id", orderId);

    if (error) {
      console.error("Error accepting order changes:", error);
      setMessage("Error accepting changes. Please try again.");
      setActionOrderId(null);
      return;
    }

    await loadOrders(user.id);
    setActionOrderId(null);
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!user) return;
    setActionOrderId(orderId);
    setMessage(null);

    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId);

    if (error) {
      console.error("Error cancelling order:", error);
      setMessage("Error cancelling order. Please try again.");
      setActionOrderId(null);
      return;
    }

    await loadOrders(user.id);
    setActionOrderId(null);
  };

  if (authLoading) {
    return <div>Checking authentication...</div>;
  }

  if (!user) {
    return (
      <div className="page">
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div className="card">
            <h1 className="page-title">My Orders – Caterly</h1>
            <p className="page-subtitle">
              You must be logged in to see your orders.
            </p>
            <p>
              Go to <a href="/auth">Auth</a> to login or sign up.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <h1 className="page-title">My Orders</h1>

        {/* Notifications box */}
        <div className="card" style={{ marginBottom: "1rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.25rem",
              gap: "0.5rem",
              flexWrap: "wrap",
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
              className="btn btn-secondary"
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
                maxHeight: 150,
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
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  <span>{getNotificationIcon(n.event)}</span>
                  <span>
                    {new Date(n.created_at).toLocaleString()} – {n.message}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {message && (
          <div className="alert alert-error">{message}</div>
        )}

        {loadingOrders ? (
          <p>Loading your orders...</p>
        ) : orders.length === 0 ? (
          <p>You don’t have any orders yet.</p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            {orders.map((order) => {
              const restaurantName = getRestaurantName(order.restaurants);
              const orderLabel =
                order.order_number ?? `#${order.id.slice(0, 8)}`;

              return (
                <div key={order.id} className="card">
                  {/* Header row */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                      flexWrap: "wrap",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.5rem",
                          alignItems: "center",
                        }}
                      >
                        <strong>Order {orderLabel}</strong>
                        {renderStatusBadge(order.status)}
                      </div>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "#6b7280",
                          marginTop: 2,
                        }}
                      >
                        Placed:{" "}
                        {new Date(
                          order.created_at
                        ).toLocaleString()}
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          marginTop: 4,
                        }}
                      >
                        Restaurant:{" "}
                        <strong>{restaurantName}</strong>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: "0.9rem",
                          fontWeight: 600,
                        }}
                      >
                        Total: $
                        {order.total?.toFixed(2) ?? "0.00"}
                      </div>
                    </div>
                  </div>

                  {/* Special request */}
                  {order.special_request && (
                    <div
                      style={{
                        fontSize: "0.85rem",
                        marginBottom: "0.5rem",
                        color: "#374151",
                      }}
                    >
                      <strong>Special request: </strong>
                      {order.special_request}
                    </div>
                  )}

                  {/* Items table */}
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "0.9rem",
                      marginTop: "0.25rem",
                    }}
                  >
                    <thead>
                      <tr>
                        <th
                          style={{
                            textAlign: "left",
                            paddingBottom: 4,
                            borderBottom: "1px solid #e5e7eb",
                          }}
                        >
                          Item
                        </th>
                        <th
                          style={{
                            textAlign: "center",
                            paddingBottom: 4,
                            borderBottom: "1px solid #e5e7eb",
                          }}
                        >
                          Qty
                        </th>
                        <th
                          style={{
                            textAlign: "right",
                            paddingBottom: 4,
                            borderBottom: "1px solid #e5e7eb",
                          }}
                        >
                          Price
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.order_items.map((item) => (
                        <tr key={item.id}>
                          <td
                            style={{
                              paddingTop: 4,
                              paddingBottom: 4,
                            }}
                          >
                            {getMenuItemName(item.menu_items)}
                          </td>
                          <td
                            style={{
                              textAlign: "center",
                              paddingTop: 4,
                              paddingBottom: 4,
                            }}
                          >
                            {item.quantity}
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              paddingTop: 4,
                              paddingBottom: 4,
                            }}
                          >
                            $
                            {item.price != null
                              ? item.price.toFixed(2)
                              : "0.00"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Status history timeline */}
                  {order.order_status_history &&
                    order.order_status_history.length >
                      0 && (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: "0.85rem",
                        }}
                      >
                        <strong>Status history:</strong>
                        <ul
                          style={{
                            margin: "4px 0 0 0",
                            paddingLeft: "1.1rem",
                          }}
                        >
                          {[...order.order_status_history]
                            .sort(
                              (a, b) =>
                                new Date(
                                  a.changed_at
                                ).getTime() -
                                new Date(
                                  b.changed_at
                                ).getTime()
                            )
                            .map((h) => (
                              <li key={h.id}>
                                {new Date(
                                  h.changed_at
                                ).toLocaleString()}{" "}
                                –{" "}
                                {h.old_status
                                  ? `${formatStatus(
                                      h.old_status
                                    )} → `
                                  : ""}
                                <strong>
                                  {formatStatus(
                                    h.new_status
                                  )}
                                </strong>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                  {/* Action buttons */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.75rem",
                      marginTop: "0.75rem",
                    }}
                  >
                    {order.status === "changes_requested" && (
                      <>
                        <button
                          className="btn btn-primary"
                          onClick={() =>
                            handleAcceptChanges(
                              order.id
                            )
                          }
                          disabled={
                            actionOrderId === order.id
                          }
                        >
                          {actionOrderId === order.id
                            ? "Accepting..."
                            : "Accept Changes"}
                        </button>

                        <button
                          className="btn btn-danger"
                          onClick={() =>
                            handleCancelOrder(
                              order.id
                            )
                          }
                          disabled={
                            actionOrderId === order.id
                          }
                        >
                          {actionOrderId === order.id
                            ? "Cancelling..."
                            : "Cancel Order"}
                        </button>
                      </>
                    )}

                    {order.status === "pending" && (
                      <button
                        className="btn btn-danger"
                        onClick={() =>
                          handleCancelOrder(
                            order.id
                          )
                        }
                        disabled={
                          actionOrderId === order.id
                        }
                      >
                        {actionOrderId === order.id
                          ? "Cancelling..."
                          : "Cancel Order"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
