'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Package, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { DetailDrawer, DetailRow } from '@/components/shared/DetailDrawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon, IconPicker } from '@/components/ui/icon-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useCreateItem,
  useDeleteItem,
  useInventory,
  useUpdateItem,
  type InventoryItem,
  type ItemInput,
} from '@/hooks/queries/inventory';

type DrawerState =
  | { mode: 'create' }
  | { mode: 'view'; item: InventoryItem }
  | { mode: 'edit'; item: InventoryItem }
  | null;

export default function InventoryPage() {
  const t = useTranslations();
  const list = useInventory();
  const createMut = useCreateItem();
  const updateMut = useUpdateItem();
  const deleteMut = useDeleteItem();

  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const items = list.data?.items ?? [];
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        (i.type ?? '').toLowerCase().includes(q),
    );
  }, [list.data, query]);

  const total = filtered.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
  };
  const item = {
    hidden: { opacity: 0, y: 14 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 180, damping: 22 },
    },
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.header variants={item} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('inventory.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {list.data?.items?.length ?? 0} · {t('inventory.totalValue')}: {total.toLocaleString()}
          </p>
        </div>
        <Button variant="gradient" onClick={() => setDrawer({ mode: 'create' })}>
          <Plus className="size-4" />
          {t('common.create')}
        </Button>
      </motion.header>

      <motion.div variants={item}>
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Package className="size-5 text-primary" />
              {t('inventory.title')}
            </CardTitle>
            <div className="relative w-full max-w-xs">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="ps-10 h-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {list.isLoading ? (
              <div className="p-6 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-lg shimmer" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="p-8 text-sm text-muted-foreground text-center">{t('inventory.empty')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-start font-medium px-5 py-3">{t('inventory.name')}</th>
                      <th className="text-start font-medium px-5 py-3">{t('inventory.sku')}</th>
                      <th className="text-start font-medium px-5 py-3">{t('inventory.type')}</th>
                      <th className="text-end font-medium px-5 py-3">{t('inventory.qty')}</th>
                      <th className="text-end font-medium px-5 py-3">{t('inventory.unitPrice')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((it, i) => (
                      <motion.tr
                        key={it.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02, duration: 0.25 }}
                        onClick={() => setDrawer({ mode: 'view', item: it })}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                              <Icon name={it.icon} className="size-4" />
                            </div>
                            <span className="font-medium">{it.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground font-mono text-xs">{it.sku}</td>
                        <td className="px-5 py-3">
                          {it.type ? <Badge variant="outline">{it.type}</Badge> : '—'}
                        </td>
                        <td className="px-5 py-3 text-end font-medium">{it.qty}</td>
                        <td className="px-5 py-3 text-end font-mono">
                          {it.unitPrice.toLocaleString()}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <ItemFormDrawer
        open={drawer?.mode === 'create'}
        onClose={() => setDrawer(null)}
        title={t('inventory.addTitle')}
        description={t('inventory.addDesc')}
        submitLabel={t('common.create')}
        onSubmit={async (input) => {
          await createMut.mutateAsync(input);
          setDrawer(null);
        }}
        submitting={createMut.isPending}
      />

      {drawer?.mode === 'edit' && (
        <ItemFormDrawer
          open
          onClose={() => setDrawer(null)}
          title={t('inventory.editTitle')}
          description={t('inventory.editDesc')}
          submitLabel={t('common.save')}
          initial={drawer.item}
          onSubmit={async (input) => {
            await updateMut.mutateAsync({ id: drawer.item.id, ...input });
            setDrawer(null);
          }}
          submitting={updateMut.isPending}
        />
      )}

      {drawer?.mode === 'view' && (
        <DetailDrawer
          open
          onOpenChange={(o) => !o && setDrawer(null)}
          mode="view"
          title={drawer.item.name}
          description={drawer.item.sku}
          onEdit={() => setDrawer({ mode: 'edit', item: drawer.item })}
          onDelete={async () => {
            await deleteMut.mutateAsync(drawer.item.id);
            setDrawer(null);
          }}
          deleting={deleteMut.isPending}
          editLabel={t('common.edit')}
          deleteLabel={t('common.delete')}
        >
          <div className="flex items-center gap-4 pb-4 mb-4 border-b border-border">
            <div className="flex size-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
              <Icon name={drawer.item.icon} className="size-7" />
            </div>
            <div>
              <p className="text-lg font-semibold">{drawer.item.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{drawer.item.sku}</p>
            </div>
          </div>
          <div className="space-y-1">
            <DetailRow label={t('inventory.type')}>
              {drawer.item.type ? (
                <Badge variant="outline">{drawer.item.type}</Badge>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </DetailRow>
            <DetailRow label={t('inventory.qty')}>
              <span className="font-semibold">{drawer.item.qty}</span>
            </DetailRow>
            <DetailRow label={t('inventory.unitPrice')}>
              <span className="font-mono">{drawer.item.unitPrice.toLocaleString()}</span>
            </DetailRow>
            <DetailRow label={t('inventory.totalValue')}>
              <span className="font-mono font-semibold text-primary">
                {(drawer.item.qty * drawer.item.unitPrice).toLocaleString()}
              </span>
            </DetailRow>
          </div>
        </DetailDrawer>
      )}
    </motion.div>
  );
}

function ItemFormDrawer({
  open,
  onClose,
  title,
  description,
  submitLabel,
  initial,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  submitLabel: string;
  initial?: InventoryItem;
  onSubmit: (input: ItemInput) => Promise<void>;
  submitting: boolean;
}): React.ReactElement {
  const t = useTranslations();
  const [name, setName] = useState(initial?.name ?? '');
  const [sku, setSku] = useState(initial?.sku ?? '');
  const [type, setType] = useState(initial?.type ?? '');
  const [icon, setIcon] = useState<string>(initial?.icon ?? 'package');
  const [qty, setQty] = useState(String(initial?.qty ?? 0));
  const [unitPrice, setUnitPrice] = useState(String(initial?.unitPrice ?? 0));

  const qtyNum = Number(qty);
  const priceNum = Number(unitPrice);
  const canSubmit =
    name.trim().length >= 1 &&
    sku.trim().length >= 1 &&
    Number.isFinite(qtyNum) &&
    qtyNum >= 0 &&
    Number.isFinite(priceNum) &&
    priceNum >= 0;

  function reset(): void {
    setName(initial?.name ?? '');
    setSku(initial?.sku ?? '');
    setType(initial?.type ?? '');
    setIcon(initial?.icon ?? 'package');
    setQty(String(initial?.qty ?? 0));
    setUnitPrice(String(initial?.unitPrice ?? 0));
  }

  async function submit(): Promise<void> {
    await onSubmit({
      name: name.trim(),
      sku: sku.trim(),
      type: type.trim() || undefined,
      icon,
      qty: qtyNum,
      unitPrice: priceNum,
    });
    reset();
  }

  return (
    <DetailDrawer
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
      mode={initial ? 'edit' : 'create'}
      title={title}
      description={description}
      onSubmit={submit}
      submitting={submitting}
      submitDisabled={!canSubmit}
      submitLabel={submitLabel}
      cancelLabel={t('common.cancel')}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t('inventory.icon')}</Label>
          <div className="flex items-start gap-3">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-primary shadow-soft">
              <Icon name={icon} className="size-7" />
            </div>
            <IconPicker value={icon} onChange={setIcon} className="flex-1" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="item-name">
              {t('inventory.name')} <span className="text-destructive">*</span>
            </Label>
            <Input id="item-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-sku">
              {t('inventory.sku')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="item-sku"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              maxLength={60}
              dir="ltr"
              className="font-mono"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="item-type">{t('inventory.type')}</Label>
          <Input
            id="item-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder={t('inventory.typePlaceholder')}
            maxLength={60}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="item-qty">{t('inventory.qty')}</Label>
            <Input
              id="item-qty"
              type="number"
              min={0}
              step={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-price">{t('inventory.unitPrice')}</Label>
            <Input
              id="item-price"
              type="number"
              min={0}
              step="any"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
            />
          </div>
        </div>
      </div>
    </DetailDrawer>
  );
}
