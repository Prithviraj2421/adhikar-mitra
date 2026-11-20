"use client";
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";

export interface MapPoint {
  id: string; lat: number; lng: number; label: string; color?: string; radius?: number; detail?: string;
  onClick?: () => void;
}

/** Leaflet + OpenStreetMap. Points are drawn as circles (no marker images, so no asset issues). */
export default function MapView({
  points, height = 320, center = [21.1458, 79.0882], zoom = 11, ariaLabel,
}: { points: MapPoint[]; height?: number; center?: [number, number]; zoom?: number; ariaLabel: string }) {
  return (
    <div style={{ height }} className="overflow-hidden rounded-3xl border-2" role="region" aria-label={ariaLabel} data-testid="map">
      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {points.map((p) => (
          <CircleMarker
            key={p.id} center={[p.lat, p.lng]} radius={p.radius ?? 12}
            pathOptions={{ color: p.color ?? "#3730a3", fillColor: p.color ?? "#3730a3", fillOpacity: 0.65, weight: 2 }}
            eventHandlers={p.onClick ? { click: p.onClick } : undefined}
          >
            <Popup><strong>{p.label}</strong>{p.detail && <><br />{p.detail}</>}</Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
