"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Fix default marker icons (Next/Vercel builds often break Leaflet icon paths)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export type MapRestaurant = {
  id: string;
  name: string;
  cuisine_type: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  primary_phone: string | null;
  latitude: number | null;
  longitude: number | null;
};

export default function RestaurantMap({
  restaurants,
  onSelect,
  height = 420,
}: {
  restaurants: MapRestaurant[];
  onSelect: (r: MapRestaurant) => void;
  height?: number;
}) {
  const withCoords = useMemo(
    () =>
      restaurants.filter(
        (r) => typeof r.latitude === "number" && typeof r.longitude === "number"
      ),
    [restaurants]
  );

  const center = useMemo<[number, number]>(() => {
    // Default to first restaurant; fallback to Northern VA-ish center
    if (withCoords.length > 0) {
      return [withCoords[0].latitude!, withCoords[0].longitude!];
    }
    return [39.0458, -77.4874];
  }, [withCoords]);

  useEffect(() => {
    // Nothing here; keep hook for future enhancements
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height,
        borderRadius: 12,
        border: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      <MapContainer
        center={center}
        zoom={12}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {withCoords.map((r) => (
          <Marker key={r.id} position={[r.latitude!, r.longitude!]}>
            <Popup>
              <div style={{ minWidth: 220 }}>
                <div style={{ fontWeight: 900, marginBottom: 4 }}>{r.name}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  {r.cuisine_type ?? ""}
                </div>
                <div style={{ fontSize: 12, marginTop: 6, opacity: 0.9 }}>
                  {[r.address, r.city, r.state, r.zip_code]
                    .filter(Boolean)
                    .join(", ")}
                </div>
                {r.primary_phone ? (
                  <div style={{ fontSize: 12, marginTop: 6 }}>📞 {r.primary_phone}</div>
                ) : null}
                <button
                  className="btn btn-primary"
                  style={{ marginTop: 10, width: "100%" }}
                  onClick={() => onSelect(r)}
                >
                  Select restaurant
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
