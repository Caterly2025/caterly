"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Fix marker icons for Next/Vercel (otherwise markers often render as empty)
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
  description: string | null;
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
  const withCoords = restaurants.filter(
    (r) => typeof r.latitude === "number" && typeof r.longitude === "number"
  );

  const center: [number, number] =
    withCoords.length > 0
      ? [withCoords[0].latitude as number, withCoords[0].longitude as number]
      : [39.043757, -77.487442]; // fallback (Ashburn-ish)

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
        zoom={11}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {withCoords.map((r) => (
          <Marker key={r.id} position={[r.latitude as number, r.longitude as number]}>
            <Popup>
              <div style={{ minWidth: 240 }}>
                <div style={{ fontWeight: 900, marginBottom: 4 }}>{r.name}</div>
                {r.description ? (
                  <div style={{ fontSize: 12, opacity: 0.85 }}>{r.description}</div>
                ) : null}

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
