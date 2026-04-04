'use client';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Link from 'next/link';
import { Leaf, Navigation2 } from 'lucide-react';

// Fix default marker icon issue in Leaflet + webpack
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const userIcon = L.divIcon({
  html: `<div style="background: linear-gradient(135deg, #22c55e, #06b6d4); width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const itemIcon = L.divIcon({
  html: `<div style="background: #16a34a; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.25);"></div>`,
  className: '',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export interface MapItem {
  id: string;
  title: string;
  category: string;
  borrowPrice: number;
  resalePrice: number;
  co2Saved: number;
  lat: number;
  lng: number;
  recommendation: 'borrow' | 'buy_resale';
  distance?: number;
}

interface MapViewProps {
  items: MapItem[];
  userLocation: { lat: number; lng: number };
  radiusKm: number;
  onItemClick?: (id: string) => void;
  className?: string;
}

function FitBounds({ userLocation, items }: { userLocation: { lat: number; lng: number }; items: MapItem[] }) {
  const map = useMap();
  useEffect(() => {
    if (items.length === 0) {
      map.setView([userLocation.lat, userLocation.lng], 13);
      return;
    }
    const bounds = L.latLngBounds(
      items.map((item) => [item.lat, item.lng])
    );
    bounds.extend([userLocation.lat, userLocation.lng]);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }, [map, userLocation, items]);
  return null;
}

export default function MapView({ items, userLocation, radiusKm, className = '' }: MapViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`bg-earth-100 rounded-2xl flex items-center justify-center ${className}`}>
        <div className="text-earth-400 text-sm flex items-center gap-2">
          <Navigation2 size={16} className="animate-pulse" />
          Loading map...
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl overflow-hidden border border-earth-200/60 shadow-sm ${className}`}>
      <MapContainer
        center={[userLocation.lat, userLocation.lng]}
        zoom={13}
        style={{ height: '100%', width: '100%', minHeight: '400px' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds userLocation={userLocation} items={items} />

        {/* User location marker */}
        <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
          <Popup>
            <div className="text-center">
              <p className="font-bold text-sm text-earth">📍 You are here</p>
            </div>
          </Popup>
        </Marker>

        {/* Radius circle */}
        <Circle
          center={[userLocation.lat, userLocation.lng]}
          radius={radiusKm * 1000}
          pathOptions={{
            color: '#22c55e',
            fillColor: '#22c55e',
            fillOpacity: 0.06,
            weight: 1.5,
            dashArray: '6 4',
          }}
        />

        {/* Item markers */}
        {items.map((item) => (
          <Marker
            key={item.id}
            position={[item.lat, item.lng]}
            icon={itemIcon}
          >
            <Popup>
              <div className="min-w-[180px]">
                <p className="font-bold text-sm text-earth mb-1">{item.title}</p>
                <p className="text-xs text-earth-400 mb-2">{item.category}</p>
                <div className="flex items-center gap-3 text-xs mb-2">
                  <span className="text-leaf-dark font-bold">${item.borrowPrice}/day</span>
                  <span className="text-ocean-dark font-bold">${item.resalePrice} resale</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-leaf-dark mb-2">
                  <Leaf size={11} />
                  <span>Saves {item.co2Saved} kg CO₂</span>
                </div>
                {item.distance !== undefined && (
                  <p className="text-xs text-earth-400 mb-2">📏 {item.distance.toFixed(1)} km away</p>
                )}
                <Link
                  href={`/listings/${item.id}`}
                  className="block text-center text-xs font-semibold text-white bg-leaf hover:bg-leaf-dark rounded-lg py-1.5 transition-colors"
                >
                  View Details
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
