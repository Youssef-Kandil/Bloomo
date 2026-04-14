'use client';

/**
 * Lightweight Leaflet wrapper used by LocationPicker and EmployeeMarkers.
 * Imported dynamically with `ssr: false` from consumers.
 */
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';

// fix the default marker icon paths under bundlers
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  /** If true, renders a custom avatar marker with initials and a permanent name tooltip. */
  avatar?: boolean;
}

const PALETTE = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#06b6d4',
  '#8b5cf6',
  '#ef4444',
  '#14b8a6',
];

function colorFor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function avatarIcon(name: string, id: string): L.DivIcon {
  const color = colorFor(id || name);
  const initials = initialsOf(name) || '?';
  const html = `
    <div style="
      position: relative;
      width: 40px;
      height: 48px;
      transform: translate(-50%, -100%);
    ">
      <div style="
        width: 40px;
        height: 40px;
        border-radius: 999px;
        background: linear-gradient(135deg, ${color} 0%, ${color}cc 100%);
        color: #fff;
        font: 600 13px/40px system-ui, -apple-system, 'Segoe UI', sans-serif;
        text-align: center;
        border: 3px solid #fff;
        box-shadow: 0 4px 10px rgba(0,0,0,.25), 0 0 0 1px rgba(0,0,0,.08);
      ">${initials}</div>
      <div style="
        position: absolute;
        left: 50%;
        bottom: 0;
        width: 0;
        height: 0;
        transform: translate(-50%, 50%) rotate(45deg);
        background: ${color};
        width: 10px;
        height: 10px;
        border-right: 3px solid #fff;
        border-bottom: 3px solid #fff;
        box-shadow: 2px 2px 6px rgba(0,0,0,.2);
      "></div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'bloomo-avatar-marker',
    iconSize: [40, 48],
    iconAnchor: [20, 48],
    popupAnchor: [0, -44],
  });
}

interface Props {
  center: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  markers?: MapMarker[];
  onClick?: (latLng: { lat: number; lng: number }) => void;
}

export default function LeafletMap({ center, zoom = 13, height = '320px', markers = [], onClick }: Props) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current).setView([center.lat, center.lng], zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    markerLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    if (onClick) {
      map.on('click', (e) => onClick({ lat: e.latlng.lat, lng: e.latlng.lng }));
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView([center.lat, center.lng], mapRef.current.getZoom());
  }, [center.lat, center.lng]);

  useEffect(() => {
    if (!markerLayerRef.current) return;
    markerLayerRef.current.clearLayers();
    for (const m of markers) {
      const marker = m.avatar
        ? L.marker([m.lat, m.lng], { icon: avatarIcon(m.label ?? '?', m.id) })
        : L.marker([m.lat, m.lng]);
      if (m.label) {
        marker.bindPopup(m.label);
        if (m.avatar) {
          marker.bindTooltip(m.label, {
            permanent: true,
            direction: 'top',
            offset: [0, -44],
            className: 'bloomo-name-tooltip',
          });
        }
      }
      marker.addTo(markerLayerRef.current);
    }
  }, [markers]);

  return <div ref={elRef} style={{ height, width: '100%' }} className="rounded-md overflow-hidden" />;
}
