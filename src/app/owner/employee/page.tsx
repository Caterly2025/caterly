// src/app/owner/employees/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";

type EmployeeRow = {
  id: string;
  employee_email: string;
  employee_name: string;
  employee_phone: string | null;
  created_at: string;
};

type RestaurantWithEmployees = {
  id: string;
  name: string;
  restaurant_employees: EmployeeRow[];
};

export default function OwnerEmployeesPage() {
  const { user, loading: authLoading } = useSupabaseUser();

  const [restaurants, setRestaurants] = useState<RestaurantWithEmployees[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // Form state for adding an employee – per restaurant
  const [employeeName, setEmployeeName] = useState<Record<string, string>>({});
  const [employeeEmail, setEmployeeEmail] = useState<Record<string, string>>({});
  const [employeePhone, setEmployeePhone] = useState<Record<string, string>>({});
  const [savingForRestaurant, setSavingForRestaurant] = useState<string | null>(null);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null);

  const loadRestaurants = async (ownerId: string) => {
    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase
      .from("restaurants")
      .select(
        `
        id,
        name,
        restaurant_employees (
          id,
          employee_email,
          employee_name,
          employee_phone,
          created_at
        )
      `
      )
      .eq("owner_id", ownerId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error loading restaurants employees:", error);
      setMessage("Error loading employees.");
      setRestaurants([]);
      setLoading(false);
      return;
    }

    setRestaurants((data || []) as RestaurantWithEmployees[]);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setRestaurants([]);
      setLoading(false);
      return;
    }
    void loadRestaurants(user.id);
  }, [authLoading, user]);

  const handleAddEmployee = async (restaurantId: string) => {
    if (!user) return;

    const name = employeeName[restaurantId]?.trim();
    const email = employeeEmail[restaurantId]?.trim();
    const phone = employeePhone[restaurantId]?.trim() || null;

    setMessage(null);

    if (!name || !email) {
      setMessage("Name and email are required for employees.");
      return;
    }

    setSavingForRestaurant(restaurantId);

    const { error } = await supabase.from("restaurant_employees").insert({
      restaurant_id: restaurantId,
      employee_name: name,
      employee_email: email,
      employee_phone: phone,
    });

    if (error) {
      console.error("Error adding employee:", error);
      setMessage("Error adding employee: " + error.message);
      setSavingForRestaurant(null);
      return;
    }

    // Clear form for that restaurant
    setEmployeeName((prev) => ({ ...prev, [restaurantId]: "" }));
    setEmployeeEmail((prev) => ({ ...prev, [restaurantId]: "" }));
    setEmployeePhone((prev) => ({ ...prev, [restaurantId]: "" }));

    await loadRestaurants(user.id);
    setSavingForRestaurant(null);
  };

  const handleRemoveEmployee = async (employeeId: string) => {
    if (!user) return;
    setDeletingEmployeeId(employeeId);
    setMessage(null);

    const { error } = await supabase
      .from("restaurant_employees")
      .delete()
      .eq("id", employeeId);

    if (error) {
      console.error("Error removing employee:", error);
      setMessage("Error removing employee: " + error.message);
      setDeletingEmployeeId(null);
      return;
    }

    await loadRestaurants(user.id);
    setDeletingEmployeeId(null);
  };

  if (authLoading) {
    return <div>Checking authentication...</div>;
  }

  if (!user) {
    return (
      <div className="page">
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div className="card">
            <h1 className="page-title">Employees – Caterly</h1>
            <p className="page-subtitle">
              You must be logged in as an owner to manage employees.
            </p>
            <p>
              Go to <a href="/auth/owner">Owner Auth</a> to login or sign up.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <h1 className="page-title">Employees</h1>
        <p className="page-subtitle">
          Add or remove staff who will handle orders for your restaurants.
        </p>

        {message && <div className="alert alert-error">{message}</div>}

        {loading ? (
          <p>Loading your restaurants and employees...</p>
        ) : restaurants.length === 0 ? (
          <div className="card">
            <p>
              You don&apos;t have any restaurants set up yet. First create a
              restaurant in the owner onboarding flow.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {restaurants.map((r) => (
              <div key={r.id} className="card">
                <h2
                  style={{
                    fontSize: "1.05rem",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                  }}
                >
                  {r.name}
                </h2>

                {/* Existing employees */}
                {r.restaurant_employees.length === 0 ? (
                  <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>
                    No employees added yet.
                  </p>
                ) : (
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "0.9rem",
                      marginBottom: "0.75rem",
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
                          Name
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            borderBottom: "1px solid #e5e7eb",
                            paddingBottom: 4,
                          }}
                        >
                          Email
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            borderBottom: "1px solid #e5e7eb",
                            paddingBottom: 4,
                          }}
                        >
                          Phone
                        </th>
                        <th
                          style={{
                            textAlign: "right",
                            borderBottom: "1px solid #e5e7eb",
                            paddingBottom: 4,
                          }}
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.restaurant_employees.map((e) => (
                        <tr key={e.id}>
                          <td style={{ padding: "4px 0" }}>{e.employee_name}</td>
                          <td style={{ padding: "4px 0" }}>{e.employee_email}</td>
                          <td style={{ padding: "4px 0" }}>
                            {e.employee_phone || "—"}
                          </td>
                          <td
                            style={{
                              padding: "4px 0",
                              textAlign: "right",
                            }}
                          >
                            <button
                              className="btn btn-danger"
                              style={{ fontSize: "0.8rem" }}
                              onClick={() => handleRemoveEmployee(e.id)}
                              disabled={deletingEmployeeId === e.id}
                            >
                              {deletingEmployeeId === e.id
                                ? "Removing..."
                                : "Remove"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Add employee form */}
                <div
                  style={{
                    borderTop: "1px solid #e5e7eb",
                    marginTop: "0.75rem",
                    paddingTop: "0.75rem",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      marginBottom: "0.5rem",
                    }}
                  >
                    Add employee
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.75rem",
                    }}
                  >
                    <div style={{ flex: "1 1 200px" }}>
                      <label className="form-label">Name</label>
                      <input
                        className="input"
                        value={employeeName[r.id] || ""}
                        onChange={(e) =>
                          setEmployeeName((prev) => ({
                            ...prev,
                            [r.id]: e.target.value,
                          }))
                        }
                        placeholder="Employee full name"
                      />
                    </div>
                    <div style={{ flex: "1 1 220px" }}>
                      <label className="form-label">Email</label>
                      <input
                        className="input"
                        type="email"
                        value={employeeEmail[r.id] || ""}
                        onChange={(e) =>
                          setEmployeeEmail((prev) => ({
                            ...prev,
                            [r.id]: e.target.value,
                          }))
                        }
                        placeholder="person@example.com"
                      />
                    </div>
                    <div style={{ flex: "1 1 180px" }}>
                      <label className="form-label">Phone (optional)</label>
                      <input
                        className="input"
                        value={employeePhone[r.id] || ""}
                        onChange={(e) =>
                          setEmployeePhone((prev) => ({
                            ...prev,
                            [r.id]: e.target.value,
                          }))
                        }
                        placeholder="+1 555-123-4567"
                      />
                    </div>
                  </div>

                  <div className="button-row">
                    <button
                      className="btn btn-primary"
                      onClick={() => handleAddEmployee(r.id)}
                      disabled={savingForRestaurant === r.id}
                    >
                      {savingForRestaurant === r.id
                        ? "Adding..."
                        : "Add Employee"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
