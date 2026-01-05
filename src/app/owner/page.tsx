"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { useNotifications } from "@/hooks/useNotifications";

// ---------- Types ----------

type RestaurantRef =
  | {
      id: string;
      name: string;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      zip_code?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    }
  | {
      id: string;
      name: string;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      zip_code?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    }[]
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
  order_status_history: OrderStatusHistoryRow[];
  delivery_address?: string | null;
  delivery_city?: string | null;
  delivery_state?: string | null;
  delivery_zip?: string | null;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
};

// ---------- Helpers ----------

const STATUS_FLOW = [
  { key: "ordered", label: "Ordered" },
  { key: "owner_accepted", label: "Owner accepted" },
  { key: "customer_accepted", label: "Customer accepted" },
  { key: "invoiced", label: "Invoiced" },
  { key: "paid", label: "Paid" },
  { key: "scheduled", label: "Scheduled" },
  { key: "delivered", label: "Delivered" },
] as const;

const ALL_STATUSES = [...STATUS_FLOW.map((s) => s.key), "cancelled"] as const;

type StatusType = (typeof ALL_STATUSES)[number];

type DateRangeFilter = "all" | "today" | "last7" | "last30";

const formatStatus = (status: string) => {
  switch (status) {
    case "ordered":
      return "Ordered";
    case "owner_accepted":
      return "Owner accepted";
    case "customer_accepted":
      return "Customer accepted";
    case "invoiced":
      return "Invoiced";
    case "paid":
      return "Paid";
    case "scheduled":
      return "Scheduled";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
    case "owner_review":
      return "Reviewed by owner";
    case "pending":
      return "Pending";
    case "completed":
      return "Completed";
    default:
      return status;
  }
};

