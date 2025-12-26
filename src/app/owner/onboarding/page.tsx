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
  }, [user, router]);

  const handleCreateRestaurant = async () => {
    setMessage(null);

    if (!name || !cuisine || !address || !zip || !phone) {
      setMessage("All fields are required.");
      return;
    }

    const { error } = await supabase.from("restaurants").insert({
      owner_id: user.id,
      name,
      description: cuisine,
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
    <div className="page">
      <div className="page-narrow">
        <div className="card">
          <h1 className="page-title">Set Up Your Restaurant</h1>
          <p className="page-subtitle">
            Tell us a bit about your restaurant so we can link orders and notifications.
          </p>

          {message && (
            <div className="alert alert-error">
              {message}
            </div>
          )}

          <div className="form-section">
            <label className="form-label">Restaurant Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />

            <label className="form-label">Cuisine Type</label>
            <input
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              className="input"
              placeholder="e.g. South Indian, Pizza, Deli"
            />

            <label className="form-label">Address</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="input"
            />

            <label className="form-label">Zip Code</label>
            <input
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              className="input"
            />

            <label className="form-label">Primary Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
              placeholder="+1 555-555-0123"
            />
          </div>

          <div className="button-row">
            <button
              className="btn btn-primary"
              onClick={handleCreateRestaurant}
            >
              Create Restaurant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
