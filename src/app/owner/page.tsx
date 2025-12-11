"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { useNotifications } from "@/hooks/useNotifications";

// -------- Types --------

type RestaurantRef =
  | { id: string; name: string }
  | { id: string; name: string }[]
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
};

// -------- Helpers --------

const ALL_STATUSES = [
  "pending",
  "owner_review",
  "changes_requested",
  "customer_accepted",
  "completed",
  "cancelled",
] as const;

type StatusType = (typeof ALL_STATUSES)[number];

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

const getRestaurantName = (r: RestaurantRef): { id: string | null; name: string } => {
  if (!r) return { id: null, name: "Unknown restaurant" };
  if (Array.isArray(r)) {
    const first = r[0];
    if (!first) return { id: null, name: "Unknown restaurant" };
    return { id: first.id, name: first.name };
  }
  return { id: r.id, name: r.name };
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
      return "ℹ️";
  }
};

// Date range helper
type DateRangeFilter = "all" | "today" | "last7" | "last30";

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

// Group by Restaurant -> Day -> Status
type GroupedOrders = {
  restaurantId: string | null;
  restaurantName: string;
  days: {
    dayKey: string; // YYYY-MM-DD
    dayLabel: string;
    statuses: {
      status: string;
      orders: OrderRow[];
    }[];
  }[];
};

const groupOrders = (orders: OrderRow[]): GroupedOrders[] => {
  const map = new Map<string | null, { restaurantName: string; orders: OrderRow[] }>();

  for (const order of orders) {
    const { id: restaurantId, name } = getRestaurantName(order.restaurants);
    const key = restaurantId;
    const entry = map.get(key);
    if (!entry) {
      map.set(key, { restaurantName: name, orders: [order] });
    } else {
      entry.orders.push(order);
    }
  }

  const result: GroupedOrders[] = [];

  for (const [restaurantId, value] of map.entries()) {
    const dayMap = new Map<string, OrderRow[]>();

    for (const order of value.orders) {
      const d = new Date(order.created_at);
      const dayKey = d.toISOString().slice(0, 10); // YYYY-MM-DD
      const arr = dayMap.get(dayKey);
      if (!arr) {
        dayMap.set(dayKey, [order]);
      } else {
        arr.push(order);
      }
    }

    const days = Array.from(dayMap.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1)) // latest date first
      .map(([dayKey, dayOrders]) => {
        // group by status
        const statusMap = new Map<string, OrderRow[]>();
        for (const o of dayOrders) {
          const s = o.status;
          const arr = statusMap.get(s);
          if (!arr) statusMap.set(s, [o]);
          else arr.push(o);
        }

        const statuses = Array.from(statusMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([status, stsOrders]) => ({
            status,
            orders: stsOrders,
          }));

        const dateLabel = new Date(dayKey + "T00:00:00Z").toLocaleDateString();

        return {
          dayKey,
          dayLabel: dateLabel,
          statuses,
        };
      });

    result.push({
      restaurantId,
      restaurantName: value.restaurantName,
      days,
    });
  }

  // sort restaurants by name
  result.sort((a, b) => a.restaurantName.localeCompare(b.restaurantName));

  return result;
};

// -------- Component --------

