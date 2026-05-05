'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
  AlarmClock,
  Calendar,
  CheckCircle2,
  CircleDashed,
  Clock,
  CoinsIcon,
  Flag,
  Flame,
  Hammer,
  ListChecks,
  PackagePlus,
  PlayCircle,
  Plus,
  Search,
  Search as InspectIcon,
  Settings2,
  Truck,
  User,
  UserSquare2,
  Wrench,
  X,
} from 'lucide-react';
import { useMemo, useState, type ComponentType } from 'react';
import { toast } from 'sonner';

import {
  DateRangeFilter,
  rangeFromPreset,
  type DateRangeValue,
} from '@/components/shared/DateRangeFilter';
import { DetailDrawer, DetailRow } from '@/components/shared/DetailDrawer';
import { Pagination } from '@/components/shared/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMe } from '@/hooks/queries/auth';
import { useClients } from '@/hooks/queries/clients';
import {
  TASK_TYPES,
  useApproveCollection,
  useCompanyUsers,
  useCreateTask,
  useDeleteTask,
  useRejectCollection,
  useTasks,
  useUpdateTask,
  type CreateTaskInput,
  type Task,
  type TaskPriority,
  type TaskStatus,
  type TaskType,
  type TaskUser,
} from '@/hooks/queries/tasks';
import { cn } from '@/lib/utils';

type DrawerState =
  | { mode: 'create' }
  | { mode: 'view'; task: Task }
  | { mode: 'edit'; task: Task }
  | null;

const STATUSES: TaskStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'PENDING_APPROVAL',
  'COMPLETED',
  'CANCELED',
];
const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const STATUS_META: Record<
  TaskStatus,
  { labelKey: string; icon: ComponentType<{ className?: string }>; className: string }
> = {
  PENDING: { labelKey: 'tasks.pending', icon: CircleDashed, className: 'text-muted-foreground' },
  IN_PROGRESS: { labelKey: 'tasks.inProgress', icon: PlayCircle, className: 'text-[hsl(var(--warning))]' },
  PENDING_APPROVAL: {
    labelKey: 'tasks.pendingApproval',
    icon: CircleDashed,
    className: 'text-[hsl(var(--warning))]',
  },
  COMPLETED: { labelKey: 'tasks.completed', icon: CheckCircle2, className: 'text-[hsl(var(--success))]' },
  CANCELED: { labelKey: 'tasks.canceled', icon: X, className: 'text-destructive' },
};

const TYPE_META: Record<
  TaskType,
  { labelKey: string; icon: ComponentType<{ className?: string }>; color: string }
> = {
  COLLECTION: { labelKey: 'tasks.typeCOLLECTION', icon: CoinsIcon, color: 'text-amber-500 bg-amber-500/10' },
  SUPPLY: { labelKey: 'tasks.typeSUPPLY', icon: Truck, color: 'text-sky-500 bg-sky-500/10' },
  INSTALL: { labelKey: 'tasks.typeINSTALL', icon: Hammer, color: 'text-violet-500 bg-violet-500/10' },
  SUPPLY_INSTALL: {
    labelKey: 'tasks.typeSUPPLY_INSTALL',
    icon: PackagePlus,
    color: 'text-indigo-500 bg-indigo-500/10',
  },
  INSPECTION: { labelKey: 'tasks.typeINSPECTION', icon: InspectIcon, color: 'text-cyan-500 bg-cyan-500/10' },
  MAINTENANCE: { labelKey: 'tasks.typeMAINTENANCE', icon: Settings2, color: 'text-emerald-500 bg-emerald-500/10' },
  REPAIR: { labelKey: 'tasks.typeREPAIR', icon: Wrench, color: 'text-rose-500 bg-rose-500/10' },
  OTHER: { labelKey: 'tasks.typeOTHER', icon: ListChecks, color: 'text-slate-500 bg-slate-500/10' },
};

const PRIORITY_META: Record<
  TaskPriority,
  { labelKey: string; className: string }
> = {
  LOW: { labelKey: 'tasks.low', className: 'text-muted-foreground bg-muted' },
  MEDIUM: { labelKey: 'tasks.medium', className: 'text-primary bg-primary/10' },
  HIGH: { labelKey: 'tasks.high', className: 'text-[hsl(var(--warning))] bg-[hsl(var(--warning)/0.15)]' },
  URGENT: { labelKey: 'tasks.urgent', className: 'text-destructive bg-destructive/10' },
};

