'use client';

import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Pagination } from '@/components/shared/Pagination';
import {
  TableSearch,
  TableShell,
  TableToolbar,
  stickyTheadClass,
} from '@/components/shared/TableShell';
import { usePagination } from '@/hooks/usePagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMe } from '@/hooks/queries/auth';
import {
  useDecideLeave,
  useDecideOvertime,
  useDecideSalaryAdvance,
  useLeaveRequests,
  useMyLeaveRequests,
  useMyOvertimeRequests,
  useMySalaryAdvances,
  useOvertimeRequests,
  useSalaryAdvances,
  useSubmitLeave,
  useSubmitOvertime,
  useSubmitSalaryAdvance,
  type LeaveRequest,
  type OvertimeRequest,
  type SalaryAdvanceRequest,
} from '@/hooks/queries/hr-requests';
import {
  useDecideOffDayRequest,
  useMyOffDayRequests,
  useOffDayRequests,
  useSubmitOffDayRequest,
  type OffDayRequest,
} from '@/hooks/queries/offday';
import { api } from '@/lib/api';

interface AttendanceRow {
  id: string;
  type: 'CHECK_IN' | 'CHECK_OUT';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  rejectReason?: string | null;
  employee?: { user: { name: string } };
}

type AttendanceBlockReason =
  | 'OFF_DAY_NEEDS_APPROVED_REQUEST'
  | 'ALREADY_CHECKED_IN'
  | 'NOT_CHECKED_IN'
  | 'ALREADY_CHECKED_OUT'
  | 'COMPLETED_NEEDS_OVERTIME_APPROVAL'
  | 'OVERTIME_DAY_DONE';

interface AttendanceStateView {
  canCheckIn: boolean;
  canCheckOut: boolean;
  reason: AttendanceBlockReason | null;
  isOffDay: boolean;
  hasOffDayApproval: boolean;
  hasOvertimeApproval: boolean;
  todayCheckIns: number;
  todayCheckOuts: number;
  lastCheckInAt: string | null;
  lastCheckOutAt: string | null;
}

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { error?: { message?: string } })?.error?.message ?? err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

interface OnDutyEmployee {
  employeeId: string;
  name: string;
  lastCheckInAt: string | null;
}

