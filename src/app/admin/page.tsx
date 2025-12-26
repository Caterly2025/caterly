"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";

type Restaurant = {
  id: string;
  name: string;
  description: string | null;
};

type Menu = {
  id: string;
  name: string;
};

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
};

type UserProfile = {
  id: string;
  email: string | null;
  role: string;
};

export default function AdminPage() {
  const { user, loading: authLoading } = useSupabaseUser();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  const [menus, setMenus] = useState<Menu[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // Form state for new restaurant
  const [newRestaurantName, setNewRestaurantName] = useState("");
  const [newRestaurantDescription, setNewRestaurantDescription] = useState("");
  const [newRestaurantOwnerId, setNewRestaurantOwnerId] = useState("");
  const [newRestaurantAddress, setNewRestaurantAddress] = useState("");
  const [newRestaurantCity, setNewRestaurantCity] = useState("");
  const [newRestaurantState, setNewRestaurantState] = useState("");
  const [newRestaurantZip, setNewRestaurantZip] = useState("");
  const [newRestaurantPhone, setNewRestaurantPhone] = useState("");

  // Form state for new menu
  const [newMenuName, setNewMenuName] = useState("");

  // Form state for new menu item
  const [newItemName, setNewItemName] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemPrice, setNewItemPrice] = useState<string>("");

  // 1) Load user profile (role) when authenticated user is available
  useEffect(() => {
    const loadProfile = async () => {
      if (authLoading) return;
      if (!user) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, email, role")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error loading user profile:", error);
        setProfile(null);
      } else {
        setProfile(data as UserProfile);
      }
      setProfileLoading(false);
    };

    void loadProfile();
  }, [authLoading, user]);

  // 2) Load all restaurants on mount (once auth & profile are ready and user is admin)
  useEffect(() => {
    const loadRestaurants = async () => {
      if (authLoading || profileLoading) return;
      if (!user || !profile || profile.role !== "admin") {
        setLoading(false);
        return;
      }

      setLoading(true);
      setMessage(null);

      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, description")
        .order("created_at");

      if (error) {
        console.error(error);
        setMessage("Error loading restaurants.");
        setLoading(false);
        return;
      }

      const list = (data || []) as Restaurant[];
      setRestaurants(list);

      if (list.length > 0) {
        setSelectedRestaurant(list[0]);
      }

      setLoading(false);
    };

    void loadRestaurants();
  }, [authLoading, profileLoading, user, profile]);

  // Load menus when selectedRestaurant changes
  useEffect(() => {
    const loadMenus = async () => {
      if (!selectedRestaurant || !user || !profile || profile.role !== "admin") {
        setMenus([]);
        setSelectedMenu(null);
        setMenuItems([]);
        return;
      }

      const { data, error } = await supabase
        .from("menus")
        .select("id, name")
        .eq("restaurant_id", selectedRestaurant.id)
        .order("created_at");

      if (error) {
        console.error(error);
        setMessage("Error loading menus.");
        return;
      }

      const list = (data || []) as Menu[];
      setMenus(list);

      if (list.length > 0) {
        setSelectedMenu(list[0]);
      } else {
        setSelectedMenu(null);
        setMenuItems([]);
      }
    };

    void loadMenus();
  }, [selectedRestaurant, user, profile]);

  // Load menu items when selectedMenu changes
  useEffect(() => {
    const loadMenuItems = async () => {
      if (!selectedMenu || !user || !profile || profile.role !== "admin") {
        setMenuItems([]);
        return;
      }

      const { data, error } = await supabase
        .from("menu_items")
        .select("id, name, description, price")
        .eq("menu_id", selectedMenu.id)
        .order("name");

      if (error) {
        console.error(error);
        setMessage("Error loading menu items.");
        return;
      }

      setMenuItems((data || []) as MenuItem[]);
    };

    void loadMenuItems();
  }, [selectedMenu, user, profile]);

  // Create a new restaurant
  const createRestaurant = async () => {
    setMessage(null);

    if (!newRestaurantName.trim()) {
      setMessage("Restaurant name is required.");
      return;
    }
    if (!newRestaurantOwnerId.trim()) {
      setMessage("Owner ID (auth.users.id) is required for now.");
      return;
    }
    if (!newRestaurantAddress.trim() || !newRestaurantCity.trim()) {
      setMessage("An address and city are required for delivery.");
      return;
    }
    if (!newRestaurantState.trim() || !newRestaurantZip.trim()) {
      setMessage("State and ZIP/postal code are required for the restaurant.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("restaurants")
        .insert({
          name: newRestaurantName.trim(),
          description: newRestaurantDescription.trim() || null,
          owner_id: newRestaurantOwnerId.trim(),
          image_url: null,
          address: newRestaurantAddress.trim(),
          city: newRestaurantCity.trim(),
          state: newRestaurantState.trim(),
          zip_code: newRestaurantZip.trim(),
          primary_phone: newRestaurantPhone.trim() || null,
        })
        .select("id, name, description")
        .single();

      if (error) {
        console.error(error);
        setMessage(`Failed to create restaurant: ${error.message}`);
        return;
      }

      const created = data as Restaurant;
      setRestaurants((prev) => [...prev, created]);
      setSelectedRestaurant(created);
      setNewRestaurantName("");
      setNewRestaurantDescription("");
      setNewRestaurantAddress("");
      setNewRestaurantCity("");
      setNewRestaurantState("");
      setNewRestaurantZip("");
      setNewRestaurantPhone("");
      setMessage("Restaurant created successfully.");
    } catch (err) {
      console.error(err);
      setMessage("Unexpected error creating restaurant.");
    }
  };

  // Create a new menu for the selected restaurant
  const createMenu = async () => {
    setMessage(null);

    if (!selectedRestaurant) {
      setMessage("Select a restaurant first.");
      return;
    }
    if (!newMenuName.trim()) {
      setMessage("Menu name is required.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("menus")
        .insert({
          name: newMenuName.trim(),
          restaurant_id: selectedRestaurant.id,
        })
        .select("id, name")
        .single();

      if (error) {
        console.error(error);
        setMessage(`Failed to create menu: ${error.message}`);
        return;
      }

      const created = data as Menu;
      setMenus((prev) => [...prev, created]);
      setSelectedMenu(created);
      setNewMenuName("");
      setMessage("Menu created successfully.");
    } catch (err) {
      console.error(err);
      setMessage("Unexpected error creating menu.");
    }
  };

  // Create a new menu item for the selected menu
  const createMenuItem = async () => {
    setMessage(null);

    if (!selectedMenu) {
      setMessage("Select a menu first.");
      return;
    }
    if (!newItemName.trim()) {
      setMessage("Item name is required.");
      return;
    }
    const priceNumber = Number(newItemPrice);
    if (Number.isNaN(priceNumber) || priceNumber <= 0) {
      setMessage("Enter a valid positive price.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("menu_items")
        .insert({
          menu_id: selectedMenu.id,
          name: newItemName.trim(),
          description: newItemDescription.trim() || null,
          price: priceNumber,
          image_url: null,
        })
        .select("id, name, description, price")
        .single();

      if (error) {
        console.error(error);
        setMessage(`Failed to create menu item: ${error.message}`);
        return;
      }

      const created = data as MenuItem;
      setMenuItems((prev) => [...prev, created]);
      setNewItemName("");
      setNewItemDescription("");
      setNewItemPrice("");
      setMessage("Menu item created successfully.");
    } catch (err) {
      console.error(err);
      setMessage("Unexpected error creating menu item.");
    }
  };

  // --- Auth + role gating ---

  if (authLoading || profileLoading) {
    return <div>Checking authentication…</div>;
  }

  if (!user) {
    return (
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1>Admin / Owner – Caterly</h1>
        <p>You must be logged in to use the admin tools.</p>
        <p>
          Go to <a href="/auth">Auth</a> to login or sign up.
        </p>
      </div>
    );
  }

  if (!profile || profile.role !== "admin") {
    return (
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1>Admin – Caterly</h1>
        <p>Your account does not have admin permissions.</p>
        <p>
          Current role: <code>{profile?.role ?? "unknown"}</code>
        </p>
      </div>
    );
  }

  if (loading) {
    return <div>Loading admin view...</div>;
  }

  // --- Main admin UI (admins only) ---

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <h1>Admin – Manage Restaurants &amp; Menus</h1>

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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 2fr 3fr",
          gap: "1.5rem",
          alignItems: "flex-start",
        }}
      >
        {/* Column 1: Restaurants */}
        <div>
          <h2>Restaurants</h2>

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 6,
              padding: "0.75rem",
              marginBottom: "1rem",
              background: "white",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Create new restaurant</h3>
            <div style={{ marginBottom: 8 }}>
              <label>
                Name:
                <input
                  type="text"
                  value={newRestaurantName}
                  onChange={(e) => setNewRestaurantName(e.target.value)}
                  style={{ width: "100%" }}
                />
              </label>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>
                Description:
                <textarea
                  value={newRestaurantDescription}
                  onChange={(e) => setNewRestaurantDescription(e.target.value)}
                  rows={2}
                  style={{ width: "100%" }}
                />
              </label>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>
                Owner ID (auth.users.id):
                <input
                  type="text"
                  value={newRestaurantOwnerId}
                  onChange={(e) => setNewRestaurantOwnerId(e.target.value)}
                  placeholder="e.g. 11111111-1111-1111-1111-111111111111"
                  style={{ width: "100%" }}
                />
              </label>
              <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                Paste a valid user id from <strong>Auth → Users</strong>, or reuse a seeded ID.
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>
                Street address:
                <input
                  type="text"
                  value={newRestaurantAddress}
                  onChange={(e) => setNewRestaurantAddress(e.target.value)}
                  style={{ width: "100%" }}
                  placeholder="123 Main St"
                />
              </label>
            </div>
            <div
              style={{
                display: "grid",
                gap: 8,
                gridTemplateColumns: "2fr 1fr 1fr",
                marginBottom: 8,
              }}
            >
              <label>
                City:
                <input
                  type="text"
                  value={newRestaurantCity}
                  onChange={(e) => setNewRestaurantCity(e.target.value)}
                  style={{ width: "100%" }}
                />
              </label>
              <label>
                State:
                <input
                  type="text"
                  value={newRestaurantState}
                  onChange={(e) => setNewRestaurantState(e.target.value)}
                  style={{ width: "100%" }}
                  placeholder="CA"
                />
              </label>
              <label>
                ZIP:
                <input
                  type="text"
                  value={newRestaurantZip}
                  onChange={(e) => setNewRestaurantZip(e.target.value)}
                  style={{ width: "100%" }}
                  placeholder="94016"
                />
              </label>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>
                Primary phone:
                <input
                  type="text"
                  value={newRestaurantPhone}
                  onChange={(e) => setNewRestaurantPhone(e.target.value)}
                  style={{ width: "100%" }}
                  placeholder="+1 555-555-0123"
                />
              </label>
            </div>
            <button type="button" onClick={createRestaurant}>
              Create Restaurant
            </button>
          </div>

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 6,
              padding: "0.75rem",
              background: "white",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Existing restaurants</h3>
            {restaurants.length === 0 ? (
              <p>No restaurants yet.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0 }}>
                {restaurants.map((r) => (
                  <li key={r.id} style={{ marginBottom: 6 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRestaurant(r);
                        setSelectedMenu(null);
                        setMenuItems([]);
                      }}
                      style={{
                        padding: "0.4rem 0.6rem",
                        borderRadius: 4,
                        border:
                          selectedRestaurant?.id === r.id
                            ? "2px solid #111827"
                            : "1px solid #d1d5db",
                        backgroundColor:
                          selectedRestaurant?.id === r.id
                            ? "#e5e7eb"
                            : "white",
                        width: "100%",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      {r.description && (
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "#6b7280",
                          }}
                        >
                          {r.description}
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Column 2: Menus */}
        <div>
          <h2>Menus</h2>

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 6,
              padding: "0.75rem",
              marginBottom: "1rem",
              background: "white",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Create new menu</h3>
            {!selectedRestaurant ? (
              <p>Select a restaurant first.</p>
            ) : (
              <>
                <div style={{ marginBottom: 8 }}>
                  <label>
                    Menu name:
                    <input
                      type="text"
                      value={newMenuName}
                      onChange={(e) => setNewMenuName(e.target.value)}
                      style={{ width: "100%" }}
                    />
                  </label>
                </div>
                <button type="button" onClick={createMenu}>
                  Create Menu
                </button>
              </>
            )}
          </div>

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 6,
              padding: "0.75rem",
              background: "white",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Existing menus</h3>
            {!selectedRestaurant ? (
              <p>Select a restaurant to see menus.</p>
            ) : menus.length === 0 ? (
              <p>No menus yet for this restaurant.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0 }}>
                {menus.map((m) => (
                  <li key={m.id} style={{ marginBottom: 6 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMenu(m);
                      }}
                      style={{
                        padding: "0.4rem 0.6rem",
                        borderRadius: 4,
                        border:
                          selectedMenu?.id === m.id
                            ? "2px solid #111827"
                            : "1px solid #d1d5db",
                        backgroundColor:
                          selectedMenu?.id === m.id ? "#e5e7eb" : "white",
                        width: "100%",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{m.name}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Column 3: Menu Items */}
        <div>
          <h2>Menu items</h2>

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 6,
              padding: "0.75rem",
              marginBottom: "1rem",
              background: "white",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Create new item</h3>
            {!selectedMenu ? (
              <p>Select a menu first.</p>
            ) : (
              <>
                <div style={{ marginBottom: 8 }}>
                  <label>
                    Name:
                    <input
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      style={{ width: "100%" }}
                    />
                  </label>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label>
                    Description:
                    <textarea
                      value={newItemDescription}
                      onChange={(e) => setNewItemDescription(e.target.value)}
                      rows={2}
                      style={{ width: "100%" }}
                    />
                  </label>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label>
                    Price:
                    <input
                      type="number"
                      step="0.01"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      style={{ width: "100%" }}
                    />
                  </label>
                </div>
                <button type="button" onClick={createMenuItem}>
                  Create Item
                </button>
              </>
            )}
          </div>

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 6,
              padding: "0.75rem",
              background: "white",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Existing items</h3>
            {!selectedMenu ? (
              <p>Select a menu to see items.</p>
            ) : menuItems.length === 0 ? (
              <p>No items yet for this menu.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0 }}>
                {menuItems.map((item) => (
                  <li
                    key={item.id}
                    style={{
                      borderBottom: "1px solid #e5e7eb",
                      padding: "0.5rem 0",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    {item.description && (
                      <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                        {item.description}
                      </div>
                    )}
                    <div>${item.price.toFixed(2)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
