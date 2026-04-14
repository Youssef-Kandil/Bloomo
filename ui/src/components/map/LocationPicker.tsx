'use client';

import dynamic from 'next/dynamic';
import { Loader2, LocateFixed, MapPin, Search, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const LeafletMap = dynamic(() => import('./LeafletMap'), { ssr: false });

export interface LatLng {
  lat: number;
  lng: number;
}

interface Props {
  initial?: LatLng;
  onChange: (latLng: LatLng) => void;
  height?: string;
}

interface NominatimHit {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

const DEFAULT_CENTER: LatLng = { lat: 30.0444, lng: 31.2357 };

export function LocationPicker({ initial, onChange, height = '300px' }: Props) {
  const t = useTranslations('company');
  const locale = useLocale();

  const [pos, setPos] = useState<LatLng>(initial ?? DEFAULT_CENTER);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimHit[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // debounced search via Nominatim
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const url = new URL('https://nominatim.openstreetmap.org/search');
        url.searchParams.set('format', 'json');
        url.searchParams.set('q', query);
        url.searchParams.set('limit', '5');
        url.searchParams.set('accept-language', locale);
        const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error('search failed');
        const data = (await res.json()) as NominatimHit[];
        setResults(data);
        setSearchOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 450);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, locale]);

  function pick(next: LatLng): void {
    setPos(next);
    onChange(next);
  }

  function pickFromHit(hit: NominatimHit): void {
    const next = { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) };
    pick(next);
    setQuery(hit.display_name);
    setSearchOpen(false);
  }

  function useMyLocation(): void {
    if (!('geolocation' in navigator)) {
      setGeoError(t('locationError'));
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        pick({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocating(false);
      },
      () => {
        setGeoError(t('locationError'));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  return (
    <div className="space-y-2">
      {/* Search + my-location */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setSearchOpen(true)}
            placeholder={t('searchPlace')}
            className="ps-10 pe-9"
          />
          {searching && (
            <Loader2 className="absolute end-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
          )}
          {!searching && query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setSearchOpen(false);
              }}
              className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label="Clear"
            >
              <X className="size-4" />
            </button>
          )}

          {/* Results dropdown */}
          {searchOpen && results.length > 0 && (
            <div className="absolute z-[110] start-0 end-0 mt-1 rounded-lg border border-border bg-popover shadow-elevated overflow-hidden animate-fade-in">
              {results.map((hit) => (
                <button
                  key={hit.place_id}
                  type="button"
                  onClick={() => pickFromHit(hit)}
                  className="flex items-start gap-2 w-full text-start px-3 py-2.5 text-sm transition-colors hover:bg-muted border-b border-border last:border-0"
                >
                  <MapPin className="size-4 shrink-0 mt-0.5 text-primary" />
                  <span className="line-clamp-2">{hit.display_name}</span>
                </button>
              ))}
            </div>
          )}
          {searchOpen && !searching && query && results.length === 0 && (
            <div className="absolute z-[110] start-0 end-0 mt-1 rounded-lg border border-border bg-popover shadow-elevated p-3 text-sm text-muted-foreground text-center">
              {t('noSearchResults')}
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={useMyLocation}
          disabled={locating}
          title={t('useMyLocation')}
          aria-label={t('useMyLocation')}
        >
          {locating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LocateFixed className="size-4" />
          )}
        </Button>
      </div>

      {geoError && (
        <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-2 py-1.5">
          {geoError}
        </p>
      )}

      {/* Map */}
      <div
        className={cn(
          'relative rounded-lg overflow-hidden border border-border',
          'after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:px-3 after:py-1.5 after:text-xs after:text-white after:bg-black/40 after:content-[attr(data-hint)]',
        )}
        data-hint={t('clickToPick')}
      >
        <LeafletMap
          center={pos}
          markers={[{ id: 'picked', lat: pos.lat, lng: pos.lng }]}
          onClick={(p) => pick(p)}
          height={height}
        />
      </div>

      <p className="text-xs text-muted-foreground font-mono">
        {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
      </p>
    </div>
  );
}
