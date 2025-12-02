"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";

type RestaurantRef =
  | { name: string }
  | { name: string }[]
  | null;

type OrderSingle = {
  id: string;
  status: string;
  created_at: string;
  restaurants: RestaurantRef;
};

type OrderRef = OrderSingle | OrderSingle[] | null;

type InvoiceRow = {
  id: string;
  total: number | null;
  is_paid: boolean | null;
  created_at: string;
  orders: OrderRef;
};

export default function CustomerInvoicesPage() {
  const { user, loading: authLoading } = useSupabaseUser();

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadInvoices = async () => {
      if (authLoading) return;
      if (!user) {
        setLoadingInvoices(false);
        return;
      }

      setLoadingInvoices(true);
      setMessage(null);

      const { data, error } = await supabase
        .from("invoices")
        .select(
          `
          id,
          total,
          is_paid,
          created_at,
          orders (
            id,
            status,
            created_at,
            restaurants ( name ),
            customer_id
          )
        `
        )
        .eq("orders.customer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading invoices:", error);
        setMessage("Error loading your invoices.");
        setLoadingInvoices(false);
        return;
      }

      setInvoices((data || []) as unknown as InvoiceRow[]);
      setLoadingInvoices(false);
    };

    void loadInvoices();
  }, [authLoading, user]);

  if (authLoading) {
    return <div>Checking authentication...</div>;
  }

  if (!user) {
    return (
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1>My Invoices – Caterly</h1>
        <p>You must be logged in to see your invoices.</p>
        <p>
          Go to <a href="/auth">Auth</a> to login or sign up.
        </p>
      </div>
    );
  }

  const getOrder = (ord: OrderRef) => {
    if (!ord) return null;
    if (Array.isArray(ord)) return ord[0] ?? null;
    return ord;
  };

  const getRestaurantName = (r: RestaurantRef) => {
    if (!r) return "Unknown restaurant";
    if (Array.isArray(r)) return r[0]?.name ?? "Unknown restaurant";
    return r.name;
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <h1>My Invoices</h1>

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

      {loadingInvoices ? (
        <p>Loading your invoices...</p>
      ) : invoices.length === 0 ? (
        <p>You don’t have any invoices yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {invoices.map((inv) => {
            const order = getOrder(inv.orders);
            const restaurantName = order
              ? getRestaurantName(order.restaurants)
              : "Unknown restaurant";

            return (
              <div
                key={inv.id}
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
                    <strong>Invoice #{inv.id.slice(0, 8)}</strong>
                    <div style={{ fontSize: "0.8rem", color: "#666" }}>
                      Created at:{" "}
                      {new Date(inv.created_at).toLocaleString()}
                    </div>
                    {order && (
                      <div style={{ fontSize: "0.85rem", marginTop: 4 }}>
                        Order:{" "}
                        <strong>{order.id.slice(0, 8)}</strong>{" "}
                        ({order.status})
                      </div>
                    )}
                    <div style={{ fontSize: "0.85rem", marginTop: 4 }}>
                      Restaurant: <strong>{restaurantName}</strong>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div>
                      <span>Status: </span>
                      <strong>{inv.is_paid ? "paid" : "unpaid"}</strong>
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <strong>
                        Amount: ${inv.total?.toFixed(2) ?? "0.00"}
                      </strong>
                    </div>
                    <div style={{ fontSize: "0.8rem", marginTop: 4 }}>
                      Payment: offline
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