export default function TasksPage() {
  const t = useTranslations();
  const me = useMe();
  const [status, setStatus] = useState<TaskStatus | 'ALL'>('ALL');
  const [query, setQuery] = useState('');
  const list = useTasks({ status: status === 'ALL' ? undefined : status, q: query });
  const createMut = useCreateTask();
  const updateMut = useUpdateTask();
  const deleteMut = useDeleteTask();
  const approveMut = useApproveCollection();
  const rejectMut = useRejectCollection();

  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => ({
    preset: 'currentWeek',
    ...rangeFromPreset('currentWeek'),
  }));

  const allItems = list.data?.items ?? [];
  const items = useMemo(() => {
    if (!dateRange.from && !dateRange.to) return allItems;
    const fromTs = dateRange.from ? new Date(dateRange.from).getTime() : -Infinity;
    const toTs = dateRange.to
      ? new Date(`${dateRange.to}T23:59:59.999Z`).getTime()
      : Infinity;
    return allItems.filter((tk) => {
      const ts = new Date(tk.createdAt).getTime();
      return ts >= fromTs && ts <= toTs;
    });
  }, [allItems, dateRange.from, dateRange.to]);

  const tasksPg = usePagination(items);

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
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('tasks.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{list.data?.total ?? 0}</p>
        </div>
        <Button variant="gradient" onClick={() => setDrawer({ mode: 'create' })}>
          <Plus className="size-4" />
          {t('common.create')}
        </Button>
      </motion.header>

      <motion.div variants={item}>
        <Card>
          <CardHeader className="flex-col md:flex-row md:items-center md:justify-between gap-3 space-y-0">
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="size-5 text-primary" />
              {t('tasks.title')}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
                <FilterChip active={status === 'ALL'} onClick={() => setStatus('ALL')}>
                  {t('tasks.filterAll')}
                </FilterChip>
                {STATUSES.map((s) => {
                  const meta = STATUS_META[s];
                  const Icon = meta.icon;
                  return (
                    <FilterChip key={s} active={status === s} onClick={() => setStatus(s)}>
                      <Icon className={cn('size-3.5', meta.className)} />
                      {t(meta.labelKey)}
                    </FilterChip>
                  );
                })}
              </div>
              <div className="relative w-full sm:w-48">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder={t('common.search')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="ps-10 h-9"
                />
              </div>
            </div>
          </CardHeader>
          <div className="px-6 pt-2">
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
          </div>
          <CardContent className="p-0">
            {list.isLoading ? (
              <div className="p-6 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-lg shimmer" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="p-8 text-sm text-muted-foreground text-center">{t('tasks.empty')}</p>
            ) : (
              <ul className="divide-y divide-border">
                {tasksPg.paginated.map((task, i) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    index={i}
                    onClick={() => setDrawer({ mode: 'view', task })}
                    onToggleStatus={(next) =>
                      updateMut.mutate({ id: task.id, status: next })
                    }
                  />
                ))}
              </ul>
            )}
            <Pagination
              page={tasksPg.page}
              pageCount={tasksPg.pageCount}
              onPageChange={tasksPg.setPage}
              totalCount={tasksPg.totalCount}
              firstIndex={tasksPg.firstIndex}
              lastIndex={tasksPg.lastIndex}
            />
          </CardContent>
        </Card>
      </motion.div>

      <TaskFormDrawer
        open={drawer?.mode === 'create'}
        onClose={() => setDrawer(null)}
        title={t('tasks.addTitle')}
        description={t('tasks.addDesc')}
        submitLabel={t('common.create')}
        defaultAssigneeId={me.data?.id}
        onSubmit={async (input) => {
          await createMut.mutateAsync(input);
          setDrawer(null);
        }}
        submitting={createMut.isPending}
      />

      {drawer?.mode === 'edit' && (
        <TaskFormDrawer
          open
          onClose={() => setDrawer(null)}
          title={t('tasks.editTitle')}
          description={t('tasks.editDesc')}
          submitLabel={t('common.save')}
          initial={drawer.task}
          onSubmit={async (input) => {
            await updateMut.mutateAsync({ id: drawer.task.id, ...input });
            setDrawer(null);
          }}
          submitting={updateMut.isPending}
        />
      )}

      {drawer?.mode === 'view' && (
        <TaskViewDrawer
          task={drawer.task}
          onClose={() => setDrawer(null)}
          onEdit={() => setDrawer({ mode: 'edit', task: drawer.task })}
          onDelete={async () => {
            await deleteMut.mutateAsync(drawer.task.id);
            setDrawer(null);
          }}
          deleting={deleteMut.isPending}
          onStatusChange={(status) =>
            updateMut.mutate({ id: drawer.task.id, status }, {
              onSuccess: (t) => setDrawer({ mode: 'view', task: t }),
            })
          }
          onApprove={() =>
            approveMut.mutate(drawer.task.id, {
              onSuccess: (t) => {
                toast.success(t ? t.title : 'OK');
                setDrawer(null);
              },
              onError: (err: unknown) => {
                const msg =
                  (err as { response?: { data?: { error?: { message?: string } } } })?.response
                    ?.data?.error?.message ?? 'Failed';
                toast.error(msg);
              },
            })
          }
          onReject={() =>
            rejectMut.mutate(drawer.task.id, {
              onSuccess: (t) => setDrawer({ mode: 'view', task: t }),
              onError: (err: unknown) => {
                const msg =
                  (err as { response?: { data?: { error?: { message?: string } } } })?.response
                    ?.data?.error?.message ?? 'Failed';
                toast.error(msg);
              },
            })
          }
          approving={approveMut.isPending || rejectMut.isPending}
        />
      )}
    </motion.div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-2.5 h-7 text-xs font-medium transition-all',
        active
          ? 'bg-card text-foreground shadow-soft'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function TaskRow({
  task,
  index,
  onClick,
  onToggleStatus,
}: {
  task: Task;
  index: number;
  onClick: () => void;
  onToggleStatus: (next: TaskStatus) => void;
}): React.ReactElement {
  const t = useTranslations();
  const meta = STATUS_META[task.status];
  const StatusIcon = meta.icon;
  const overdue =
    task.plannedEnd &&
    task.status !== 'COMPLETED' &&
    task.status !== 'CANCELED' &&
    new Date(task.plannedEnd).getTime() < Date.now();

  function nextStatus(): TaskStatus {
    if (task.status === 'PENDING') return 'IN_PROGRESS';
    if (task.status === 'IN_PROGRESS') return 'COMPLETED';
    return 'PENDING';
  }

  return (
    <motion.li
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.25 }}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-muted/50',
        task.status === 'COMPLETED' && 'opacity-70',
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleStatus(nextStatus());
        }}
        className={cn(
          'shrink-0 flex size-7 items-center justify-center rounded-full border-2 transition-colors',
          task.status === 'COMPLETED'
            ? 'border-[hsl(var(--success))] bg-[hsl(var(--success))]'
            : task.status === 'IN_PROGRESS'
              ? 'border-[hsl(var(--warning))]'
              : 'border-border group-hover:border-primary',
        )}
        aria-label={t('tasks.status')}
      >
        {task.status === 'COMPLETED' && <CheckCircle2 className="size-4 text-white" />}
        {task.status === 'IN_PROGRESS' && (
          <PlayCircle className="size-4 text-[hsl(var(--warning))]" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p
            className={cn(
              'font-medium truncate',
              task.status === 'COMPLETED' && 'line-through text-muted-foreground',
            )}
          >
            {task.title}
          </p>
          <TypeBadge type={task.type} />
          <PriorityBadge priority={task.priority} />
          {overdue && (
            <Badge variant="destructive" className="gap-1 text-[10px]">
              <AlarmClock className="size-3" />
              {t('tasks.overdue')}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
          <span className="flex items-center gap-1">
            <User className="size-3" />
            {task.assignee.name}
          </span>
          {task.client && (
            <span className="flex items-center gap-1">
              <UserSquare2 className="size-3" />
              {task.client.name}
            </span>
          )}
          {task.plannedStart && (
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              {new Date(task.plannedStart).toLocaleDateString()}
              {task.plannedEnd && ` → ${new Date(task.plannedEnd).toLocaleDateString()}`}
            </span>
          )}
          {task.type === 'COLLECTION' && task.collectionAmount != null && (
            <span className="flex items-center gap-1 font-mono text-primary font-medium">
              <CoinsIcon className="size-3" />
              {task.collectionAmount.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      <Avatar className="size-8 hidden sm:flex">
        <AvatarFallback className="text-[10px]">{initialsOf(task.assignee.name)}</AvatarFallback>
      </Avatar>

      <StatusIcon className={cn('size-4', meta.className)} />
    </motion.li>
  );
}

function TypeBadge({ type }: { type: TaskType }): React.ReactElement {
  const t = useTranslations();
  const meta = TYPE_META[type];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
        meta.color,
      )}
    >
      <Icon className="size-3" />
      {t(meta.labelKey)}
    </span>
  );
}

function DateCard({
  label,
  start,
  end,
  emptyLabel,
}: {
  label: string;
  start: string | null;
  end: string | null;
  emptyLabel?: string;
}): React.ReactElement {
  const t = useTranslations();
  const fmt = (d: string) => new Date(d).toLocaleString();
  const none = emptyLabel ?? t('tasks.noDue');
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
        {label}
      </p>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-1.5">
          <Calendar className="size-3 text-muted-foreground" />
          <span className={cn(!start && 'text-muted-foreground')}>
            {start ? fmt(start) : none}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="size-3 text-muted-foreground" />
          <span className={cn(!end && 'text-muted-foreground')}>{end ? fmt(end) : none}</span>
        </div>
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: TaskPriority }): React.ReactElement {
  const t = useTranslations();
  const meta = PRIORITY_META[priority];
  const Icon = priority === 'URGENT' ? Flame : Flag;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
        meta.className,
      )}
    >
      <Icon className="size-3" />
      {t(meta.labelKey)}
    </span>
  );
}