const renderStatusBadge = (status: string) => {
  let bg = "#e5e7eb";
  let color = "#111827";

  switch (status) {
    case "ordered":
      bg = "#e0f2fe";
      color = "#075985";
      break;
    case "owner_accepted":
      bg = "#dcfce7";
      color = "#166534";
      break;
    case "customer_accepted":
      bg = "#e0e7ff";
      color = "#312e81";
      break;
    case "invoiced":
      bg = "#fef3c7";
      color = "#92400e";
      break;
    case "paid":
      bg = "#d9f99d";
      color = "#3f6212";
      break;
    case "scheduled":
      bg = "#ede9fe";
      color = "#5b21b6";
      break;
    case "delivered":
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

const getRestaurantName = (r: RestaurantRef): string => {
  if (!r) return "Unknown restaurant";
  if (Array.isArray(r)) {
    return r[0]?.name ?? "Unknown restaurant";
  }
  return r.name;
};

const getRestaurantLocation = (r: RestaurantRef) => {
  const restaurant = Array.isArray(r) ? r[0] : r;
  if (!restaurant) return null;
  return {
    address: restaurant.address,
    city: restaurant.city,
    state: restaurant.state,
    zip: restaurant.zip_code,
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
  };
};

const getMenuItemName = (m: OrderItemRow["menu_items"]): string => {
  if (!m) return "Unknown item";
  if (Array.isArray(m)) return m[0]?.name ?? "Unknown item";
  return m.name;
};

const getNotificationIcon = (event: string) => {
  switch (event) {
    case "ordered":
    case "pending":
      return "🕒";
    case "owner_review":
    case "owner_accepted":
      return "👀";
    case "changes_requested":
      return "✏️";
    case "customer_accepted":
      return "✅";
    case "invoiced":
      return "📄";
    case "paid":
      return "💳";
    case "scheduled":
      return "📅";
    case "completed":
    case "delivered":
      return "🏁";
    case "cancelled":
      return "❌";
    default:
      return "ℹ️";
  }
};

const normalizeStatus = (status: string): StatusType => {
  switch (status) {
    case "pending":
      return "ordered";
    case "owner_review":
      return "owner_accepted";
    case "completed":
      return "delivered";
    default:
      return status as StatusType;
  }
};

const deriveEffectiveStatus = (order: OrderRow): StatusType => {
  const normalized = normalizeStatus(order.status);
  const invoice = order.invoices?.[0];

  if (normalized === "customer_accepted" && invoice) {
    if (invoice.is_paid) return "paid";
    return "invoiced";
  }

  if (normalized === "invoiced" && invoice?.is_paid) {
    return "paid";
  }

  return normalized;
};

const calculateDistanceMiles = (
  fromLat?: number | null,
  fromLng?: number | null,
  toLat?: number | null,
  toLng?: number | null
) => {
  if (
    typeof fromLat !== "number" ||
    typeof fromLng !== "number" ||
    typeof toLat !== "number" ||
    typeof toLng !== "number"
  ) {
    return null;
  }

  const R = 3958.8; // Earth radius in miles
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLon = ((toLng - fromLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((fromLat * Math.PI) / 180) *
      Math.cos((toLat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

const isWithinRange = (createdAt: string, range: DateRangeFilter): boolean => {
  if (range === "all") return true;

  const created = new Date(createdAt);
  const now = new Date();

  if (range === "today") {
    return (
      created.getFullYear() === now.getFullYear() &&
      created.getMonth() === now.getMonth() &&
      created.getDate() === now.getDate()
    );
  }

  const diffMs = now.getTime() - created.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (range === "last7") return diffDays <= 7;
  if (range === "last30") return diffDays <= 30;

  return true;
};

// ---------- Component ----------

export default function OwnerPage() {
  const { user, loading: authLoading } = useSupabaseUser();

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<"all" | StatusType>("all");
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(300);

  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    markAllRead,
  } = useNotifications("owner");

  const loadOrders = async (ownerUserId: string) => {
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
        restaurants!inner (
          id,
          name,
          owner_id,
          address,
          city,
          state,
          zip_code,
          latitude,
          longitude
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
        ),
        order_status_history (
          id,
          old_status,
          new_status,
          changed_by,
          changed_at
        ),
        delivery_address,
        delivery_city,
        delivery_state,
        delivery_zip,
        delivery_latitude,
        delivery_longitude
      `
      )
      .eq("restaurants.owner_id", ownerUserId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading orders:", error);
      setMessage("Error loading orders.");
      setOrders([]);
      setLoadingOrders(false);
      return;
    }

    setOrders((data || []) as OrderRow[]);
    setLoadingOrders(false);
  };

  // Initial load
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setOrders([]);
      setLoadingOrders(false);
      return;
    }
    void loadOrders(user.id);
  }, [authLoading, user]);

  // Auto-refresh
  useEffect(() => {
    if (!user) return;
    if (!autoRefreshSec || autoRefreshSec <= 0) return;

    const id = setInterval(() => {
      void loadOrders(user.id);
    }, autoRefreshSec * 1000);

    return () => clearInterval(id);
  }, [user, autoRefreshSec]);

  const updateStatus = async (orderId: string, newStatus: StatusType) => {
    if (!user) return;
    setActionOrderId(orderId);
    setMessage(null);

    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      console.error("Error updating order status:", error);
      setMessage("Error updating order status.");
      setActionOrderId(null);
      return;
    }

    await loadOrders(user.id);
    setActionOrderId(null);
  };

  const generateInvoice = async (order: OrderRow) => {
    if (!user) return;
    setActionOrderId(order.id);
    setMessage(null);

    const existingInvoice = order.invoices && order.invoices[0];
    if (existingInvoice) {
      setMessage("Invoice already exists for this order.");
      setActionOrderId(null);
      return;
    }

    const { error } = await supabase.from("invoices").insert({
      order_id: order.id,
      total: order.total ?? 0,
      is_paid: false,
    });

    if (error) {
      console.error("Error creating invoice:", error);
      setMessage("Failed to create invoice.");
      setActionOrderId(null);
      return;
    }

    await supabase.from("orders").update({ status: "invoiced" }).eq("id", order.id);

    await loadOrders(user.id);
    setActionOrderId(null);
  };

  const markInvoicePaid = async (invoiceId: string, orderId: string) => {
    if (!user) return;
    setActionOrderId(orderId);
    setMessage(null);

    const { error } = await supabase
      .from("invoices")
      .update({ is_paid: true })
      .eq("id", invoiceId);

    if (error) {
      console.error("Error marking invoice paid:", error);
      setMessage("Failed to mark invoice as paid.");
      setActionOrderId(null);
      return;
    }

    await supabase.from("orders").update({ status: "paid" }).eq("id", orderId);

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
            <h1 className="page-title">Owner View – Caterly</h1>
            <p className="page-subtitle">
              You must be logged in as an owner to manage orders.
            </p>
            <p>
              Go to <a href="/auth/owner">Owner Auth</a> to login or sign up.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const filteredOrders = useMemo(
    () =>
      orders.filter((o) => {
        const effectiveStatus = deriveEffectiveStatus(o);
        if (statusFilter !== "all" && effectiveStatus !== statusFilter)
          return false;
        if (!isWithinRange(o.created_at, dateRange)) return false;
        return true;
      }),
    [orders, statusFilter, dateRange]
  );

  const stats = useMemo(() => {
    const totalSales = orders.reduce(
      (sum, o) => sum + (typeof o.total === "number" ? o.total : 0),
      0
    );
    const unpaidInvoices = orders.reduce(
      (sum, o) => sum + (o.invoices?.filter((inv) => !inv.is_paid).length || 0),
      0
    );
    const happyClients = orders.filter(
      (o) => deriveEffectiveStatus(o) === "delivered"
    ).length;

    return {
      totalOrders: orders.length,
      totalSales,
      unpaidInvoices,
      happyClients,
    };
  }, [orders]);

  return (
    <div className="page">
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
            marginBottom: "1rem",
          }}
        >
          <div>
            <div style={{ color: "var(--muted)", fontSize: "0.95rem" }}>
              Manage Anderson Deli
            </div>
            <h1 className="page-title" style={{ margin: 0 }}>
              Owner Dashboard
            </h1>
            <div style={{ color: "var(--muted)", fontSize: "0.95rem" }}>
              Manage your restaurant and catering operations
            </div>
          </div>

          <a className="btn btn-primary" href="/owner/onboarding">
            + Onboard Restaurant
          </a>
        </div>

        <div
          className="card"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="chip chip-active">🍽️</div>
            <div>
              <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>New Orders</div>
              <div style={{ fontWeight: 900, fontSize: "1.3rem" }}>{stats.totalOrders}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="chip chip-active">💰</div>
            <div>
              <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Total Sales</div>
              <div style={{ fontWeight: 900, fontSize: "1.3rem" }}>
                ${stats.totalSales.toFixed(2)}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="chip chip-active">📄</div>
            <div>
              <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Unpaid Invoices</div>
              <div style={{ fontWeight: 900, fontSize: "1.3rem" }}>{stats.unpaidInvoices}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="chip chip-active">😊</div>
            <div>
              <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Happy Clients</div>
              <div style={{ fontWeight: 900, fontSize: "1.3rem" }}>{stats.happyClients}</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: "1rem" }}>
          <a href="/owner/employees">Manage Employees</a>
        </div>
        {/* Notifications */}
        <div className="card" style={{ marginBottom: "1rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.25rem",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div>
              <strong>Notifications</strong>{" "}
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
              No notifications yet.
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
              {notifications.slice(0, 10).map((n) => (
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
                  <span>{getNotificationIcon(n.event ?? "unknown")}</span>

                  <span>
                    {new Date(n.created_at).toLocaleString()} – {n.message}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Filters */}
        <div
          className="card"
          style={{
            marginBottom: "1rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "0.85rem", marginBottom: 4 }}>
              Filter by status
            </div>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value === "all"
                    ? "all"
                    : (e.target.value as StatusType)
                )
              }
              className="input"
              style={{ maxWidth: 220 }}
            >
              <option value="all">All statuses</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {formatStatus(s)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ fontSize: "0.85rem", marginBottom: 4 }}>
              Date range
            </div>
            <select
              value={dateRange}
              onChange={(e) =>
                setDateRange(e.target.value as DateRangeFilter)
              }
              className="input"
              style={{ maxWidth: 220 }}
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="last7">Last 7 days</option>
              <option value="last30">Last 30 days</option>
            </select>
          </div>

          <div>
            <div style={{ fontSize: "0.85rem", marginBottom: 4 }}>
              Auto-refresh
            </div>
            <select
              value={autoRefreshSec}
              onChange={(e) =>
                setAutoRefreshSec(Number(e.target.value))
              }
              className="input"
              style={{ maxWidth: 220 }}
            >
              <option value={0}>Off</option>
              <option value={15}>Every 15 seconds</option>
              <option value={30}>Every 30 seconds</option>
              <option value={60}>Every 1 minute</option>
              <option value={300}>Every 5 minutes</option>
              <option value={900}>Every 15 minutes</option>
              <option value={3600}>Every 1 hour</option>
            </select>
          </div>

          <div style={{ marginLeft: "auto" }}>
            <button
              className="btn btn-secondary"
              onClick={() => user && loadOrders(user.id)}
            >
              Refresh now
            </button>
          </div>
        </div>

        {message && <div className="alert alert-error">{message}</div>}

        {loadingOrders ? (
          <p>Loading orders...</p>
        ) : filteredOrders.length === 0 ? (
          <p>No orders found for the selected filters.</p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            {filteredOrders.map((order) => {
              const restaurantName = getRestaurantName(order.restaurants);
              const orderLabel =
                order.order_number ?? `#${order.id.slice(0, 8)}`;
              const hasInvoice =
                order.invoices && order.invoices.length > 0;
              const effectiveStatus = deriveEffectiveStatus(order);
              const currentStepIndex = STATUS_FLOW.findIndex(
                (s) => s.key === effectiveStatus
              );
              const progressPct =
                currentStepIndex < 0
                  ? 0
                  : (currentStepIndex / (STATUS_FLOW.length - 1)) * 100;

              const restaurantLocation = getRestaurantLocation(order.restaurants);
              const restaurantAddressParts = [
                restaurantLocation?.address,
                restaurantLocation?.city,
                restaurantLocation?.state,
                restaurantLocation?.zip,
              ].filter(Boolean);
              const deliveryAddressParts = [
                order.delivery_address,
                order.delivery_city,
                order.delivery_state,
                order.delivery_zip,
              ].filter(Boolean);
              const distance = calculateDistanceMiles(
                restaurantLocation?.latitude,
                restaurantLocation?.longitude,
                order.delivery_latitude,
                order.delivery_longitude
              );
              const deliveryWithinRadius =
                typeof distance === "number" ? distance <= 30 : null;

              return (
                <div key={order.id} className="card">
                  {/* Timeline */}
                  <div style={{ marginBottom: "0.75rem" }}>
                    <div
                      style={{
                        height: 10,
                        borderRadius: 999,
                        background: "#e5e7eb",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${progressPct}%`,
                          background: "linear-gradient(90deg,#4ade80,#22c55e)",
                          transition: "width 200ms ease",
                        }}
                        aria-hidden
                      />
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${STATUS_FLOW.length}, minmax(0, 1fr))`,
                        gap: 6,
                        marginTop: 6,
                        fontSize: "0.8rem",
                        color: "#6b7280",
                      }}
                    >
                      {STATUS_FLOW.map((step, idx) => {
                        const isReached = currentStepIndex >= idx;
                        return (
                          <div
                            key={step.key}
                            style={{
                              textAlign: idx === STATUS_FLOW.length - 1 ? "right" : "left",
                              fontWeight: isReached ? 700 : 500,
                              color: isReached ? "#111827" : "#9ca3af",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  width: 18,
                                  height: 18,
                                  borderRadius: 999,
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: isReached ? "#22c55e" : "#e5e7eb",
                                  color: isReached ? "white" : "#6b7280",
                                  fontSize: 11,
                                  border: "1px solid #d1d5db",
                                }}
                              >
                                {isReached ? "✓" : idx + 1}
                              </span>
                              <span>{step.label}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* Header */}
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
                        {renderStatusBadge(effectiveStatus)}
                      </div>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "#6b7280",
                          marginTop: 2,
                        }}
                      >
                        Placed:{" "}
                        {new Date(order.created_at).toLocaleString()}
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          marginTop: 4,
                        }}
                      >
                        Restaurant: <strong>{restaurantName}</strong>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: "0.9rem",
                          fontWeight: 600,
                        }}
                      >
                        Total: ${order.total?.toFixed(2) ?? "0.00"}
                      </div>
                      {hasInvoice && (
                        <div
                          style={{
                            fontSize: "0.8rem",
                            marginTop: 4,
                          }}
                        >
                          Invoice:{" "}
                          <strong>
                            {order.invoices[0].is_paid ? "paid" : "unpaid"}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delivery feasibility */}
                  {(deliveryAddressParts.length > 0 ||
                    restaurantAddressParts.length > 0) && (
                    <div
                      style={{
                        margin: "0.5rem 0 0.75rem",
                        padding: "0.75rem",
                        border: "1px solid #e5e7eb",
                        borderRadius: 10,
                        background:
                          effectiveStatus === "owner_accepted"
                            ? "#ecfdf3"
                            : "#f8fafc",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "0.75rem",
                          flexWrap: "wrap",
                          fontSize: "0.9rem",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, marginBottom: 4 }}>
                            Restaurant address
                          </div>
                          <div style={{ color: "#374151" }}>
                            {restaurantAddressParts.length > 0
                              ? restaurantAddressParts.join(", ")
                              : "No address on file"}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontWeight: 800, marginBottom: 4 }}>
                            Delivery address
                          </div>
                          <div style={{ color: "#374151" }}>
                            {deliveryAddressParts.length > 0
                              ? deliveryAddressParts.join(", ")
                              : "No delivery address provided"}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontWeight: 800, marginBottom: 4 }}>
                            Distance check
                          </div>
                          <div
                            style={{
                              color:
                                deliveryWithinRadius === false
                                  ? "#b91c1c"
                                  : "#111827",
                              fontWeight: 700,
                            }}
                          >
                            {typeof distance === "number"
                              ? `${distance} miles`
                              : "Distance unavailable"}
                          </div>
                          <div style={{ color: "#6b7280", marginTop: 2 }}>
                            {deliveryWithinRadius === null
                              ? "Add coordinates to confirm delivery range"
                              : deliveryWithinRadius
                              ? "Within 30-mile delivery radius"
                              : "Outside preferred delivery radius"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

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

                  {/* Items */}
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

                  {/* Status history */}
                  {order.order_status_history &&
                    order.order_status_history.length > 0 && (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: "0.85rem",
                        }}
                      >
                        <strong>Order events</strong>
                        <table
                          style={{
                            width: "100%",
                            marginTop: 6,
                            borderCollapse: "collapse",
                            fontSize: "0.85rem",
                          }}
                        >
                          <thead>
                            <tr>
                              <th
                                style={{
                                  textAlign: "left",
                                  borderBottom: "1px solid #e5e7eb",
                                  paddingBottom: 4,
                                }}
                              >
                                When
                              </th>
                              <th
                                style={{
                                  textAlign: "left",
                                  borderBottom: "1px solid #e5e7eb",
                                  paddingBottom: 4,
                                }}
                              >
                                Status
                              </th>
                              <th
                                style={{
                                  textAlign: "left",
                                  borderBottom: "1px solid #e5e7eb",
                                  paddingBottom: 4,
                                }}
                              >
                                Changed by
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...order.order_status_history]
                              .sort(
                                (a, b) =>
                                  new Date(a.changed_at).getTime() -
                                  new Date(b.changed_at).getTime()
                              )
                              .map((h) => (
                                <tr key={h.id}>
                                  <td style={{ padding: "6px 0" }}>
                                    {new Date(h.changed_at).toLocaleString()}
                                  </td>
                                  <td style={{ padding: "6px 0" }}>
                                    {h.old_status
                                      ? `${formatStatus(h.old_status)} → `
                                      : ""}
                                    <strong>{formatStatus(h.new_status)}</strong>
                                  </td>
                                  <td style={{ padding: "6px 0", color: "#6b7280" }}>
                                    {h.changed_by ?? "System"}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
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
                    {effectiveStatus === "ordered" && (
                      <button
                        className="btn btn-primary"
                        onClick={() => updateStatus(order.id, "owner_accepted")}
                        disabled={actionOrderId === order.id}
                      >
                        {actionOrderId === order.id
                          ? "Updating..."
                          : "Accept order"}
                      </button>
                    )}

                    {effectiveStatus === "owner_accepted" && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => updateStatus(order.id, "customer_accepted")}
                        disabled={actionOrderId === order.id}
                      >
                        {actionOrderId === order.id
                          ? "Updating..."
                          : "Customer accepted"}
                      </button>
                    )}

                    {effectiveStatus === "customer_accepted" && !hasInvoice && (
                      <button
                        className="btn btn-primary"
                        onClick={() => generateInvoice(order)}
                        disabled={actionOrderId === order.id}
                      >
                        {actionOrderId === order.id
                          ? "Generating..."
                          : "Generate invoice"}
                      </button>
                    )}

                    {hasInvoice && !order.invoices[0].is_paid && (
                      <button
                        className="btn btn-secondary"
                        onClick={() =>
                          markInvoicePaid(order.invoices[0].id, order.id)
                        }
                        disabled={actionOrderId === order.id}
                      >
                        {actionOrderId === order.id
                          ? "Updating..."
                          : "Mark invoice paid"}
                      </button>
                    )}

                    {effectiveStatus === "paid" && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => updateStatus(order.id, "scheduled")}
                        disabled={actionOrderId === order.id}
                      >
                        {actionOrderId === order.id
                          ? "Updating..."
                          : "Schedule delivery"}
                      </button>
                    )}

                    {effectiveStatus === "scheduled" && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => updateStatus(order.id, "delivered")}
                        disabled={actionOrderId === order.id}
                      >
                        {actionOrderId === order.id
                          ? "Updating..."
                          : "Mark delivered"}
                      </button>
                    )}

                    {effectiveStatus !== "cancelled" &&
                      effectiveStatus !== "delivered" && (
                        <button
                          className="btn btn-danger"
                          onClick={() => updateStatus(order.id, "cancelled")}
                          disabled={actionOrderId === order.id}
                        >
                          {actionOrderId === order.id
                            ? "Cancelling..."
                            : "Cancel order"}
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
