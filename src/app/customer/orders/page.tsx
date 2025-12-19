"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { useNotifications } from "@/hooks/useNotifications";

type RestaurantRef =
  | { id: string; name: string }
  | { id: string; name: string }[]
  | null;

type OrderItemRow = {
  id: string;
  quantity: number;
  price: number | null;
  menu_items:
    | { name: string }
    | { name: string }[]
    | null;
};

type InvoiceRow = {
  id: string;
  total: number | null;
  is_paid: boolean | null;
  created_at: string;
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
  invoices: InvoiceRow[];
};

type StatusType =
  | "pending"
  | "owner_review"
  | "changes_requested"
  | "customer_accepted"
  | "completed"
  | "cancelled";

const formatStatus = (s: string) => {
  switch (s) {
    case "pending":
      return "Submitted";
    case "owner_review":
      return "Reviewed";
    case "changes_requested":
      return "Changes requested";
    case "customer_accepted":
      return "Accepted";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return s;
  }
};

const statusBadge = (s: string) => {
  let cls = "badge badge-info";
  if (s === "completed") cls = "badge badge-success";
  if (s === "pending") cls = "badge badge-info";
  if (s === "changes_requested") cls = "badge badge-warn";
  if (s === "cancelled") cls = "badge badge-danger";

  return <span className={cls}>{formatStatus(s)}</span>;
};

const getRestaurantName = (r: RestaurantRef): string => {
  if (!r) return "Unknown restaurant";
  if (Array.isArray(r)) return r[0]?.name ?? "Unknown restaurant";
  return r.name;
};

const getMenuItemName = (m: OrderItemRow["menu_items"]): string => {
  if (!m) return "Unknown item";
  if (Array.isArray(m)) return m[0]?.name ?? "Unknown item";
  return m.name;
};

const sendOrderEmailEvent = async (
  orderId: string,
  event: "order_created" | "order_status_changed" | "invoice_created",
  newStatus?: string
) => {
  try {
    await supabase.functions.invoke("send-order-email", {
      body: { orderId, event, newStatus },
    });
  } catch (err) {
    console.error("Error invoking send-order-email:", err);
  }
};