export default function OwnerPage() {
  const { user, loading: authLoading } = useSupabaseUser();

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<"all" | StatusType>("all");
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(300); // default 5 min

  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    markAllRead,
  } = useNotifications("owner");

  // ---- Load orders ----

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
          owner_id
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
        )
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

  // ---- Actions ----

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

    await loadOrders(user.id);
    setActionOrderId(null);
  };

  // ---- Auth states ----

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

  // ---- Filters applied in-memory ----

  const filteredOrders = useMemo(
    () =>
      orders.filter((o) => {
        if (statusFilter !== "all" && o.status !== statusFilter) {
          return false;
        }
        if (!isWithinRange(o.created_at, dateRange)) {
          return false;
        }
        return true;
      }),
    [orders, statusFilter, dateRange]
  );

  const grouped = useMemo(() => groupOrders(filteredOrders), [filteredOrders]);

  // ---- JSX ----

  return (
    <div className="page">
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 className="page-title">Owner View – Caterly</h1>

        {/* Manage employees */}
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
            
            <strong>Employee Management</strong>            
          <a href="/owner/employees">Manage Employees</a>
          <hr />
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
                  <span>{getNotificationIcon(n.event)}</span>
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
          grouped.map((group) => (
            <div key={group.restaurantId ?? "none"} style={{ marginBottom: "1.25rem" }}>
              <h2
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  marginBottom: "0.5rem",
                }}
              >
                {group.restaurantName}
              </h2>

              {group.days.map((day) => (
                <div key={day.dayKey} style={{ marginBottom: "0.75rem" }}>
                  <h3
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      marginBottom: "0.25rem",
                    }}
                  >
                    {day.dayLabel}
                  </h3>

                  {day.statuses.map((block) => (
                    <div key={block.status} style={{ marginBottom: "0.5rem" }}>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          marginBottom: "0.25rem",
                          color: "#4b5563",
                        }}
                      >
                        {formatStatus(block.status)}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.5rem",
                        }}
                      >
                        {block.orders.map((order) => {
                          const { name: restName } = getRestaurantName(
                            order.restaurants
                          );
                          const orderLabel =
                            order.order_number ?? `#${order.id.slice(0, 8)}`;
                          const hasInvoice =
                            order.invoices && order.invoices.length > 0;

                          return (
                            <div key={order.id} className="card">
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
                                    <strong>
                                      Order {orderLabel}
                                    </strong>
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
                                    <strong>{restName}</strong>
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
                                  {hasInvoice && (
                                    <div
                                      style={{
                                        fontSize: "0.8rem",
                                        marginTop: 4,
                                      }}
                                    >
                                      Invoice:{" "}
                                      <strong>
                                        {order.invoices[0].is_paid
                                          ? "paid"
                                          : "unpaid"}
                                      </strong>
                                    </div>
                                  )}
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
                                        {getMenuItemName(
                                          item.menu_items
                                        )}
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
                                {/* Mark as reviewed */}
                                {order.status === "pending" && (
                                  <button
                                    className="btn btn-primary"
                                    onClick={() =>
                                      updateStatus(
                                        order.id,
                                        "owner_review"
                                      )
                                    }
                                    disabled={
                                      actionOrderId === order.id
                                    }
                                  >
                                    {actionOrderId === order.id
                                      ? "Updating..."
                                      : "Mark as Reviewed"}
                                  </button>
                                )}

                                {/* Request changes */}
                                {(order.status === "pending" ||
                                  order.status ===
                                    "owner_review") && (
                                  <button
                                    className="btn btn-secondary"
                                    onClick={() =>
                                      updateStatus(
                                        order.id,
                                        "changes_requested"
                                      )
                                    }
                                    disabled={
                                      actionOrderId === order.id
                                    }
                                  >
                                    {actionOrderId === order.id
                                      ? "Updating..."
                                      : "Request Changes"}
                                  </button>
                                )}

                                {/* Mark completed */}
                                {order.status ===
                                  "customer_accepted" && (
                                  <button
                                    className="btn btn-secondary"
                                    onClick={() =>
                                      updateStatus(
                                        order.id,
                                        "completed"
                                      )
                                    }
                                    disabled={
                                      actionOrderId === order.id
                                    }
                                  >
                                    {actionOrderId === order.id
                                      ? "Updating..."
                                      : "Mark Completed"}
                                  </button>
                                )}

                                {/* Generate invoice */}
                                {order.status ===
                                  "customer_accepted" &&
                                  !hasInvoice && (
                                    <button
                                      className="btn btn-primary"
                                      onClick={() =>
                                        generateInvoice(order)
                                      }
                                      disabled={
                                        actionOrderId === order.id
                                      }
                                    >
                                      {actionOrderId === order.id
                                        ? "Generating..."
                                        : "Generate Invoice"}
                                    </button>
                                  )}

                                {/* Cancel */}
                                {order.status !== "cancelled" &&
                                  order.status !== "completed" && (
                                    <button
                                      className="btn btn-danger"
                                      onClick={() =>
                                        updateStatus(
                                          order.id,
                                          "cancelled"
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
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
