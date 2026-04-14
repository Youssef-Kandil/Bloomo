'use client';

import * as React from 'react';
import {
  Box,
  Package,
  PackageOpen,
  Boxes,
  ShoppingBag,
  ShoppingCart,
  Archive,
  Warehouse,
  Truck,
  Wrench,
  Hammer,
  Drill,
  Cog,
  Settings,
  Plug,
  PlugZap,
  Zap,
  Battery,
  Lightbulb,
  Pipette,
  Paintbrush,
  Scissors,
  Ruler,
  Cable,
  HardHat,
  Shield,
  Droplets,
  Thermometer,
  Fan,
  Wind,
  Flame,
  Droplet,
  Pill,
  Syringe,
  Stethoscope,
  Heart,
  Cpu,
  HardDrive,
  Keyboard,
  Mouse,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Printer,
  Camera,
  Headphones,
  Speaker,
  Wifi,
  Router,
  Server,
  Database,
  Key,
  Lock,
  Lightbulb as Idea,
  Tag,
  Barcode,
  QrCode,
  type LucideIcon,
  Search,
  Check,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Curated icon library for inventory items. Keys are serialized to the DB;
 * don't rename them without a migration.
 */
export const ICON_LIBRARY: Record<string, LucideIcon> = {
  box: Box,
  package: Package,
  'package-open': PackageOpen,
  boxes: Boxes,
  'shopping-bag': ShoppingBag,
  'shopping-cart': ShoppingCart,
  archive: Archive,
  warehouse: Warehouse,
  truck: Truck,
  wrench: Wrench,
  hammer: Hammer,
  drill: Drill,
  cog: Cog,
  settings: Settings,
  plug: Plug,
  'plug-zap': PlugZap,
  zap: Zap,
  battery: Battery,
  lightbulb: Lightbulb,
  pipette: Pipette,
  paintbrush: Paintbrush,
  scissors: Scissors,
  ruler: Ruler,
  cable: Cable,
  'hard-hat': HardHat,
  shield: Shield,
  droplets: Droplets,
  droplet: Droplet,
  thermometer: Thermometer,
  fan: Fan,
  wind: Wind,
  flame: Flame,
  pill: Pill,
  syringe: Syringe,
  stethoscope: Stethoscope,
  heart: Heart,
  cpu: Cpu,
  'hard-drive': HardDrive,
  keyboard: Keyboard,
  mouse: Mouse,
  monitor: Monitor,
  smartphone: Smartphone,
  tablet: Tablet,
  laptop: Laptop,
  printer: Printer,
  camera: Camera,
  headphones: Headphones,
  speaker: Speaker,
  wifi: Wifi,
  router: Router,
  server: Server,
  database: Database,
  key: Key,
  lock: Lock,
  idea: Idea,
  tag: Tag,
  barcode: Barcode,
  'qr-code': QrCode,
};

export type IconName = keyof typeof ICON_LIBRARY;

export function Icon({
  name,
  fallback = 'package',
  className,
}: {
  name?: string | null;
  fallback?: IconName;
  className?: string;
}): React.ReactElement {
  const Comp = (name && ICON_LIBRARY[name]) || ICON_LIBRARY[fallback];
  return <Comp className={className} />;
}

interface IconPickerProps {
  value?: string | null;
  onChange: (iconName: string) => void;
  className?: string;
}

export function IconPicker({ value, onChange, className }: IconPickerProps): React.ReactElement {
  const t = useTranslations();
  const [query, setQuery] = React.useState('');

  const entries = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = Object.keys(ICON_LIBRARY) as IconName[];
    if (!q) return all;
    return all.filter((k) => k.includes(q));
  }, [query]);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('common.search')}
          className="ps-10 h-9"
        />
      </div>
      <div
        className="grid grid-cols-8 gap-1.5 max-h-56 overflow-y-auto rounded-lg border border-border bg-muted/20 p-2"
      >
        {entries.map((name) => {
          const Comp = ICON_LIBRARY[name];
          const active = value === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(name)}
              title={name}
              className={cn(
                'relative flex size-10 items-center justify-center rounded-md transition-all',
                active
                  ? 'bg-primary text-primary-foreground shadow-glow scale-105'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Comp className="size-5" />
              {active && (
                <Check className="absolute -top-1 -end-1 size-3.5 rounded-full bg-primary-foreground text-primary p-0.5 shadow-soft" />
              )}
            </button>
          );
        })}
        {entries.length === 0 && (
          <p className="col-span-8 py-4 text-center text-xs text-muted-foreground">
            {t('common.empty')}
          </p>
        )}
      </div>
    </div>
  );
}
