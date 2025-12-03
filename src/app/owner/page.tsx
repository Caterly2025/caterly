"use client";

import { useEffect, useMemo, useState } from "react";
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

type InvoiceRow = {
  id: string;
  total: number | null;
  is_paid: boolean | null;
  created_at: string;
};

type OrderStatusHistoryRow = {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_at: string;
};

type OrderRow = {
  id: string;
  status: string;
  special_request: string | null;
  total: number | null;
  created_at: string;
  order_items: OrderItemRow[];
  invoices: InvoiceRow[];
  order_status_history: OrderStatusHistoryRow[]; 
};

type Restaurant = {
  id: string;
  name: string;
  description: string | null;
};





const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending owner review" },
  { value: "owner_review", label: "Approved by owner" },
  { value: "changes_requested", label: "Changes requested" },
  { value: "customer_accepted", label: "Accepted by customer" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const DATE_RANGE_OPTIONS = [
  { value: "all", label: "All dates" },
  { value: "today", label: "Today" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
];

const REFRESH_INTERVAL_OPTIONS = [
  { value: 15, label: "Every 15 seconds" },
  { value: 30, label: "Every 30 seconds" },
  { value: 60, label: "Every 1 minute" },
  { value: 300, label: "Every 5 minutes" },
  { value: 900, label: "Every 15 minutes" },
  { value: 3600, label: "Every 1 hour" },
];

const formatStatus = (status: string) => {
  switch (status) {
    case "pending":
      return "Pending owner review";
    case "owner_review":
      return "Approved by owner";
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

const formatDateLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  if (sameDay) {
    return `Today – ${d.toLocaleDateString()}`;
  }

  return d.toLocaleDateString();
};

const getDateFromFilter = (range: string) => {
  const now = new Date();
  const start = new Date(now);

  switch (range) {
    case "today": {
      start.setHours(0, 0, 0, 0);
      return start.toISOString();
    }
    case "last7": {
      start.setDate(start.getDate() - 7);
      return start.toISOString();
    }
    case "last30": {
      start.setDate(start.getDate() - 30);
      return start.toISOString();
    }
    default:
      return null; // all dates
  }
};

export default function OwnerPage() {
  const { user, loading: authLoading } = useSupabaseUser();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [invoiceLoadingId, setInvoiceLoadingId] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");

  // Auto-refresh (seconds)
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(300);

  // ─────────────────────────────────────
  // Load restaurants owned by this user
  // ─────────────────────────────────────
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

  // ─────────────────────────────────────
  // Load orders helper
  // ─────────────────────────────────────
  const loadOrders = async (
    restaurantId: string,
    currentStatusFilter: string,
    currentDateRangeFilter: string
  ) => {
    if (!user || !restaurantId) return;

    setLoadingOrders(true);
    setMessage(null);

  let query = supabase
    .from("orders")
    .select(
      `
      id,
      status,
      special_request,
      total,
      created_at,
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

      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    if (currentStatusFilter !== "all") {
      query = query.eq("status", currentStatusFilter);
    }

    if (currentDateRangeFilter !== "all") {
      const from = getDateFromFilter(currentDateRangeFilter);
      if (from) {
        query = query.gte("created_at", from);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading orders:", error);
      setMessage("Error loading orders.");
      setLoadingOrders(false);
      return;
    }

    setOrders((data || []) as unknown as OrderRow[]);
    setLoadingOrders(false);
  };

  // Initial + filter-driven load
  useEffect(() => {
    if (!user || !selectedRestaurant) return;
    void loadOrders(selectedRestaurant.id, statusFilter, dateRangeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedRestaurant, statusFilter, dateRangeFilter]);

  // Auto-refresh every N seconds
  useEffect(() => {
    if (!user || !selectedRestaurant) return;

    const intervalId = setInterval(() => {
      void loadOrders(selectedRestaurant.id, statusFilter, dateRangeFilter);
    }, refreshIntervalSec * 1000);

    return () => clearInterval(intervalId);
  }, [user, selectedRestaurant, refreshIntervalSec, statusFilter, dateRangeFilter]);

  const manualRefresh = () => {
    if (!user || !selectedRestaurant) return;
    void loadOrders(selectedRestaurant.id, statusFilter, dateRangeFilter);
  };

  // ─────────────────────────────────────
  // Status update + invoice generation
  // ─────────────────────────────────────
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
      await loadOrders(selectedRestaurant.id, statusFilter, dateRangeFilter);
    }
  };

  const generateInvoice = async (order: OrderRow) => {
    if (!selectedRestaurant) return;

    if (order.status !== "customer_accepted") {
      setMessage("Invoice can only be created after customer acceptance.");
      return;
    }

    // If an invoice already exists, do nothing
    if (order.invoices && order.invoices.length > 0) {
      setMessage("Invoice already exists for this order.");
      return;
    }

    setInvoiceLoadingId(order.id);
    setMessage(null);

    try {
      // Prefer stored total; if null, compute from items as fallback
      const amount =
        order.total ??
        order.order_items.reduce(
          (sum, oi) => sum + oi.price * oi.quantity,
          0
        );

      const { error } = await supabase.from("invoices").insert({
        order_id: order.id,
        total: amount,
        is_paid: false,
      });

      if (error) {
        console.error("Error inserting invoice:", error);
        setMessage("Failed to create invoice.");
      } else {
        setMessage("Invoice created.");
        await loadOrders(selectedRestaurant.id, statusFilter, dateRangeFilter);
      }
    } catch (err) {
      console.error(err);
      setMessage("Unexpected error creating invoice.");
    } finally {
      setInvoiceLoadingId(null);
    }
  };

  const getItemName = (m: OrderItemRow["menu_items"]) => {
    if (!m) return "Unknown item";
    if (Array.isArray(m)) return m[0]?.name ?? "Unknown item";
    return m.name;
  };

  // ─────────────────────────────────────
  // Grouping: Day → Status (restaurant is already selected)
  // ─────────────────────────────────────
  const grouped = useMemo(() => {
    const byDay: Record<
      string,
      {
        dateLabel: string;
        orders: OrderRow[];
      }
    > = {};

    for (const o of orders) {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      if (!byDay[key]) {
        byDay[key] = {
          dateLabel: formatDateLabel(o.created_at),
          orders: [],
        };
      }
      byDay[key].orders.push(o);
    }

    const dayEntries = Object.entries(byDay).sort(([aKey], [bKey]) =>
      aKey < bKey ? 1 : -1
    );

    return dayEntries.map(([dayKey, { dateLabel, orders }]) => {
      const byStatus: Record<string, OrderRow[]> = {};
      for (const o of orders) {
        if (!byStatus[o.status]) byStatus[o.status] = [];
        byStatus[o.status].push(o);
      }

      const statusEntries = Object.entries(byStatus).sort(
        ([aStatus], [bStatus]) => aStatus.localeCompare(bStatus)
      );

      return {
        dayKey,
        dateLabel,
        statuses: statusEntries.map(([status, ordersInStatus]) => ({
          status,
          label: formatStatus(status),
          orders: ordersInStatus,
        })),
      };
    });
  }, [orders]);

  // ─────────────────────────────────────
  // Auth gating & render
  // ─────────────────────────────────────
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
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
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

      {/* Restaurant selector + filters */}
      <div
        style={{
          marginBottom: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        <div>
          <h2>Your restaurants</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
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
          <div style={{ fontSize: "0.9rem", color: "#374151" }}>
            Managing: <strong>{selectedRestaurant.name}</strong>
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            alignItems: "center",
          }}
        >
          <label style={{ fontSize: "0.9rem" }}>
            Status:
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ marginLeft: 4 }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label style={{ fontSize: "0.9rem" }}>
            Date range:
            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              style={{ marginLeft: 4 }}
            >
              {DATE_RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label style={{ fontSize: "0.9rem" }}>
            Auto-refresh:
            <select
              value={refreshIntervalSec}
              onChange={(e) => setRefreshIntervalSec(Number(e.target.value))}
              style={{ marginLeft: 4 }}
            >
              {REFRESH_INTERVAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <button type="button" onClick={manualRefresh}>
            Refresh now
          </button>
        </div>
      </div>

      {/* Orders grouped by Day → Status */}
      <h2>Orders</h2>
      {loadingOrders ? (
        <p>Loading orders...</p>
      ) : orders.length === 0 ? (
        <p>No orders match the current filters.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {grouped.map((dayGroup) => (
            <div
              key={dayGroup.dayKey}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: "0.75rem 1rem",
                background: "#f9fafb",
              }}
            >
              <h3 style={{ margin: "0 0 0.5rem 0" }}>{dayGroup.dateLabel}</h3>

              {dayGroup.statuses.map((statusGroup) => (
                <div key={statusGroup.status} style={{ marginBottom: "0.75rem" }}>
                  <h4
                    style={{
                      margin: "0.25rem 0 0.25rem 0",
                      fontSize: "0.95rem",
                      color: "#374151",
                    }}
                  >
                    {statusGroup.label}{" "}
                    <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                      ({statusGroup.orders.length})
                    </span>
                  </h4>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                    }}
                  >
                    {statusGroup.orders.map((order) => {
                      const invoice = order.invoices?.[0] ?? null;
                      const canGenerateInvoice =
                        !invoice && order.status === "customer_accepted";

                      return (
                        <div
                          key={order.id}
                          style={{
                            border: "1px solid #ddd",
                            borderRadius: 6,
                            padding: "0.75rem",
                            background: "white",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 4,
                            }}
                          >
                            <div>
                              <strong>Order #{order.id.slice(0, 8)}</strong>
                              <div
                                style={{
                                  fontSize: "0.8rem",
                                  color: "#666",
                                }}
                              >
                                Placed at:{" "}
                                {new Date(
                                  order.created_at
                                ).toLocaleTimeString()}
                              </div>
                              {invoice && (
                                <div
                                  style={{
                                    fontSize: "0.85rem",
                                    marginTop: 4,
                                  }}
                                >
                                  Invoice:{" "}
                                  <strong>{invoice.id.slice(0, 8)}</strong>{" "}
                                  ({invoice.is_paid ? "paid" : "unpaid"})
                                </div>
                              )}
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div>
                                <span>Status: </span>
                                <strong>{formatStatus(order.status)}</strong>
                              </div>
                              <div style={{ marginTop: 4 }}>
                                <strong>
                                  Total: ${order.total?.toFixed(2) ?? "0.00"}
                                </strong>
                              </div>
                            </div>
                          </div>

                          {order.special_request && (
                            <div style={{ marginBottom: 6 }}>
                              <strong>Special request:</strong>{" "}
                              {order.special_request}
                            </div>
                          )}

                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                              marginBottom: 6,
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
                                  <td style={{ padding: "3px 0" }}>
                                    {getItemName(oi.menu_items)}
                                  </td>
                                  <td
                                    style={{
                                      padding: "3px 0",
                                      textAlign: "right",
                                    }}
                                  >
                                    {oi.quantity}
                                  </td>
                                  <td
                                    style={{
                                      padding: "3px 0",
                                      textAlign: "right",
                                    }}
                                  >
                                    ${oi.price.toFixed(2)}
                                  </td>
                                  <td
                                    style={{
                                      padding: "3px 0",
                                      textAlign: "right",
                                    }}
                                  >
                                    {(oi.price * oi.quantity).toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: "0.75rem",
                              flexWrap: "wrap",
                            }}
                          >
                            <div>
                              <strong>Total:</strong>{" "}
                              ${order.total?.toFixed(2) ?? "0.00"}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: "0.5rem",
                                flexWrap: "wrap",
                              }}
                            >
                              <button
                                onClick={() =>
                                  updateStatus(order.id, "owner_review")
                                }
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
                              <button
                                onClick={() => generateInvoice(order)}
                                disabled={
                                  !canGenerateInvoice ||
                                  invoiceLoadingId === order.id
                                }
                              >
                                {invoice
                                  ? invoice.is_paid
                                    ? "Invoice paid"
                                    : "Invoice created"
                                  : invoiceLoadingId === order.id
                                  ? "Creating..."
                                  : order.status !== "customer_accepted"
                                  ? "Wait for acceptance"
                                  : "Generate invoice"}
                              </button>
                            </div>

                            {/* Status history timeline */}
                            {order.order_status_history && order.order_status_history.length > 0 && (
                              <div style={{ marginBottom: 8, fontSize: "0.85rem" }}>
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
      )}
    </div>
  );
}