function StaffForceCheckoutCard(): React.ReactElement {
  const t = useTranslations();
  const qc = useQueryClient();

  const onDuty = useQuery({
    queryKey: ['attendance', 'on-duty'],
    queryFn: async () => {
      const res = await api.get<{ items: OnDutyEmployee[] }>('/api/attendance/on-duty');
      return res.data.items;
    },
    refetchInterval: 30_000,
  });

  const forceMut = useMutation({
    mutationFn: async (employeeId: string) =>
      (await api.post(`/api/attendance/employees/${employeeId}/check-out`)).data,
    // Optimistic: drop the row from the on-duty list immediately so the box
    // updates before the refetch lands.
    onMutate: async (employeeId: string) => {
      await qc.cancelQueries({ queryKey: ['attendance', 'on-duty'] });
      const prev = qc.getQueryData<OnDutyEmployee[]>(['attendance', 'on-duty']);
      qc.setQueryData<OnDutyEmployee[]>(['attendance', 'on-duty'], (old) =>
        (old ?? []).filter((u) => u.employeeId !== employeeId),
      );
      return { prev };
    },
    onSuccess: () => {
      toast.success(t('attendance.forceCheckOutSuccess'));
      qc.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['attendance', 'on-duty'], ctx.prev);
      toast.error(errorMessage(err));
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('attendance.forceCheckOutTitle')}</CardTitle>
        <p className="text-xs text-muted-foreground">{t('attendance.forceCheckOutHint')}</p>
      </CardHeader>
      <CardContent>
        {onDuty.isLoading && <div className="h-12 rounded-lg shimmer" />}
        {!onDuty.isLoading && (onDuty.data?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('attendance.noOnDuty')}
          </p>
        )}
        {(onDuty.data?.length ?? 0) > 0 && (
          <ul className="space-y-2">
            {onDuty.data?.map((u) => (
              <li
                key={u.employeeId}
                className="flex items-center justify-between rounded-xl border border-border p-2.5"
              >
                <div className="min-w-0">
                  <span className="text-sm font-medium block">{u.name}</span>
                  {u.lastCheckInAt && (
                    <span className="text-xs text-muted-foreground">
                      {t('attendance.checkInAt')}:{' '}
                      {new Date(u.lastCheckInAt).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => forceMut.mutate(u.employeeId)}
                  disabled={forceMut.isPending}
                >
                  {t('attendance.forceCheckOutCta')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function EmployeeAttendanceActions({
  state,
  submitting,
  onCheckIn,
  onCheckOut,
}: {
  state: AttendanceStateView | undefined;
  submitting: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
}): React.ReactElement {
  const t = useTranslations();
  const reasonText = state?.reason ? t(`attendance.reasons.${state.reason}`) : '';
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={onCheckIn}
          disabled={submitting || !state?.canCheckIn}
          title={!state?.canCheckIn ? reasonText : undefined}
        >
          {t('attendance.checkIn')}
        </Button>
        <Button
          variant="outline"
          onClick={onCheckOut}
          disabled={submitting || !state?.canCheckOut}
          title={!state?.canCheckOut ? reasonText : undefined}
        >
          {t('attendance.checkOut')}
        </Button>
        {state?.lastCheckInAt && (
          <span className="ms-auto text-xs text-muted-foreground self-center tabular-nums">
            {t('attendance.checkInAt')}:{' '}
            {new Date(state.lastCheckInAt).toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {state.lastCheckOutAt && (
              <>
                {' · '}
                {t('attendance.checkOutAt')}:{' '}
                {new Date(state.lastCheckOutAt).toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </>
            )}
          </span>
        )}
      </div>
      {state && !state.canCheckIn && !state.canCheckOut && state.reason && (
        <p className="text-xs text-muted-foreground">{reasonText}</p>
      )}
      {state && state.isOffDay && state.hasOffDayApproval && (
        <p className="text-xs text-emerald-600">{t('attendance.offDayApprovedActive')}</p>
      )}
      {state && state.hasOvertimeApproval && (
        <p className="text-xs text-amber-600">{t('attendance.overtimeApprovedActive')}</p>
      )}
    </div>
  );
}

function statusBadge(status: 'PENDING' | 'APPROVED' | 'REJECTED', t: ReturnType<typeof useTranslations>) {
  if (status === 'APPROVED') return <Badge>{t('attendance.approved')}</Badge>;
  if (status === 'REJECTED') return <Badge variant="destructive">{t('attendance.rejected')}</Badge>;
  return <Badge variant="outline">{t('attendance.pending')}</Badge>;
}

export default function AttendancePage() {
  const t = useTranslations();
  const me = useMe();
  const qc = useQueryClient();

  const isStaff = me.data?.role === 'ADMIN' || me.data?.role === 'MANAGER';
  const isEmployee = me.data?.role === 'EMPLOYEE';
  const path = isStaff ? '/api/attendance' : '/api/attendance/mine';
  const list = useQuery({
    queryKey: ['attendance', isStaff ? 'all' : 'mine'],
    enabled: !!me.data,
    queryFn: async () => (await api.get<{ items: AttendanceRow[] }>(path)).data.items,
  });

  const submit = useMutation({
    mutationFn: async (type: 'CHECK_IN' | 'CHECK_OUT') =>
      (await api.post('/api/attendance', { type })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
      qc.invalidateQueries({ queryKey: ['attendance', 'state'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const stateQuery = useQuery({
    queryKey: ['attendance', 'state'],
    enabled: isEmployee,
    queryFn: async () =>
      (await api.get<{ state: AttendanceStateView }>('/api/attendance/state')).data.state,
    refetchInterval: 30_000,
  });

  const decide = useMutation({
    mutationFn: async (vars: { id: string; approve: boolean; reason?: string }) =>
      (await api.post(`/api/attendance/${vars.id}/decide`, vars)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('nav.attendance')}</h1>

      {isEmployee && (
        <EmployeeAttendanceActions
          state={stateQuery.data}
          submitting={submit.isPending}
          onCheckIn={() => submit.mutate('CHECK_IN')}
          onCheckOut={() => submit.mutate('CHECK_OUT')}
        />
      )}

      {isStaff && <StaffForceCheckoutCard />}

      <AttendanceTable
        rows={list.data ?? []}
        isStaff={isStaff}
        onApprove={(id) => decide.mutate({ id, approve: true })}
        onReject={(id) => {
          const reason = prompt(t('attendance.rejectReason'));
          if (reason) decide.mutate({ id, approve: false, reason });
        }}
      />

      {isEmployee && <EmployeeOffDaySection />}
      {isStaff && <StaffOffDaySection />}

      {isEmployee && <EmployeeOvertimeSection />}
      {isStaff && <StaffOvertimeSection />}

      {isEmployee && <EmployeeLeaveSection />}
      {isStaff && <StaffLeaveSection />}

      {isEmployee && <EmployeeAdvanceSection />}
      {isStaff && <StaffAdvanceSection />}
    </div>
  );
}

function AttendanceTable({
  rows,
  isStaff,
  onApprove,
  onReject,
}: {
  rows: AttendanceRow[];
  isStaff: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}): React.ReactElement {
  const t = useTranslations();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'ALL' | 'CHECK_IN' | 'CHECK_OUT'>('ALL');
  const [status, setStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (type !== 'ALL' && r.type !== type) return false;
      if (status !== 'ALL' && r.status !== status) return false;
      if (s) {
        const hay = `${r.employee?.user.name ?? ''} ${r.requestedAt}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [rows, search, type, status]);

  const pg = usePagination(filtered);

  const selectClass =
    'rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring h-9';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('nav.attendance')}</CardTitle>
      </CardHeader>
      <CardContent>
        <TableToolbar>
          <TableSearch
            value={search}
            onChange={setSearch}
            placeholder={t('attendance.searchPlaceholder')}
          />
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className={selectClass}>
            <option value="ALL">{t('attendance.filterAllTypes')}</option>
            <option value="CHECK_IN">{t('attendance.checkIn')}</option>
            <option value="CHECK_OUT">{t('attendance.checkOut')}</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={selectClass}>
            <option value="ALL">{t('attendance.filterAllStatuses')}</option>
            <option value="PENDING">{t('attendance.pending')}</option>
            <option value="APPROVED">{t('attendance.approved')}</option>
            <option value="REJECTED">{t('attendance.rejected')}</option>
          </select>
          <span className="text-xs text-muted-foreground ms-auto">
            {filtered.length} / {rows.length}
          </span>
        </TableToolbar>

        <TableShell maxHeight="32rem">
          <table className="w-full text-sm">
            <thead className={stickyTheadClass}>
              <tr>
                {isStaff && <th className="text-start font-medium px-5 py-3">{t('employees.name')}</th>}
                <th className="text-start font-medium px-5 py-3">{t('attendance.type')}</th>
                <th className="text-start font-medium px-5 py-3">{t('attendance.when')}</th>
                <th className="text-start font-medium px-5 py-3">{t('common.status')}</th>
                {isStaff && <th className="text-end font-medium px-5 py-3">{t('common.actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pg.paginated.map((r) => (
                <tr key={r.id} className="hover:bg-muted/50">
                  {isStaff && <td className="px-5 py-3">{r.employee?.user.name ?? '—'}</td>}
                  <td className="px-5 py-3">
                    {r.type === 'CHECK_IN' ? t('attendance.checkIn') : t('attendance.checkOut')}
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(r.requestedAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3">{statusBadge(r.status, t)}</td>
                  {isStaff && (
                    <td className="px-5 py-3 text-end">
                      {r.status === 'PENDING' && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => onApprove(r.id)}>
                            {t('tasks.approve')}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => onReject(r.id)}>
                            {t('tasks.reject')}
                          </Button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground text-center">{t('common.empty')}</p>
          )}
        </TableShell>
        <Pagination
          page={pg.page}
          pageCount={pg.pageCount}
          onPageChange={pg.setPage}
          totalCount={pg.totalCount}
          firstIndex={pg.firstIndex}
          lastIndex={pg.lastIndex}
        />
      </CardContent>
    </Card>
  );
}

function EmployeeOffDaySection(): React.ReactElement {
  const t = useTranslations();
  const list = useMyOffDayRequests();
  const submitMut = useSubmitOffDayRequest();

  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');

  async function submit(): Promise<void> {
    if (!date) return;
    try {
      await submitMut.mutateAsync({ date, reason: reason.trim() || undefined });
      toast.success(t('offDay.submitted'));
      setDate('');
      setReason('');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('offDay.myRequests')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr_auto] gap-2 items-end">
          <div className="space-y-1">
            <Label htmlFor="off-date">{t('offDay.date')}</Label>
            <Input
              id="off-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="off-reason">{t('offDay.reason')}</Label>
            <Input
              id="off-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('offDay.reasonPlaceholder')}
              maxLength={2000}
            />
          </div>
          <Button onClick={submit} disabled={!date || submitMut.isPending}>
            {t('offDay.submit')}
          </Button>
        </div>

        {(list.data?.length ?? 0) > 0 && (
          <div className="scroll-tbl">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-start font-medium px-3 py-2">{t('offDay.date')}</th>
                  <th className="text-start font-medium px-3 py-2">{t('offDay.reason')}</th>
                  <th className="text-start font-medium px-3 py-2">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.data?.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.reason ?? '—'}</td>
                    <td className="px-3 py-2">{statusBadge(r.status, t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StaffOffDaySection(): React.ReactElement {
  const t = useTranslations();
  const list = useOffDayRequests('PENDING');
  const decideMut = useDecideOffDayRequest();

  async function handleDecide(req: OffDayRequest, approve: boolean): Promise<void> {
    try {
      let rr: string | undefined;
      if (!approve) {
        const r = prompt(t('attendance.rejectReason'));
        if (!r) return;
        rr = r;
      }
      await decideMut.mutateAsync({ id: req.id, approve, rejectReason: rr });
      toast.success(approve ? t('offDay.approved') : t('offDay.rejected'));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('offDay.pending')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto md:max-h-[36rem] md:overflow-auto">
        {list.isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg shimmer" />
            ))}
          </div>
        ) : (list.data?.length ?? 0) === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">{t('offDay.empty')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card text-muted-foreground text-xs uppercase tracking-wide border-b border-border">
              <tr>
                <th className="text-start font-medium px-5 py-3">{t('employees.name')}</th>
                <th className="text-start font-medium px-5 py-3">{t('offDay.date')}</th>
                <th className="text-start font-medium px-5 py-3">{t('offDay.reason')}</th>
                <th className="text-end font-medium px-5 py-3">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.data?.map((r) => (
                <tr key={r.id} className="hover:bg-muted/50">
                  <td className="px-5 py-3">{r.employee?.user.name ?? '—'}</td>
                  <td className="px-5 py-3">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-muted-foreground">{r.reason ?? '—'}</td>
                  <td className="px-5 py-3 text-end">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" onClick={() => handleDecide(r, true)}>
                        {t('tasks.approve')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDecide(r, false)}>
                        {t('tasks.reject')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== Overtime ====================

function EmployeeOvertimeSection(): React.ReactElement {
  const t = useTranslations();
  const list = useMyOvertimeRequests();
  const submitMut = useSubmitOvertime();
  const [date, setDate] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [reason, setReason] = useState('');

  async function submit(): Promise<void> {
    if (!date || !startAt || !endAt) return;
    try {
      await submitMut.mutateAsync({
        date: new Date(date).toISOString(),
        startAt: new Date(`${date}T${startAt}`).toISOString(),
        endAt: new Date(`${date}T${endAt}`).toISOString(),
        reason: reason.trim() || undefined,
      });
      toast.success(t('overtime.submitted'));
      setDate('');
      setStartAt('');
      setEndAt('');
      setReason('');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('overtime.myRequests')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-[160px_120px_120px_1fr_auto] gap-2 items-end">
          <div className="space-y-1">
            <Label htmlFor="ot-date">{t('overtime.date')}</Label>
            <Input id="ot-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ot-start">{t('overtime.start')}</Label>
            <Input id="ot-start" type="time" value={startAt} onChange={(e) => setStartAt(e.target.value)} dir="ltr" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ot-end">{t('overtime.end')}</Label>
            <Input id="ot-end" type="time" value={endAt} onChange={(e) => setEndAt(e.target.value)} dir="ltr" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ot-reason">{t('offDay.reason')}</Label>
            <Input id="ot-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('offDay.reasonPlaceholder')} />
          </div>
          <Button onClick={submit} disabled={!date || !startAt || !endAt || submitMut.isPending}>
            {t('offDay.submit')}
          </Button>
        </div>

        {(list.data?.length ?? 0) > 0 && (
          <div className="scroll-tbl">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-start font-medium px-3 py-2">{t('overtime.date')}</th>
                  <th className="text-start font-medium px-3 py-2">{t('overtime.start')}</th>
                  <th className="text-start font-medium px-3 py-2">{t('overtime.end')}</th>
                  <th className="text-start font-medium px-3 py-2">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.data?.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="px-3 py-2 font-mono text-xs">{new Date(r.startAt).toLocaleTimeString()}</td>
                    <td className="px-3 py-2 font-mono text-xs">{new Date(r.endAt).toLocaleTimeString()}</td>
                    <td className="px-3 py-2">{statusBadge(r.status, t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StaffOvertimeSection(): React.ReactElement {
  const t = useTranslations();
  const list = useOvertimeRequests('PENDING');
  const decideMut = useDecideOvertime();

  async function handle(r: OvertimeRequest, approve: boolean): Promise<void> {
    try {
      let rr: string | undefined;
      if (!approve) {
        const rs = prompt(t('attendance.rejectReason'));
        if (!rs) return;
        rr = rs;
      }
      await decideMut.mutateAsync({ id: r.id, approve, rejectReason: rr });
      toast.success(approve ? t('overtime.approved') : t('overtime.rejected'));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('overtime.pending')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto md:max-h-[36rem] md:overflow-auto">
        {(list.data?.length ?? 0) === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">{t('offDay.empty')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card text-muted-foreground text-xs uppercase tracking-wide border-b border-border">
              <tr>
                <th className="text-start font-medium px-5 py-3">{t('employees.name')}</th>
                <th className="text-start font-medium px-5 py-3">{t('overtime.date')}</th>
                <th className="text-start font-medium px-5 py-3">{t('overtime.start')}</th>
                <th className="text-start font-medium px-5 py-3">{t('overtime.end')}</th>
                <th className="text-end font-medium px-5 py-3">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.data?.map((r) => (
                <tr key={r.id} className="hover:bg-muted/50">
                  <td className="px-5 py-3">{r.employee?.user.name ?? '—'}</td>
                  <td className="px-5 py-3">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="px-5 py-3 font-mono text-xs">{new Date(r.startAt).toLocaleTimeString()}</td>
                  <td className="px-5 py-3 font-mono text-xs">{new Date(r.endAt).toLocaleTimeString()}</td>
                  <td className="px-5 py-3 text-end">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" onClick={() => handle(r, true)}>{t('tasks.approve')}</Button>
                      <Button size="sm" variant="outline" onClick={() => handle(r, false)}>{t('tasks.reject')}</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== Leave ====================

function EmployeeLeaveSection(): React.ReactElement {
  const t = useTranslations();
  const list = useMyLeaveRequests();
  const submitMut = useSubmitLeave();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');

  async function submit(): Promise<void> {
    if (!from || !to) return;
    try {
      await submitMut.mutateAsync({ fromDate: from, toDate: to, reason: reason.trim() || undefined });
      toast.success(t('leave.submitted'));
      setFrom(''); setTo(''); setReason('');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>{t('leave.myRequests')}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-[160px_160px_1fr_auto] gap-2 items-end">
          <div className="space-y-1">
            <Label htmlFor="lv-from">{t('leave.fromDate')}</Label>
            <Input id="lv-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lv-to">{t('leave.toDate')}</Label>
            <Input id="lv-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lv-reason">{t('offDay.reason')}</Label>
            <Input id="lv-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('offDay.reasonPlaceholder')} />
          </div>
          <Button onClick={submit} disabled={!from || !to || submitMut.isPending}>{t('offDay.submit')}</Button>
        </div>

        {(list.data?.length ?? 0) > 0 && (
          <div className="scroll-tbl">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-start font-medium px-3 py-2">{t('leave.fromDate')}</th>
                  <th className="text-start font-medium px-3 py-2">{t('leave.toDate')}</th>
                  <th className="text-start font-medium px-3 py-2">{t('offDay.reason')}</th>
                  <th className="text-start font-medium px-3 py-2">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.data?.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2">{new Date(r.fromDate).toLocaleDateString()}</td>
                    <td className="px-3 py-2">{new Date(r.toDate).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.reason ?? '—'}</td>
                    <td className="px-3 py-2">{statusBadge(r.status, t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StaffLeaveSection(): React.ReactElement {
  const t = useTranslations();
  const list = useLeaveRequests('PENDING');
  const decideMut = useDecideLeave();

  async function handle(r: LeaveRequest, approve: boolean): Promise<void> {
    try {
      let rr: string | undefined;
      if (!approve) {
        const rs = prompt(t('attendance.rejectReason'));
        if (!rs) return;
        rr = rs;
      }
      await decideMut.mutateAsync({ id: r.id, approve, rejectReason: rr });
      toast.success(approve ? t('leave.approved') : t('leave.rejected'));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>{t('leave.pending')}</CardTitle></CardHeader>
      <CardContent className="p-0 overflow-x-auto md:max-h-[36rem] md:overflow-auto">
        {(list.data?.length ?? 0) === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">{t('offDay.empty')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card text-muted-foreground text-xs uppercase tracking-wide border-b border-border">
              <tr>
                <th className="text-start font-medium px-5 py-3">{t('employees.name')}</th>
                <th className="text-start font-medium px-5 py-3">{t('leave.fromDate')}</th>
                <th className="text-start font-medium px-5 py-3">{t('leave.toDate')}</th>
                <th className="text-start font-medium px-5 py-3">{t('offDay.reason')}</th>
                <th className="text-end font-medium px-5 py-3">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.data?.map((r) => (
                <tr key={r.id} className="hover:bg-muted/50">
                  <td className="px-5 py-3">{r.employee?.user.name ?? '—'}</td>
                  <td className="px-5 py-3">{new Date(r.fromDate).toLocaleDateString()}</td>
                  <td className="px-5 py-3">{new Date(r.toDate).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-muted-foreground">{r.reason ?? '—'}</td>
                  <td className="px-5 py-3 text-end">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" onClick={() => handle(r, true)}>{t('tasks.approve')}</Button>
                      <Button size="sm" variant="outline" onClick={() => handle(r, false)}>{t('tasks.reject')}</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== Salary advance ====================

function EmployeeAdvanceSection(): React.ReactElement {
  const t = useTranslations();
  const list = useMySalaryAdvances();
  const submitMut = useSubmitSalaryAdvance();
  const today = new Date();
  const [amount, setAmount] = useState('');
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [reason, setReason] = useState('');

  async function submit(): Promise<void> {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return;
    try {
      await submitMut.mutateAsync({ amount: n, appliedYear: year, appliedMonth: month, reason: reason.trim() || undefined });
      toast.success(t('advance.submitted'));
      setAmount('');
      setReason('');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>{t('advance.myRequests')}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-[160px_100px_100px_1fr_auto] gap-2 items-end">
          <div className="space-y-1">
            <Label htmlFor="sa-amount">{t('advance.amount')}</Label>
            <Input id="sa-amount" type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sa-year">{t('payroll.year')}</Label>
            <Input id="sa-year" type="number" min={2000} max={3000} value={year} onChange={(e) => setYear(Number(e.target.value) || today.getFullYear())} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sa-month">{t('payroll.month')}</Label>
            <Input id="sa-month" type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Math.min(12, Math.max(1, Number(e.target.value) || 1)))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sa-reason">{t('offDay.reason')}</Label>
            <Input id="sa-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('offDay.reasonPlaceholder')} />
          </div>
          <Button onClick={submit} disabled={!amount || submitMut.isPending}>{t('offDay.submit')}</Button>
        </div>

        {(list.data?.length ?? 0) > 0 && (
          <div className="scroll-tbl">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-start font-medium px-3 py-2">{t('advance.month')}</th>
                  <th className="text-end font-medium px-3 py-2">{t('advance.amount')}</th>
                  <th className="text-start font-medium px-3 py-2">{t('offDay.reason')}</th>
                  <th className="text-start font-medium px-3 py-2">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.data?.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 font-mono text-xs">{r.appliedYear}/{String(r.appliedMonth).padStart(2, '0')}</td>
                    <td className="px-3 py-2 text-end font-mono">{r.amount.toLocaleString()}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.reason ?? '—'}</td>
                    <td className="px-3 py-2">{statusBadge(r.status, t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StaffAdvanceSection(): React.ReactElement {
  const t = useTranslations();
  const list = useSalaryAdvances('PENDING');
  const decideMut = useDecideSalaryAdvance();

  async function handle(r: SalaryAdvanceRequest, approve: boolean): Promise<void> {
    try {
      let rr: string | undefined;
      if (!approve) {
        const rs = prompt(t('attendance.rejectReason'));
        if (!rs) return;
        rr = rs;
      }
      await decideMut.mutateAsync({ id: r.id, approve, rejectReason: rr });
      toast.success(approve ? t('advance.approved') : t('advance.rejected'));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>{t('advance.pending')}</CardTitle></CardHeader>
      <CardContent className="p-0 overflow-x-auto md:max-h-[36rem] md:overflow-auto">
        {(list.data?.length ?? 0) === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">{t('offDay.empty')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card text-muted-foreground text-xs uppercase tracking-wide border-b border-border">
              <tr>
                <th className="text-start font-medium px-5 py-3">{t('employees.name')}</th>
                <th className="text-start font-medium px-5 py-3">{t('advance.month')}</th>
                <th className="text-end font-medium px-5 py-3">{t('advance.amount')}</th>
                <th className="text-start font-medium px-5 py-3">{t('offDay.reason')}</th>
                <th className="text-end font-medium px-5 py-3">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.data?.map((r) => (
                <tr key={r.id} className="hover:bg-muted/50">
                  <td className="px-5 py-3">{r.employee?.user.name ?? '—'}</td>
                  <td className="px-5 py-3 font-mono text-xs">{r.appliedYear}/{String(r.appliedMonth).padStart(2, '0')}</td>
                  <td className="px-5 py-3 text-end font-mono font-semibold">{r.amount.toLocaleString()}</td>
                  <td className="px-5 py-3 text-muted-foreground">{r.reason ?? '—'}</td>
                  <td className="px-5 py-3 text-end">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" onClick={() => handle(r, true)}>{t('tasks.approve')}</Button>
                      <Button size="sm" variant="outline" onClick={() => handle(r, false)}>{t('tasks.reject')}</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
