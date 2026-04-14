export interface LatLng {
  lat: number;
  lng: number;
}

export interface Distance {
  km: number;
  m: number;
  meters: number;
  display: string;
}

const EARTH_RADIUS_M = 6_371_000;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

export function haversine(a: LatLng, b: LatLng): Distance {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  const meters = EARTH_RADIUS_M * c;

  return {
    meters,
    m: Math.round(meters),
    km: meters / 1000,
    display: formatDistance(meters),
  };
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${km.toFixed(km < 10 ? 2 : 1)} km`;
}
