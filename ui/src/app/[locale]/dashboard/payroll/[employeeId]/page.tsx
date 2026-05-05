'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import { usePayroll } from '@/hooks/queries/payroll';

const MONTHS_AR = [
  'يناير','فبراير','مارس','أبريل','مايو','يونيو',
  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر',
];

export default function PayrollEmployeeDetailPage() {
  const t = useTranslations();
  const params = useParams<{ employeeId: string }>();
  const search = useSearchParams();
  const today = new Date();
  const year = Number(search?.get('year')) || today.getFullYear();
  const month = Number(search?.get('month')) || today.getMonth() + 1;

  const employeeId = params?.employeeId ?? '';
  const detail = usePayroll(employeeId, year, month);

  const monthLabel = useMemo(() => `${MONTHS_AR[month - 1]} ${year}`, [year, month]);

  if (detail.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!detail.data) return <p className="text-muted-foreground">{t('common.empty')}</p>;

  const d = detail.data;

  return (
    <div className="space-y-6">
      <div className="no-print flex items-center justify-between gap-3 flex-wrap">
        <Link
          href="/dashboard/payroll"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="size-4 flip-x" />
          {t('payroll.backToList')}
        </Link>
        <Button type="button" variant="gradient" onClick={() => window.print()}>
          <Printer className="size-4" />
          {t('payroll.print')}
        </Button>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-soft print-container">
        <header className="flex items-start justify-between gap-4 pb-4 mb-4 border-b border-border print-header">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t('payroll.payslipFor')}
            </p>
            <h1 className="text-2xl font-bold mt-1">{d.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{monthLabel}</p>
          </div>
          <div className="text-end">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('payroll.net')}</p>
            <p className="text-3xl font-bold text-primary tabular-nums mt-1">
              {d.totals.net.toLocaleString()}
            </p>
          </div>
        </header>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Stat label={t('employees.monthlySalary')} value={d.monthlySalary} />
          <Stat label={t('payroll.hourlyRate')} value={d.hourlyRate} fixed={2} />
          <Stat label={t('payroll.overtimeRate')} value={d.overtimeHourlyRate} fixed={2} />
          <Stat label={t('payroll.offDayRate')} value={d.offDayHourlyRate} fixed={2} />
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-4 mb-6">
          <h2 className="font-semibold mb-3">{t('payroll.totalsBreakdown')}</h2>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            <Line label={t('payroll.lateDeduction')} value={-d.totals.lateDeduction} negative />
            <Line label={t('payroll.earlyDeduction')} value={-d.totals.earlyLeaveDeduction} negative />
            <Line label={t('payroll.overtimePay')} value={d.totals.overtimePay} positive />
            <Line label={t('payroll.offDayPay')} value={d.totals.offDayPay} positive />
            <Line label={t('payroll.salaryAdvance')} value={-d.totals.salaryAdvanceTotal} negative />
            <Line label={t('payroll.totalLateMinutes')} value={d.totals.lateMinutes} suffix="m" plain />
            <Line label={t('payroll.totalEarlyMinutes')} value={d.totals.earlyLeaveMinutes} suffix="m" plain />
            <Line label={t('payroll.totalOvertimeHours')} value={d.totals.overtimeHours} suffix="h" plain fixed={1} />
            <Line label={t('payroll.totalOffDayHours')} value={d.totals.offDayHours} suffix="h" plain fixed={1} />
          </div>
        </div>

        <h2 className="font-semibold mb-3">{t('payroll.dailyBreakdown')}</h2>
        <div className="scroll-tbl">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-[11px] uppercase tracking-wide">
              <tr>
                <th className="text-start px-3 py-2">{t('payroll.day')}</th>
                <th className="text-start px-3 py-2">{t('payroll.type')}</th>
                <th className="text-start px-3 py-2">{t('attendance.checkIn')}</th>
                <th className="text-start px-3 py-2">{t('attendance.checkOut')}</th>
                <th className="text-end px-3 py-2">{t('payroll.late')}</th>
                <th className="text-end px-3 py-2">{t('payroll.early')}</th>
                <th className="text-end px-3 py-2">{t('payroll.overtime')}</th>
                <th className="text-end px-3 py-2">{t('payroll.offDayHours')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {d.days.map((row) => (
                <tr key={row.date} className={row.isOffDay ? 'bg-muted/20' : ''}>
                  <td className="px-3 py-2 font-mono">{row.date}</td>
                  <td className="px-3 py-2">
                    {row.isOffDay ? (
                      row.offDayApproved ? (
                        <Badge variant="outline" className="text-[10px]">
                          {t('payroll.offDayApproved')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          {t('payroll.offDay')}
                        </Badge>
                      )
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">
                    {row.checkedIn ? new Date(row.checkedIn).toLocaleTimeString() : '—'}
                  </td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">
                    {row.checkedOut ? new Date(row.checkedOut).toLocaleTimeString() : '—'}
                  </td>
                  <td className="px-3 py-2 text-end font-mono">
                    {row.lateMinutes > 0 ? `${row.lateMinutes}m` : '—'}
                  </td>
                  <td className="px-3 py-2 text-end font-mono">
                    {row.earlyLeaveMinutes > 0 ? `${row.earlyLeaveMinutes}m` : '—'}
                  </td>
                  <td className="px-3 py-2 text-end font-mono">
                    {row.overtimeMinutes > 0 ? `${row.overtimeMinutes}m` : '—'}
                  </td>
                  <td className="px-3 py-2 text-end font-mono">
                    {row.offDayHoursWorked > 0 ? `${row.offDayHoursWorked.toFixed(1)}h` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="mt-6 pt-4 border-t border-border text-xs text-muted-foreground flex justify-between">
          <span>{t('payroll.generatedAt')}: {new Date().toLocaleString()}</span>
          <span>{monthLabel}</span>
        </footer>
      </section>
    </div>
  );
}

function Stat({ label, value, fixed = 0 }: { label: string; value: number; fixed?: number }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums mt-0.5">
        {fixed ? value.toFixed(fixed) : value.toLocaleString()}
      </p>
    </div>
  );
}

function Line({
  label,
  value,
  negative,
  positive,
  plain,
  suffix,
  fixed,
}: {
  label: string;
  value: number;
  negative?: boolean;
  positive?: boolean;
  plain?: boolean;
  suffix?: string;
  fixed?: number;
}) {
  let cls = 'font-mono font-medium tabular-nums';
  if (negative) cls += ' text-destructive';
  else if (positive) cls += ' text-emerald-600';
  return (
    <div className="flex items-center justify-between border-b border-border/60 last:border-0 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={cls}>
        {!plain && (negative ? '' : positive ? '+' : '')}
        {fixed != null ? value.toFixed(fixed) : value.toLocaleString()}
        {suffix ?? ''}
      </span>
    </div>
  );
}
