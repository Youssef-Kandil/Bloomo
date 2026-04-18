'use client';

import axios from 'axios';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Loader2, Plus, Search, UserPlus, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DetailDrawer, DetailRow } from '@/components/shared/DetailDrawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEmployees, type Employee } from '@/hooks/queries/employees';
import {
  useAssignCustody,
  useCreateTool,
  useDeleteTool,
  useReturnCustody,
  useToolCustody,
  useTools,
  useUpdateTool,
  type Tool,
  type ToolCustody,
  type ToolInput,
} from '@/hooks/queries/tools';

type DrawerState =
  | { mode: 'create' }
  | { mode: 'view'; tool: Tool }
  | { mode: 'edit'; tool: Tool }
  | { mode: 'assign'; tool?: Tool }
  | { mode: 'viewCustody'; custody: ToolCustody }
  | null;

export default function ToolsPage() {
  const t = useTranslations();
  const list = useTools();
  const custody = useToolCustody();
  const employees = useEmployees();
  const createMut = useCreateTool();
  const updateMut = useUpdateTool();
  const deleteMut = useDeleteTool();
  const assignMut = useAssignCustody();
  const returnMut = useReturnCustody();

  const activeEmployees = useMemo(
    () => (employees.data?.items ?? []).filter((e) => e.active !== false),
    [employees.data],
  );

  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [query, setQuery] = useState('');
  const [returningId, setReturningId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const tools = list.data?.tools ?? [];
    if (!query.trim()) return tools;
    const q = query.toLowerCase();
    return tools.filter(
      (tt) => tt.name.toLowerCase().includes(q) || tt.code.toLowerCase().includes(q),
    );
  }, [list.data, query]);

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

  function errorMessage(err: unknown): string {
    if (axios.isAxiosError(err)) {
      return (err.response?.data as { message?: string } | undefined)?.message ?? err.message;
    }
    return err instanceof Error ? err.message : String(err);
  }

  async function handleReturn(c: ToolCustody): Promise<void> {
    if (!confirm(t('tools.confirmReturn'))) return;
    setReturningId(c.id);
    try {
      await returnMut.mutateAsync(c.id);
      toast.success(t('tools.returnSuccess'));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setReturningId(null);
    }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.header variants={item} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('tools.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {list.data?.tools?.length ?? 0}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setDrawer({ mode: 'assign' })}>
            <UserPlus className="size-4" />
            {t('tools.assign')}
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
              <Wrench className="size-5 text-primary" />
              {t('tools.title')}
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
              <p className="p-8 text-sm text-muted-foreground text-center">{t('tools.empty')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-start font-medium px-5 py-3">{t('tools.name')}</th>
                      <th className="text-start font-medium px-5 py-3">{t('tools.code')}</th>
                      <th className="text-end font-medium px-5 py-3">{t('tools.available')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((tt, i) => (
                      <motion.tr
                        key={tt.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02, duration: 0.25 }}
                        onClick={() => setDrawer({ mode: 'view', tool: tt })}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                              <Wrench className="size-4" />
                            </div>
                            <span className="font-medium">{tt.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground font-mono text-xs">{tt.code}</td>
                        <td className="px-5 py-3 text-end font-medium">{tt.qty}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-primary" />
              {t('tools.custody')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {custody.isLoading ? (
              <div className="p-6 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-lg shimmer" />
                ))}
              </div>
            ) : (custody.data?.custody?.length ?? 0) === 0 ? (
              <p className="p-8 text-sm text-muted-foreground text-center">
                {t('tools.custodyEmpty')}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-start font-medium px-5 py-3">{t('tools.name')}</th>
                      <th className="text-start font-medium px-5 py-3">
                        {t('employees.title')}
                      </th>
                      <th className="text-end font-medium px-5 py-3">{t('tools.qty')}</th>
                      <th className="text-start font-medium px-5 py-3">
                        {t('tools.assignedAt')}
                      </th>
                      <th className="text-end font-medium px-5 py-3">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {custody.data?.custody?.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => setDrawer({ mode: 'viewCustody', custody: c })}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{c.tool.name}</span>
                            <Badge variant="outline" className="font-mono text-xs">
                              {c.tool.code}
                            </Badge>
                          </div>
                          {c.note && (
                            <p className="mt-1 text-xs text-muted-foreground italic">
                              {c.note}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3">{c.employee.user.name}</td>
                        <td className="px-5 py-3 text-end font-medium">{c.qty}</td>
                        <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                          {new Date(c.assignedAt).toLocaleString(undefined, {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="px-5 py-3 text-end" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReturn(c)}
                            disabled={returningId === c.id}
                          >
                            {returningId === c.id && <Loader2 className="size-4 animate-spin" />}
                            {t('tools.return')}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <ToolFormDrawer
        open={drawer?.mode === 'create'}
        onClose={() => setDrawer(null)}
        title={t('tools.addTitle')}
        description={t('tools.addDesc')}
        submitLabel={t('common.create')}
        onSubmit={async (input) => {
          await createMut.mutateAsync(input);
          setDrawer(null);
        }}
        submitting={createMut.isPending}
      />

      {drawer?.mode === 'edit' && (
        <ToolFormDrawer
          open
          onClose={() => setDrawer(null)}
          title={t('tools.editTitle')}
          description={t('tools.editDesc')}
          submitLabel={t('common.save')}
          initial={drawer.tool}
          onSubmit={async (input) => {
            await updateMut.mutateAsync({ id: drawer.tool.id, ...input });
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
          title={drawer.tool.name}
          description={drawer.tool.code}
          onEdit={() => setDrawer({ mode: 'edit', tool: drawer.tool })}
          onDelete={async () => {
            await deleteMut.mutateAsync(drawer.tool.id);
            setDrawer(null);
          }}
          deleting={deleteMut.isPending}
          editLabel={t('common.edit')}
          deleteLabel={t('common.delete')}
        >
          <div className="flex items-center gap-4 pb-4 mb-4 border-b border-border">
            <div className="flex size-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
              <Wrench className="size-7" />
            </div>
            <div>
              <p className="text-lg font-semibold">{drawer.tool.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{drawer.tool.code}</p>
            </div>
          </div>
          <div className="space-y-1">
            <DetailRow label={t('tools.name')}>
              <span className="font-medium">{drawer.tool.name}</span>
            </DetailRow>
            <DetailRow label={t('tools.code')}>
              <span className="font-mono">{drawer.tool.code}</span>
            </DetailRow>
            <DetailRow label={t('tools.available')}>
              <span className="font-semibold">{drawer.tool.qty}</span>
            </DetailRow>
          </div>
          <div className="mt-6">
            <Button
              type="button"
              variant="gradient"
              className="w-full"
              onClick={() => setDrawer({ mode: 'assign', tool: drawer.tool })}
              disabled={drawer.tool.qty < 1}
            >
              <UserPlus className="size-4" />
              {t('tools.assign')}
            </Button>
          </div>
        </DetailDrawer>
      )}

      {drawer?.mode === 'assign' && (
        <AssignCustodyDrawer
          open
          onClose={() => setDrawer(null)}
          tools={list.data?.tools ?? []}
          employees={activeEmployees}
          employeesLoading={employees.isLoading}
          employeesError={employees.error ? errorMessage(employees.error) : null}
          initialToolId={drawer.tool?.id}
          onSubmit={async (input) => {
            try {
              await assignMut.mutateAsync(input);
              toast.success(t('tools.assignSuccess'));
              setDrawer(null);
            } catch (err) {
              toast.error(errorMessage(err));
              throw err;
            }
          }}
          submitting={assignMut.isPending}
        />
      )}

      {drawer?.mode === 'viewCustody' && (
        <DetailDrawer
          open
          onOpenChange={(o) => !o && setDrawer(null)}
          mode="view"
          title={drawer.custody.tool.name}
          description={drawer.custody.tool.code}
          onDelete={async () => {
            if (!confirm(t('tools.confirmReturn'))) return;
            try {
              await returnMut.mutateAsync(drawer.custody.id);
              toast.success(t('tools.returnSuccess'));
              setDrawer(null);
            } catch (err) {
              toast.error(errorMessage(err));
            }
          }}
          deleting={returnMut.isPending}
          deleteLabel={t('tools.return')}
        >
          <div className="flex items-center gap-4 pb-4 mb-4 border-b border-border">
            <div className="flex size-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
              <Wrench className="size-7" />
            </div>
            <div>
              <p className="text-lg font-semibold">{drawer.custody.tool.name}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {drawer.custody.tool.code}
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <DetailRow label={t('employees.title')}>
              <div className="flex flex-col items-end">
                <span className="font-medium">{drawer.custody.employee.user.name}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {drawer.custody.employee.user.email}
                </span>
              </div>
            </DetailRow>
            <DetailRow label={t('tools.qty')}>
              <span className="font-semibold">{drawer.custody.qty}</span>
            </DetailRow>
            <DetailRow label={t('tools.assignedAt')}>
              <span className="whitespace-nowrap">
                {new Date(drawer.custody.assignedAt).toLocaleString(undefined, {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </DetailRow>
            {drawer.custody.note && (
              <DetailRow label={t('tools.note')}>
                <span className="whitespace-pre-wrap">{drawer.custody.note}</span>
              </DetailRow>
            )}
          </div>
        </DetailDrawer>
      )}
    </motion.div>
  );
}

function ToolFormDrawer({
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
  initial?: Tool;
  onSubmit: (input: ToolInput) => Promise<void>;
  submitting: boolean;
}): React.ReactElement {
  const t = useTranslations();
  const [name, setName] = useState(initial?.name ?? '');
  const [code, setCode] = useState(initial?.code ?? '');
  const [qty, setQty] = useState(String(initial?.qty ?? 0));

  const qtyNum = Number(qty);
  const canSubmit =
    name.trim().length >= 1 &&
    code.trim().length >= 1 &&
    Number.isFinite(qtyNum) &&
    qtyNum >= 0;

  function reset(): void {
    setName(initial?.name ?? '');
    setCode(initial?.code ?? '');
    setQty(String(initial?.qty ?? 0));
  }

  async function submit(): Promise<void> {
    await onSubmit({
      name: name.trim(),
      code: code.trim(),
      qty: qtyNum,
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
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="tool-name">
              {t('tools.name')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tool-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tool-code">
              {t('tools.code')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tool-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={60}
              dir="ltr"
              className="font-mono"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tool-qty">{t('tools.qty')}</Label>
          <Input
            id="tool-qty"
            type="number"
            min={0}
            step={1}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </div>
      </div>
    </DetailDrawer>
  );
}

function AssignCustodyDrawer({
  open,
  onClose,
  tools,
  employees,
  employeesLoading,
  employeesError,
  initialToolId,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  tools: Tool[];
  employees: Employee[];
  employeesLoading: boolean;
  employeesError: string | null;
  initialToolId?: string;
  onSubmit: (input: {
    toolId: string;
    employeeId: string;
    qty: number;
    note?: string;
  }) => Promise<void>;
  submitting: boolean;
}): React.ReactElement {
  const t = useTranslations();

  const [toolId, setToolId] = useState(initialToolId ?? '');
  const [employeeId, setEmployeeId] = useState('');
  const [qty, setQty] = useState('1');
  const [note, setNote] = useState('');

  const selectedTool = tools.find((tt) => tt.id === toolId);
  const qtyNum = Number(qty);
  const outOfStock = Boolean(selectedTool) && qtyNum > (selectedTool?.qty ?? 0);
  const canSubmit =
    toolId !== '' &&
    employeeId !== '' &&
    Number.isFinite(qtyNum) &&
    qtyNum >= 1 &&
    !outOfStock;

  function reset(): void {
    setToolId(initialToolId ?? '');
    setEmployeeId('');
    setQty('1');
    setNote('');
  }

  async function submit(): Promise<void> {
    const trimmed = note.trim();
    await onSubmit({
      toolId,
      employeeId,
      qty: qtyNum,
      note: trimmed.length > 0 ? trimmed : undefined,
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
      title={t('tools.assignTitle')}
      description={t('tools.assignDesc')}
      onSubmit={submit}
      submitting={submitting}
      submitDisabled={!canSubmit}
      submitLabel={t('tools.assign')}
      cancelLabel={t('common.cancel')}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="assign-tool">
            {t('tools.selectTool')} <span className="text-destructive">*</span>
          </Label>
          <select
            id="assign-tool"
            value={toolId}
            onChange={(e) => setToolId(e.target.value)}
            className={selectClass}
          >
            <option value="">—</option>
            {tools.map((tt) => (
              <option key={tt.id} value={tt.id} disabled={tt.qty < 1}>
                {tt.name} ({tt.code}) — {t('tools.available')}: {tt.qty}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="assign-employee">
            {t('tools.selectEmployee')} <span className="text-destructive">*</span>
          </Label>
          <select
            id="assign-employee"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className={selectClass}
            disabled={employeesLoading}
          >
            <option value="">
              {employeesLoading ? t('common.loading') : '—'}
            </option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} — {emp.email}
              </option>
            ))}
          </select>
          {employeesError && (
            <p className="text-xs text-destructive">{employeesError}</p>
          )}
          {!employeesLoading && !employeesError && employees.length === 0 && (
            <p className="text-xs text-muted-foreground">{t('employees.title')}: 0</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="assign-qty">
            {t('tools.qty')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="assign-qty"
            type="number"
            min={1}
            step={1}
            max={selectedTool?.qty}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
          {selectedTool && (
            <p className="text-xs text-muted-foreground">
              {t('tools.available')}: {selectedTool.qty}
            </p>
          )}
          {outOfStock && (
            <p className="text-xs text-destructive">{t('tools.notEnough')}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="assign-note">{t('tools.noteOptional')}</Label>
          <textarea
            id="assign-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder={t('tools.notePlaceholder')}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
      </div>
    </DetailDrawer>
  );
}
