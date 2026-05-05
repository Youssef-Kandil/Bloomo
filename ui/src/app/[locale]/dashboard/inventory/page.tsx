'use client';

import axios from 'axios';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Package, Plus, Search, Truck, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  DateRangeFilter,
  rangeFromPreset,
  type DateRangeValue,
} from '@/components/shared/DateRangeFilter';
import { DetailDrawer, DetailRow } from '@/components/shared/DetailDrawer';
import { Pagination } from '@/components/shared/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon, IconPicker } from '@/components/ui/icon-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useClients } from '@/hooks/queries/clients';
import { useEmployees } from '@/hooks/queries/employees';
import {
  useCreateItem,
  useDeleteItem,
  useInventory,
  useUpdateItem,
  type InventoryItem,
  type ItemInput,
} from '@/hooks/queries/inventory';
import {
  useCreateSupplyOperation,
  useDeleteSupplyOperation,
  useMarkSupplyPaid,
  useSupplyOperations,
  type CreateSupplyInput,
  type SupplyFilters,
  type SupplyOperation,
} from '@/hooks/queries/supply';

type DrawerState =
  | { mode: 'create' }
  | { mode: 'view'; item: InventoryItem }
  | { mode: 'edit'; item: InventoryItem }
  | { mode: 'supply' }
  | { mode: 'viewOperation'; operation: SupplyOperation }
  | null;

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { message?: string } | undefined)?.message ?? err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

function statusKey(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'pending';
    case 'IN_PROGRESS':
      return 'inProgress';
    case 'COMPLETED':
      return 'completed';
    case 'CANCELED':
      return 'canceled';
    default:
      return 'pending';
  }
}