function TaskViewDrawer({
  task,
  onClose,
  onEdit,
  onDelete,
  deleting,
  onStatusChange,
  onApprove,
  onReject,
  approving,
}: {
  task: Task;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  deleting: boolean;
  onStatusChange: (status: TaskStatus) => void;
  onApprove: () => void;
  onReject: () => void;
  approving: boolean;
}): React.ReactElement {
  const t = useTranslations();
  const meta = STATUS_META[task.status];
  const StatusIcon = meta.icon;
  const isPendingApproval = task.status === 'PENDING_APPROVAL';
  const isCollection = task.type === 'COLLECTION';

  return (
    <DetailDrawer
      open
      onOpenChange={(o) => !o && onClose()}
      mode="view"
      title={task.title}
      description={task.description ?? undefined}
      onEdit={onEdit}
      onDelete={onDelete}
      deleting={deleting}
      editLabel={t('common.edit')}
      deleteLabel={t('common.delete')}
    >
      <div className="flex items-center gap-2 flex-wrap pb-4 mb-4 border-b border-border">
        <StatusIcon className={cn('size-5', meta.className)} />
        <span className="font-medium">{t(meta.labelKey)}</span>
        <TypeBadge type={task.type} />
        <PriorityBadge priority={task.priority} />
      </div>

      <div className="space-y-1">
        <DetailRow label={t('tasks.assignee')}>
          <span className="flex items-center gap-2">
            <Avatar className="size-6">
              <AvatarFallback className="text-[9px]">
                {initialsOf(task.assignee.name)}
              </AvatarFallback>
            </Avatar>
            <span>{task.assignee.name}</span>
          </span>
        </DetailRow>
        <DetailRow label={t('tasks.createdBy')}>{task.createdBy.name}</DetailRow>
        <DetailRow label={t('tasks.client')}>
          {task.client ? (
            task.client.name
          ) : (
            <span className="text-muted-foreground">{t('tasks.noClient')}</span>
          )}
        </DetailRow>
        {task.description && (
          <DetailRow label={t('tasks.description')}>
            <span className="whitespace-pre-wrap text-start">{task.description}</span>
          </DetailRow>
        )}
        {task.collectionAmount != null && (
          <DetailRow label={t('tasks.collectionAmount')}>
            <span className="font-mono font-semibold text-primary">
              {task.collectionAmount.toLocaleString()}
            </span>
          </DetailRow>
        )}
        {task.approvedAt && (
          <DetailRow label={t('tasks.approvedAt')}>
            <span className="whitespace-nowrap">
              {new Date(task.approvedAt).toLocaleString()}
            </span>
          </DetailRow>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <DateCard
          label={t('tasks.plannedRange')}
          start={task.plannedStart}
          end={task.plannedEnd}
        />
        <DateCard
          label={t('tasks.actualRange')}
          start={task.actualStart}
          end={task.actualEnd}
          emptyLabel={t('tasks.notStarted')}
        />
      </div>

      {isCollection && isPendingApproval && (
        <div className="mt-6 rounded-lg border border-[hsl(var(--warning)/0.4)] bg-[hsl(var(--warning)/0.08)] p-3 text-xs">
          {t('tasks.approvalHint')}
        </div>
      )}

      {isCollection && !isPendingApproval && task.status !== 'COMPLETED' && (
        <div className="mt-6 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          {t('tasks.collectionWaitEmployee')}
        </div>
      )}

      <div className="mt-6 flex gap-2 flex-wrap">
        {isCollection && isPendingApproval ? (
          <>
            <Button size="sm" onClick={onApprove} disabled={approving}>
              <CheckCircle2 className="size-4" />
              {t('tasks.approve')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onReject}
              disabled={approving}
            >
              <X className="size-4" />
              {t('tasks.reject')}
            </Button>
          </>
        ) : isCollection ? (
          // Collection tasks cannot be force-completed by admin/manager; they
          // must go through the approval flow triggered by the employee.
          null
        ) : (
          <>
            {task.status !== 'IN_PROGRESS' &&
              task.status !== 'COMPLETED' &&
              task.status !== 'PENDING_APPROVAL' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStatusChange('IN_PROGRESS')}
                >
                  <PlayCircle className="size-4" />
                  {t('tasks.markInProgress')}
                </Button>
              )}
            {task.status !== 'COMPLETED' && task.status !== 'PENDING_APPROVAL' && (
              <Button size="sm" onClick={() => onStatusChange('COMPLETED')}>
                <CheckCircle2 className="size-4" />
                {t('tasks.markComplete')}
              </Button>
            )}
          </>
        )}
      </div>
    </DetailDrawer>
  );
}

