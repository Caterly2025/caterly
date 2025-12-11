"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function OwnerOnboarding() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");

  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setLoading(false);
    };
    getUser();
  }, []);

  useEffect(() => {
    const checkRestaurant = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (data?.id) router.push("/owner");
    };

    if (user) checkRestaurant();
  }, [user]);

  const handleCreateRestaurant = async () => {
    if (!name || !cuisine || !address || !zip || !phone) {
      setMessage("All fields are required.");
      return;
    }

    const { error } = await supabase.from("restaurants").insert({
      owner_id: user.id,
      name,
      cuisine_type: cuisine,
      address,
      zip_code: zip,
      primary_phone: phone,
    });

    if (error) {
      setMessage("Error creating restaurant: " + error.message);
      return;
    }

    router.push("/owner");
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h1>Set Up Your Restaurant</h1>

      {message && (
        <div style={{ background: "#fee2e2", padding: 10 }}>{message}</div>
      )}

      <div className="form-section">
        <label>Restaurant Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />

        <label>Cuisine Type</label>
        <input value={cuisine} onChange={(e) => setCuisine(e.target.value)} />

        <label>Address</label>
        <input value={address} onChange={(e) => setAddress(e.target.value)} />

        <label>Zip Code</label>
        <input value={zip} onChange={(e) => setZip(e.target.value)} />

        <label>Primary Phone</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 555-555-0123"
        />
      </div>

      <button className="btn-primary" onClick={handleCreateRestaurant}>
        Create Restaurant
      </button>
    </div>
  );
}