export default function CustomerOrdersPage() {
  const { user, loading: authLoading } = useSupabaseUser();

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    markAllRead,
  } = useNotifications("customer");

  const loadOrders = async (customerId: string) => {
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
        restaurants (
          id,
          name
        ),
        order_items (
          id,
          quantity,
          price,
          menu_items ( name )
        ),
        invoices (
          id,
          total,
          is_paid,
          created_at
        )
      `
      )
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading orders:", error);
      setMessage("Error loading your orders.");
      setOrders([]);
      setLoadingOrders(false);
      return;
    }

    const rows = (data || []) as OrderRow[];
    setOrders(rows);

    // Auto-expand latest order if none expanded yet
    if (rows.length > 0 && Object.keys(expanded).length === 0) {
      setExpanded({ [rows[0].id]: true });
    }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const handleAcceptChanges = async (orderId: string) => {
    if (!user) return;
    setMessage(null);

    const { error } = await supabase
      .from("orders")
      .update({ status: "customer_accepted" })
      .eq("id", orderId);

    if (error) {
      console.error("Error accepting changes:", error);
      setMessage("Error accepting changes. Please try again.");
      return;
    }

    await sendOrderEmailEvent(orderId, "order_status_changed", "customer_accepted");
    await loadOrders(user.id);
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!user) return;
    setMessage(null);

    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId);

    if (error) {
      console.error("Error cancelling order:", error);
      setMessage("Error cancelling order. Please try again.");
      return;
    }

    await sendOrderEmailEvent(orderId, "order_status_changed", "cancelled");
    await loadOrders(user.id);
  };

  const orderCards = useMemo(() => orders, [orders]);

  if (authLoading) {
    return <div className="page"><div className="container">Checking authentication…</div></div>;
  }

  if (!user) {
    return (
      <>
        <div className="hero">
          <div className="hero-inner">
            <h1 className="hero-title">My Orders</h1>
            <div className="hero-subtitle">Track and view your orders</div>
          </div>
        </div>

        <div className="page">
          <div className="container">
            <div className="card">
              <p>You must be logged in to view your orders.</p>
              <p>
                Go to <Link href="/auth/customer">Customer Auth</Link> to login or sign up.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Hero like screenshot */}
      <div className="hero">
        <div className="hero-inner">
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <h1 className="hero-title">My Orders</h1>
              <div className="hero-subtitle">Track and view your orders</div>
            </div>

            <div className="hero-actions">
              <Link className="btn btn-secondary" href="/customer">
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="page">
        <div className="container">
          {/* Notifications */}
          <div className="card" style={{ marginBottom: "1rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontWeight: 900 }}>
                Updates on your orders{" "}
                <span style={{ fontWeight: 700, color: "var(--muted)", fontSize: "0.9rem" }}>
                  {notificationsLoading
                    ? "(loading...)"
                    : unreadCount > 0
                    ? `(${unreadCount} unread)`
                    : "(no unread)"}
                </span>
              </div>

              <button
                className="btn btn-secondary"
                type="button"
                onClick={markAllRead}
                disabled={unreadCount === 0}
              >
                Mark all read
              </button>
            </div>

            <div style={{ marginTop: 10 }}>
              {notifications.length === 0 ? (
                <div style={{ color: "var(--muted)" }}>No notifications yet.</div>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, maxHeight: 180, overflowY: "auto" }}>
                  {notifications.slice(0, 10).map((n) => (
                    <li
                      key={n.id}
                      style={{
                        padding: "6px 0",
                        borderBottom: "1px solid var(--border)",
                        opacity: n.is_read ? 0.7 : 1,
                      }}
                    >
                      <div style={{ fontSize: "0.9rem", fontWeight: 800 }}>
                        {n.title ?? "Update"}
                      </div>
                      <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                        {n.message}
                      </div>
                      <div style={{ color: "var(--muted)", fontSize: "0.8rem", marginTop: 2 }}>
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {message && <div className="alert alert-error">{message}</div>}

          {loadingOrders ? (
            <div>Loading orders…</div>
          ) : orderCards.length === 0 ? (
            <div className="card">
              <div style={{ fontWeight: 900, fontSize: "1.05rem" }}>No orders yet</div>
              <div style={{ color: "var(--muted)", marginTop: 6 }}>
                Place your first order from the customer home.
              </div>
              <div style={{ marginTop: 12 }}>
                <Link className="btn btn-primary" href="/customer">
                  Browse Restaurants
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {orderCards.map((o) => {
                const isOpen = !!expanded[o.id];
                const restaurantName = getRestaurantName(o.restaurants);
                const orderLabel = o.order_number ?? `#${o.id.slice(0, 8)}`;
                const itemCount = o.order_items?.reduce((sum, it) => sum + (it.quantity || 0), 0) ?? 0;

                return (
                  <div key={o.id} className="card">
                    {/* Header row (collapsed view) */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "1rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 900, fontSize: "1.05rem" }}>
                          {restaurantName}{" "}
                          <span style={{ marginLeft: 10 }}>{statusBadge(o.status)}</span>
                        </div>

                        <div style={{ display: "flex", gap: "0.9rem", flexWrap: "wrap", marginTop: 6, color: "var(--muted)", fontSize: "0.92rem" }}>
                          <div>📅 {new Date(o.created_at).toLocaleDateString()}</div>
                          <div style={{ fontWeight: 900, color: "var(--primary)" }}>
                            ${Number(o.total ?? 0).toFixed(2)}
                          </div>
                          <div>{itemCount} items</div>
                          <div style={{ fontWeight: 900 }}>Order {orderLabel}</div>
                        </div>
                      </div>

                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() => setExpanded((prev) => ({ ...prev, [o.id]: !prev[o.id] }))}
                        aria-expanded={isOpen}
                      >
                        {isOpen ? "▴" : "▾"}
                      </button>
                    </div>

                    {/* Expanded */}
                    {isOpen && (
                      <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                            gap: "1rem",
                          }}
                        >
                          {/* Left */}
                          <div>
                            <div style={{ fontSize: "0.9rem", color: "var(--muted)", fontWeight: 800 }}>
                              Order ID
                            </div>
                            <div style={{ fontWeight: 900, marginBottom: 10 }}>
                              {orderLabel}
                            </div>

                            <div style={{ fontSize: "0.9rem", color: "var(--muted)", fontWeight: 800 }}>
                              Special Instructions
                            </div>
                            <div
                              style={{
                                marginTop: 6,
                                padding: "0.75rem",
                                borderRadius: 10,
                                border: "1px solid var(--border)",
                                background: "var(--surface-2)",
                              }}
                            >
                              {o.special_request ? o.special_request : <span style={{ color: "var(--muted)" }}>None</span>}
                            </div>

                            {/* Customer actions */}
                            <div style={{ marginTop: 12, display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                              {o.status === "changes_requested" && (
                                <button className="btn btn-primary" onClick={() => handleAcceptChanges(o.id)}>
                                  ✓ Accept changes
                                </button>
                              )}

                              {o.status !== "completed" && o.status !== "cancelled" && (
                                <button className="btn btn-danger" onClick={() => handleCancelOrder(o.id)}>
                                  ✕ Cancel order
                                </button>
                              )}
                            </div>

                            {/* Invoice status */}
                            <div style={{ marginTop: 14 }}>
                              <div style={{ fontSize: "0.9rem", color: "var(--muted)", fontWeight: 800 }}>
                                Invoice
                              </div>
                              <div style={{ marginTop: 6 }}>
                                {o.invoices && o.invoices.length > 0 ? (
                                  <div style={{ fontWeight: 900 }}>
                                    {o.invoices[0].is_paid ? "Paid" : "Unpaid"} — $
                                    {Number(o.invoices[0].total ?? 0).toFixed(2)}
                                  </div>
                                ) : (
                                  <div style={{ color: "var(--muted)" }}>No invoice yet</div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: items list */}
                          <div>
                            <div style={{ fontSize: "0.9rem", color: "var(--muted)", fontWeight: 800 }}>
                              Order Items
                            </div>

                            <div
                              style={{
                                marginTop: 10,
                                maxHeight: 260,
                                overflowY: "auto",
                                paddingRight: 6,
                              }}
                            >
                              {o.order_items.map((it) => (
                                <div
                                  key={it.id}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: "1rem",
                                    padding: "0.75rem",
                                    borderRadius: 10,
                                    border: "1px solid var(--border)",
                                    background: "var(--surface-2)",
                                    marginBottom: 10,
                                  }}
                                >
                                  <div>
                                    <div style={{ fontWeight: 900 }}>
                                      {getMenuItemName(it.menu_items)}
                                    </div>
                                    <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                                      Quantity: {it.quantity}
                                    </div>
                                  </div>
                                  <div style={{ fontWeight: 900 }}>
                                    ${Number(it.price ?? 0).toFixed(2)}
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                              <div style={{ fontWeight: 900, fontSize: "1.05rem" }}>Total:</div>
                              <div style={{ fontWeight: 900, fontSize: "1.05rem", color: "var(--primary)" }}>
                                ${Number(o.total ?? 0).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