function TaskFormDrawer({
  open,
  onClose,
  title,
  description,
  submitLabel,
  initial,
  defaultAssigneeId,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  submitLabel: string;
  initial?: Task;
  defaultAssigneeId?: string;
  onSubmit: (input: CreateTaskInput) => Promise<void>;
  submitting: boolean;
}): React.ReactElement {
  const t = useTranslations();
  const me = useMe();
  const users = useCompanyUsers();

  const clients = useClients();

  const [titleVal, setTitle] = useState(initial?.title ?? '');
  const [desc, setDesc] = useState(initial?.description ?? '');
  const [type, setType] = useState<TaskType | ''>(initial?.type ?? '');
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority ?? 'MEDIUM');
  const [assigneeId, setAssigneeId] = useState<string>(
    initial?.assignee.id ?? defaultAssigneeId ?? '',
  );
  const [clientId, setClientId] = useState<string>(initial?.client?.id ?? '');
  const [collectionAmount, setCollectionAmount] = useState<string>(
    initial?.collectionAmount != null ? String(initial.collectionAmount) : '',
  );
  const [plannedStart, setPlannedStart] = useState(
    initial?.plannedStart ? toDatetimeLocal(new Date(initial.plannedStart)) : '',
  );
  const [plannedEnd, setPlannedEnd] = useState(
    initial?.plannedEnd ? toDatetimeLocal(new Date(initial.plannedEnd)) : '',
  );

  const isCollection = type === 'COLLECTION';
  const amountNum = Number(collectionAmount);
  const amountValid = !isCollection || (Number.isFinite(amountNum) && amountNum > 0);
  const clientOk = !isCollection || clientId.length > 0;
  const plannedRangeOk =
    !plannedStart || !plannedEnd || new Date(plannedEnd) >= new Date(plannedStart);
  const canSubmit =
    titleVal.trim().length >= 2 &&
    assigneeId.length > 0 &&
    type !== '' &&
    clientOk &&
    amountValid &&
    plannedRangeOk;

  async function submit(): Promise<void> {
    if (type === '') return;
    await onSubmit({
      title: titleVal.trim(),
      description: desc.trim() || undefined,
      priority,
      type,
      assigneeId,
      clientId: clientId || null,
      collectionAmount: isCollection ? amountNum : undefined,
      plannedStart: plannedStart ? new Date(plannedStart).toISOString() : null,
      plannedEnd: plannedEnd ? new Date(plannedEnd).toISOString() : null,
    });
  }

  const userOptions = useMemo(() => {
    const list = users.data ?? [];
    if (me.data && !list.find((u) => u.id === me.data?.id)) {
      return [
        {
          id: me.data.id,
          name: me.data.name,
          email: me.data.email,
          role: me.data.role,
        } as TaskUser,
        ...list,
      ];
    }
    return list;
  }, [users.data, me.data]);

  return (
    <DetailDrawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
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
          <Label htmlFor="task-title">
            {t('tasks.taskTitle')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="task-title"
            value={titleVal}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={160}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-desc">{t('tasks.description')}</Label>
          <textarea
            id="task-desc"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder={t('tasks.descriptionPlaceholder')}
            maxLength={4000}
            rows={3}
            className="flex w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm text-foreground shadow-soft placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label>
            {t('tasks.type')} <span className="text-destructive">*</span>
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TASK_TYPES.map((tp) => {
              const meta = TYPE_META[tp];
              const Icon = meta.icon;
              const active = type === tp;
              return (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setType(tp)}
                  className={cn(
                    'group flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all',
                    active
                      ? 'border-primary bg-primary/5 shadow-soft'
                      : 'border-border bg-card hover:bg-muted/50',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-7 items-center justify-center rounded-md transition-transform',
                      meta.color,
                      active && 'scale-110',
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="truncate">{t(meta.labelKey)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="task-assignee">
              {t('tasks.assignee')} <span className="text-destructive">*</span>
            </Label>
            {me.data && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAssigneeId(me.data!.id)}
                disabled={assigneeId === me.data.id}
              >
                <User className="size-3.5" />
                {t('tasks.assignToMe')}
              </Button>
            )}
          </div>
          <select
            id="task-assignee"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">—</option>
            {userOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} {u.role ? `· ${u.role}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>{t('tasks.priority')}</Label>
            <div className="grid grid-cols-4 gap-1">
              {PRIORITIES.map((p) => {
                const meta = PRIORITY_META[p];
                const active = priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      'rounded-md px-2 py-1.5 text-[11px] font-medium transition-all border',
                      active
                        ? cn(meta.className, 'border-current shadow-soft')
                        : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted',
                    )}
                  >
                    {t(meta.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-client">
              {isCollection ? t('tasks.client') : t('tasks.clientOptional')}
              {isCollection && <span className="text-destructive ms-1">*</span>}
            </Label>
            <select
              id="task-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">— {t('tasks.noClient')} —</option>
              {(clients.data?.items ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isCollection && (
          <div className="space-y-2">
            <Label htmlFor="task-collection-amount">
              {t('tasks.collectionAmount')}
              <span className="text-destructive ms-1">*</span>
            </Label>
            <Input
              id="task-collection-amount"
              type="number"
              min={0}
              step="any"
              value={collectionAmount}
              onChange={(e) => setCollectionAmount(e.target.value)}
              placeholder="0"
            />
            {!amountValid && collectionAmount !== '' && (
              <p className="text-xs text-destructive">{t('tasks.collectionAmountInvalid')}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="task-planned-start">{t('tasks.plannedStart')}</Label>
            <div className="relative">
              <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                id="task-planned-start"
                type="datetime-local"
                value={plannedStart}
                onChange={(e) => setPlannedStart(e.target.value)}
                className="ps-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-planned-end">{t('tasks.plannedEnd')}</Label>
            <div className="relative">
              <Clock className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                id="task-planned-end"
                type="datetime-local"
                value={plannedEnd}
                onChange={(e) => setPlannedEnd(e.target.value)}
                className={cn(
                  'ps-10',
                  !plannedRangeOk && 'border-destructive focus-visible:ring-destructive',
                )}
              />
            </div>
          </div>
        </div>
        {!plannedRangeOk && (
          <p className="text-xs text-destructive">{t('tasks.dateRangeError')}</p>
        )}
      </div>
    </DetailDrawer>
  );
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

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