export default function InventoryPage() {
  const t = useTranslations();
  const list = useInventory();
  const createMut = useCreateItem();
  const updateMut = useUpdateItem();
  const deleteMut = useDeleteItem();

  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [query, setQuery] = useState('');

  const [opFilters, setOpFilters] = useState<SupplyFilters>({});

  const operations = useSupplyOperations(opFilters);
  const employees = useEmployees();
  const clients = useClients();
  const supplyMut = useCreateSupplyOperation();
  const deleteOpMut = useDeleteSupplyOperation();
  const markPaidMut = useMarkSupplyPaid();

  const activeEmployees = useMemo(
    () => (employees.data?.items ?? []).filter((e) => e.active !== false),
    [employees.data],
  );

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
  const itemsPg = usePagination(filtered);

  const [opsDateRange, setOpsDateRange] = useState<DateRangeValue>(() => ({
    preset: 'currentWeek',
    ...rangeFromPreset('currentWeek'),
  }));
  const filteredOps = useMemo(() => {
    const all = operations.data ?? [];
    if (!opsDateRange.from && !opsDateRange.to) return all;
    const fromTs = opsDateRange.from ? new Date(opsDateRange.from).getTime() : -Infinity;
    const toTs = opsDateRange.to
      ? new Date(`${opsDateRange.to}T23:59:59.999Z`).getTime()
      : Infinity;
    return all.filter((op) => {
      const ts = new Date(op.createdAt).getTime();
      return ts >= fromTs && ts <= toTs;
    });
  }, [operations.data, opsDateRange.from, opsDateRange.to]);
  const opsPg = usePagination(filteredOps);

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
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setDrawer({ mode: 'supply' })}>
            <Truck className="size-4" />
            {t('inventory.supply')}
          </Button>
          <Button variant="gradient" onClick={() => setDrawer({ mode: 'create' })}>
            <Plus className="size-4" />
            {t('common.create')}
          </Button>
        </div>
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
              <div className="overflow-x-auto md:overflow-auto md:max-h-[34rem]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-card text-muted-foreground text-xs uppercase tracking-wide border-b border-border">
                    <tr>
                      <th className="text-start font-medium px-5 py-3">{t('inventory.name')}</th>
                      <th className="text-start font-medium px-5 py-3">{t('inventory.sku')}</th>
                      <th className="text-start font-medium px-5 py-3">{t('inventory.type')}</th>
                      <th className="text-end font-medium px-5 py-3">{t('inventory.qty')}</th>
                      <th className="text-end font-medium px-5 py-3">{t('inventory.unitPrice')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {itemsPg.paginated.map((it, i) => (
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
            <Pagination
              page={itemsPg.page}
              pageCount={itemsPg.pageCount}
              onPageChange={itemsPg.setPage}
              totalCount={itemsPg.totalCount}
              firstIndex={itemsPg.firstIndex}
              lastIndex={itemsPg.lastIndex}
            />
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

      {drawer?.mode === 'supply' && (
        <SupplyDrawer
          open
          onClose={() => setDrawer(null)}
          items={list.data?.items ?? []}
          employees={activeEmployees}
          employeesLoading={employees.isLoading}
          clients={clients.data?.items ?? []}
          clientsLoading={clients.isLoading}
          onSubmit={async (input) => {
            try {
              await supplyMut.mutateAsync(input);
              toast.success(t('inventory.supplySuccess'));
              setDrawer(null);
            } catch (err) {
              toast.error(errorMessage(err));
              throw err;
            }
          }}
          submitting={supplyMut.isPending}
        />
      )}

      {drawer?.mode === 'viewOperation' && (
        <DetailDrawer
          open
          onOpenChange={(o) => !o && setDrawer(null)}
          mode="view"
          title={t('inventory.operationDetails')}
          description={`${drawer.operation.client.name} · ${drawer.operation.employee.name}`}
          onDelete={async () => {
            if (!confirm(t('inventory.confirmDeleteOperation'))) return;
            try {
              await deleteOpMut.mutateAsync(drawer.operation.id);
              toast.success(t('inventory.deleteOperationSuccess'));
              setDrawer(null);
            } catch (err) {
              toast.error(errorMessage(err));
            }
          }}
          deleting={deleteOpMut.isPending}
          deleteLabel={t('common.delete')}
        >
          <div className="space-y-1">
            <DetailRow label={t('inventory.client')}>
              <span className="font-medium">{drawer.operation.client.name}</span>
            </DetailRow>
            <DetailRow label={t('inventory.employee')}>
              <div className="flex flex-col items-end">
                <span className="font-medium">{drawer.operation.employee.name}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {drawer.operation.employee.email}
                </span>
              </div>
            </DetailRow>
            <DetailRow label={t('inventory.createdAt')}>
              <span className="whitespace-nowrap">
                {new Date(drawer.operation.createdAt).toLocaleString(undefined, {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </DetailRow>
            <DetailRow label={t('tasks.type')}>
              <Badge variant="outline">
                {drawer.operation.needsInstall
                  ? t('tasks.typeSUPPLY_INSTALL')
                  : t('tasks.typeSUPPLY')}
              </Badge>
            </DetailRow>
            {drawer.operation.note && (
              <DetailRow label={t('inventory.supplyNote')}>
                <span className="whitespace-pre-wrap">{drawer.operation.note}</span>
              </DetailRow>
            )}
          </div>

          <div className="mt-5 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {t('inventory.supplyItems')}
            </p>
            <div className="rounded-lg border border-border divide-y divide-border">
              {drawer.operation.items.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium">{it.inventoryItem.name}</span>
                    <span className="ms-2 text-xs text-muted-foreground font-mono">
                      {it.inventoryItem.sku}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-xs">
                      ×{it.qty}
                    </span>
                    <span className="font-mono text-xs">
                      {(it.qty * it.unitPrice).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {drawer.operation.invoiceAmount !== null && (
            <div className="mt-5 space-y-1">
              <DetailRow label={t('inventory.invoiceAmount')}>
                <span className="font-mono font-semibold">
                  {drawer.operation.invoiceAmount.toLocaleString()}
                </span>
              </DetailRow>
              <DetailRow label={t('common.status')}>
                {drawer.operation.paidAt ? (
                  <Badge>{t('inventory.paid')}</Badge>
                ) : drawer.operation.isDeferred ? (
                  <Badge variant="outline">{t('inventory.deferred')}</Badge>
                ) : (
                  <Badge variant="outline">{t('inventory.unpaid')}</Badge>
                )}
              </DetailRow>
              {drawer.operation.paidAt && (
                <DetailRow label={t('inventory.paid')}>
                  <span className="whitespace-nowrap">
                    {new Date(drawer.operation.paidAt).toLocaleString()}
                  </span>
                </DetailRow>
              )}
              {!drawer.operation.paidAt && (
                <div className="pt-3">
                  <Button
                    type="button"
                    variant="gradient"
                    className="w-full"
                    disabled={markPaidMut.isPending}
                    onClick={async () => {
                      try {
                        await markPaidMut.mutateAsync(drawer.operation.id);
                        toast.success(t('inventory.collectDeferredSuccess'));
                        setDrawer(null);
                      } catch (err) {
                        toast.error(errorMessage(err));
                      }
                    }}
                  >
                    {t('inventory.collectDeferred')}
                  </Button>
                </div>
              )}
            </div>
          )}

          {drawer.operation.tasks.length > 0 && (
            <div className="mt-5 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {t('nav.tasks')}
              </p>
              <div className="space-y-1">
                {drawer.operation.tasks.map((tk) => (
                  <div
                    key={tk.id}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <span>{tk.title}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {t(`tasks.type${tk.type}` as Parameters<typeof t>[0])}
                      </Badge>
                      <Badge className="text-[10px]">
                        {t(`tasks.${statusKey(tk.status)}` as Parameters<typeof t>[0])}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DetailDrawer>
      )}

      <motion.div variants={item}>
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <Truck className="size-5 text-primary" />
              {t('inventory.recentOperations')}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={opFilters.status ?? ''}
                onChange={(e) =>
                  setOpFilters((f) => ({
                    ...f,
                    status: (e.target.value || undefined) as SupplyFilters['status'],
                  }))
                }
                className="rounded-md border border-input bg-background px-2 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">{t('inventory.filterStatus')}: {t('inventory.filterAll')}</option>
                <option value="paid">{t('inventory.paid')}</option>
                <option value="unpaid">{t('inventory.unpaid')}</option>
                <option value="deferred">{t('inventory.deferred')}</option>
                <option value="noInvoice">{t('inventory.statusNoInvoice')}</option>
              </select>
              <select
                value={opFilters.employeeId ?? ''}
                onChange={(e) =>
                  setOpFilters((f) => ({ ...f, employeeId: e.target.value || undefined }))
                }
                className="rounded-md border border-input bg-background px-2 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">{t('inventory.filterEmployee')}: {t('inventory.filterAll')}</option>
                {activeEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
              <select
                value={opFilters.clientId ?? ''}
                onChange={(e) =>
                  setOpFilters((f) => ({ ...f, clientId: e.target.value || undefined }))
                }
                className="rounded-md border border-input bg-background px-2 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">{t('inventory.filterClient')}: {t('inventory.filterAll')}</option>
                {(clients.data?.items ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {(opFilters.status || opFilters.employeeId || opFilters.clientId) && (
                <Button size="sm" variant="ghost" onClick={() => setOpFilters({})}>
                  {t('inventory.resetFilters')}
                </Button>
              )}
            </div>
          </CardHeader>
          <div className="px-6 pt-2 pb-3">
            <DateRangeFilter value={opsDateRange} onChange={setOpsDateRange} />
          </div>
          <CardContent className="p-0">
            {operations.isLoading ? (
              <div className="p-6 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-lg shimmer" />
                ))}
              </div>
            ) : filteredOps.length === 0 ? (
              <p className="p-8 text-sm text-muted-foreground text-center">
                {t('inventory.noOperations')}
              </p>
            ) : (
              <div className="scroll-tbl">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-start font-medium px-5 py-3">
                        {t('inventory.opDate')}
                      </th>
                      <th className="text-start font-medium px-5 py-3">
                        {t('inventory.client')}
                      </th>
                      <th className="text-start font-medium px-5 py-3">
                        {t('inventory.employee')}
                      </th>
                      <th className="text-start font-medium px-5 py-3">
                        {t('inventory.supplyItems')}
                      </th>
                      <th className="text-end font-medium px-5 py-3">
                        {t('inventory.invoiceAmount')}
                      </th>
                      <th className="text-start font-medium px-5 py-3">{t('common.status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {opsPg.paginated.map((op) => (
                      <tr
                        key={op.id}
                        onClick={() => setDrawer({ mode: 'viewOperation', operation: op })}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                      >
                        <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(op.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3 font-medium">{op.client.name}</td>
                        <td className="px-5 py-3">{op.employee.name}</td>
                        <td className="px-5 py-3 text-muted-foreground text-xs">
                          {op.items
                            .map((it) => `${it.inventoryItem.name}×${it.qty}`)
                            .join(' · ')}
                          {op.needsInstall && (
                            <Badge variant="outline" className="ms-2 text-[10px]">
                              {t('tasks.typeSUPPLY_INSTALL')}
                            </Badge>
                          )}
                        </td>
                        <td className="px-5 py-3 text-end font-mono">
                          {op.invoiceAmount
                            ? op.invoiceAmount.toLocaleString()
                            : '—'}
                        </td>
                        <td className="px-5 py-3">
                          {op.invoiceAmount === null ? (
                            <Badge variant="outline">—</Badge>
                          ) : op.paidAt ? (
                            <Badge>{t('inventory.paid')}</Badge>
                          ) : op.isDeferred ? (
                            <Badge variant="outline">{t('inventory.deferred')}</Badge>
                          ) : (
                            <Badge variant="outline">{t('inventory.unpaid')}</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination
              page={opsPg.page}
              pageCount={opsPg.pageCount}
              onPageChange={opsPg.setPage}
              totalCount={opsPg.totalCount}
              firstIndex={opsPg.firstIndex}
              lastIndex={opsPg.lastIndex}
            />
          </CardContent>
        </Card>
      </motion.div>
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

interface SupplyLine {
  inventoryItemId: string;
  qty: number;
}

function SupplyDrawer({
  open,
  onClose,
  items,
  employees,
  employeesLoading,
  clients,
  clientsLoading,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  items: InventoryItem[];
  employees: Array<{ id: string; name: string; email: string }>;
  employeesLoading: boolean;
  clients: Array<{ id: string; name: string }>;
  clientsLoading: boolean;
  onSubmit: (input: CreateSupplyInput) => Promise<void>;
  submitting: boolean;
}): React.ReactElement {
  const t = useTranslations();

  const [employeeId, setEmployeeId] = useState('');
  const [clientId, setClientId] = useState('');
  const [lines, setLines] = useState<SupplyLine[]>([{ inventoryItemId: '', qty: 1 }]);
  const [needsInstall, setNeedsInstall] = useState(false);
  const [hasInvoice, setHasInvoice] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState('0');
  const [isDeferred, setIsDeferred] = useState(false);
  const [note, setNote] = useState('');

  const itemsById = useMemo(() => new Map(items.map((it) => [it.id, it])), [items]);

  function updateLine(idx: number, patch: Partial<SupplyLine>): void {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function addLine(): void {
    setLines((prev) => [...prev, { inventoryItemId: '', qty: 1 }]);
  }

  function removeLine(idx: number): void {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  const linesValid = lines.every((l) => {
    if (!l.inventoryItemId || l.qty < 1) return false;
    const item = itemsById.get(l.inventoryItemId);
    return item ? item.qty >= l.qty : false;
  });

  const duplicates = new Set<string>();
  const hasDup = lines.some((l) => {
    if (!l.inventoryItemId) return false;
    if (duplicates.has(l.inventoryItemId)) return true;
    duplicates.add(l.inventoryItemId);
    return false;
  });

  const invoiceNum = Number(invoiceAmount);
  const invoiceValid =
    !hasInvoice || (Number.isFinite(invoiceNum) && invoiceNum > 0);

  const canSubmit =
    employeeId !== '' && clientId !== '' && linesValid && !hasDup && invoiceValid;

  function reset(): void {
    setEmployeeId('');
    setClientId('');
    setLines([{ inventoryItemId: '', qty: 1 }]);
    setNeedsInstall(false);
    setHasInvoice(false);
    setInvoiceAmount('0');
    setIsDeferred(false);
    setNote('');
  }

  async function submit(): Promise<void> {
    const trimmedNote = note.trim();
    await onSubmit({
      employeeId,
      clientId,
      items: lines.map((l) => ({ inventoryItemId: l.inventoryItemId, qty: l.qty })),
      needsInstall,
      invoiceAmount: hasInvoice ? invoiceNum : undefined,
      isDeferred: hasInvoice ? isDeferred : false,
      note: trimmedNote.length > 0 ? trimmedNote : undefined,
    });
    reset();
  }

  const selectClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50';

  return (
    <DetailDrawer
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
      mode="create"
      title={t('inventory.supplyTitle')}
      description={t('inventory.supplyDesc')}
      onSubmit={submit}
      submitting={submitting}
      submitDisabled={!canSubmit}
      submitLabel={t('inventory.supply')}
      cancelLabel={t('common.cancel')}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="sup-emp">
              {t('inventory.employee')} <span className="text-destructive">*</span>
            </Label>
            <select
              id="sup-emp"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className={selectClass}
              disabled={employeesLoading}
            >
              <option value="">{employeesLoading ? t('common.loading') : '—'}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sup-client">
              {t('inventory.client')} <span className="text-destructive">*</span>
            </Label>
            <select
              id="sup-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className={selectClass}
              disabled={clientsLoading}
            >
              <option value="">{clientsLoading ? t('common.loading') : '—'}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t('inventory.supplyItems')}</Label>
            <Button type="button" size="sm" variant="outline" onClick={addLine}>
              <Plus className="size-3" />
              {t('inventory.addItem')}
            </Button>
          </div>
          <div className="space-y-2">
            {lines.map((line, idx) => {
              const selected = itemsById.get(line.inventoryItemId);
              const outOfStock = selected ? line.qty > selected.qty : false;
              return (
                <div key={idx} className="flex items-start gap-2">
                  <select
                    value={line.inventoryItemId}
                    onChange={(e) => updateLine(idx, { inventoryItemId: e.target.value })}
                    className={`${selectClass} flex-1`}
                  >
                    <option value="">{t('inventory.selectItem')}</option>
                    {items.map((it) => (
                      <option key={it.id} value={it.id} disabled={it.qty < 1}>
                        {it.name} ({it.sku}) — {it.qty}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min={1}
                    max={selected?.qty}
                    value={String(line.qty)}
                    onChange={(e) => updateLine(idx, { qty: Number(e.target.value) || 0 })}
                    className="w-24"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    disabled={lines.length === 1}
                    aria-label={t('inventory.removeItem')}
                    className="p-2 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <Trash2 className="size-4" />
                  </button>
                  {outOfStock && (
                    <span className="sr-only">{t('inventory.notEnoughStock')}</span>
                  )}
                </div>
              );
            })}
          </div>
          {hasDup && (
            <p className="text-xs text-destructive">{t('inventory.removeItem')}</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 pt-3 border-t border-border">
          <div>
            <Label htmlFor="sup-install">{t('inventory.needsInstall')}</Label>
            <p className="text-xs text-muted-foreground mt-1">
              {t('inventory.needsInstallDesc')}
            </p>
          </div>
          <Switch
            id="sup-install"
            checked={needsInstall}
            onCheckedChange={setNeedsInstall}
            aria-label={t('inventory.needsInstall')}
          />
        </div>

        <div className="space-y-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="sup-invoice-toggle">{t('inventory.hasInvoice')}</Label>
              <p className="text-xs text-muted-foreground mt-1">
                {t('inventory.hasInvoiceDesc')}
              </p>
            </div>
            <Switch
              id="sup-invoice-toggle"
              checked={hasInvoice}
              onCheckedChange={(v) => {
                setHasInvoice(v);
                if (!v) {
                  setIsDeferred(false);
                  setInvoiceAmount('0');
                }
              }}
              aria-label={t('inventory.hasInvoice')}
            />
          </div>

          {hasInvoice && (
            <div className="space-y-3 ps-2 border-s border-border">
              <div className="space-y-2">
                <Label htmlFor="sup-amount">
                  {t('inventory.invoiceAmount')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="sup-amount"
                  type="number"
                  min={0}
                  step="any"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="sup-deferred">{t('inventory.isDeferred')}</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('inventory.isDeferredDesc')}
                  </p>
                </div>
                <Switch
                  id="sup-deferred"
                  checked={isDeferred}
                  onCheckedChange={setIsDeferred}
                  aria-label={t('inventory.isDeferred')}
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 pt-3 border-t border-border">
          <Label htmlFor="sup-note">{t('inventory.supplyNote')}</Label>
          <textarea
            id="sup-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder={t('inventory.supplyNotePlaceholder')}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
      </div>
    </DetailDrawer>
  );
}
