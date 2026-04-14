'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';

interface NominatimResponse {
  display_name?: string;
  address?: Record<string, string>;
}

export interface ReverseGeocodeResult {
  label: string;
  full: string;
}

/**
 * Reverse geocode lat/lng to a human-readable address using OpenStreetMap Nominatim.
 * Cached aggressively since coordinates round to ~11m at 4 decimals.
 */
export function useReverseGeocode(
  lat: number | null | undefined,
  lng: number | null | undefined,
) {
  const locale = useLocale();
  const enabled = lat != null && lng != null;
  const rLat = enabled ? Number(lat).toFixed(4) : '';
  const rLng = enabled ? Number(lng).toFixed(4) : '';

  return useQuery<ReverseGeocodeResult>({
    queryKey: ['geocode', rLat, rLng, locale],
    enabled,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    retry: 1,
    queryFn: async () => {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.searchParams.set('format', 'json');
      url.searchParams.set('lat', String(lat));
      url.searchParams.set('lon', String(lng));
      url.searchParams.set('zoom', '17');
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('accept-language', locale);

      const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('geocode failed');
      const data = (await res.json()) as NominatimResponse;

      const a = data.address ?? {};
      const street = [a.road, a.house_number].filter(Boolean).join(' ');
      const area = a.neighbourhood || a.suburb || a.quarter || a.city_district || '';
      const city = a.city || a.town || a.village || a.county || '';
      const label = [street, area, city].filter(Boolean).join(' · ') || data.display_name || '';
      return { label, full: data.display_name ?? label };
    },
  });
}
