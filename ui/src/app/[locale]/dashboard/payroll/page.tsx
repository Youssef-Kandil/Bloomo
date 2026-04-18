'use client';

import { motion } from 'framer-motion';
import { Banknote } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { DetailDrawer, DetailRow } from '@/components/shared/DetailDrawer';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  usePayroll,
  usePayrollSummary,
  type PayrollSummaryRow,
} from '@/hooks/queries/payroll';

const MONTHS_AR = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

export default function PayrollPage(): React.ReactElement {
  const t = useTranslations();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selected, setSelected] = useState<PayrollSummaryRow | null>(null);

  const summary = usePayrollSummary(year, month);
  const detail = usePayroll(selected?.employeeId ?? null, year, month);

  const yearOptions = useMemo(() => {
    const y = today.getFullYear();
    return [y - 2, y - 1, y, y + 1];
  }, [today]);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };
  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 22 } },
  };

  const selectClass =
    'rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.header variants={item} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('nav.payroll')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('payroll.description')}</p>
        </div>
        <div className="flex gap-2 flex-wrap items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">{t('payroll.year')}</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className={selectClass}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">{t('payroll.month')}</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className={selectClass}
            >
              {MONTHS_AR.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </motion.header>

      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="size-5 text-primary" />
              {t('payroll.monthlySummary')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {summary.isLoading ? (
              <div className="p-6 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-lg shimmer" />
                ))}
              </div>
            ) : (summary.data?.length ?? 0) === 0 ? (
              <p className="p-8 text-sm text-muted-foreground text-center">{t('payroll.noRows')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-start font-medium px-5 py-3">{t('employees.name')}</th>
                      <th className="text-end font-medium px-5 py-3">{t('employees.monthlySalary')}</th>
                      <th className="text-end font-medium px-5 py-3">{t('payroll.late')}</th>
                      <th className="text-end font-medium px-5 py-3">{t('payroll.early')}</th>
                      <th className="text-end font-medium px-5 py-3">{t('payroll.overtimeHours')}</th>
                      <th className="text-end font-medium px-5 py-3">{t('payroll.offDayHours')}</th>
                      <th className="text-end font-medium px-5 py-3">{t('payroll.net')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {summary.data?.map((row) => (
                      <tr
                        key={row.employeeId}
                        onClick={() => setSelected(row)}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                      >
                        <td className="px-5 py-3 font-medium">{row.name}</td>
                        <td className="px-5 py-3 text-end font-mono">
                          {row.monthlySalary.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-end text-xs text-muted-foreground font-mono">
                          {row.lateMinutes}m
                        </td>
                        <td className="px-5 py-3 text-end text-xs text-muted-foreground font-mono">
                          {row.earlyLeaveMinutes}m
                        </td>
                        <td className="px-5 py-3 text-end text-xs text-muted-foreground font-mono">
                          {row.overtimeHours.toFixed(1)}h
                        </td>
                        <td className="px-5 py-3 text-end text-xs text-muted-foreground font-mono">
                          {row.offDayHours.toFixed(1)}h
                        </td>
                        <td className="px-5 py-3 text-end font-mono font-semibold text-primary">
                          {row.net.toLocaleString()}
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

      {selected && detail.data && (
        <DetailDrawer
          open
          onOpenChange={(o) => !o && setSelected(null)}
          mode="view"
          title={`${selected.name} — ${MONTHS_AR[month - 1]} ${year}`}
          description={t('payroll.breakdown')}
        >
          <div className="space-y-1">
            <DetailRow label={t('employees.monthlySalary')}>
              <span className="font-mono">{detail.data.monthlySalary.toLocaleString()}</span>
            </DetailRow>
            <DetailRow label={t('payroll.hourlyRate')}>
              <span className="font-mono">{detail.data.hourlyRate.toFixed(2)}</span>
            </DetailRow>
            <DetailRow label={t('payroll.overtimeRate')}>
              <span className="font-mono">{detail.data.overtimeHourlyRate.toFixed(2)}</span>
            </DetailRow>
            <DetailRow label={t('payroll.offDayRate')}>
              <span className="font-mono">{detail.data.offDayHourlyRate.toFixed(2)}</span>
            </DetailRow>
          </div>

          <div className="mt-5 space-y-1 rounded-lg border border-border p-3 bg-muted/20">
            <DetailRow label={t('payroll.lateDeduction')}>
              <span className="font-mono text-destructive">
                -{detail.data.totals.lateDeduction.toLocaleString()}
              </span>
            </DetailRow>
            <DetailRow label={t('payroll.earlyDeduction')}>
              <span className="font-mono text-destructive">
                -{detail.data.totals.earlyLeaveDeduction.toLocaleString()}
              </span>
            </DetailRow>
            <DetailRow label={t('payroll.overtimePay')}>
              <span className="font-mono text-[hsl(var(--success))]">
                +{detail.data.totals.overtimePay.toLocaleString()}
              </span>
            </DetailRow>
            <DetailRow label={t('payroll.offDayPay')}>
              <span className="font-mono text-[hsl(var(--success))]">
                +{detail.data.totals.offDayPay.toLocaleString()}
              </span>
            </DetailRow>
            <DetailRow label={t('payroll.net')}>
              <span className="font-mono font-bold text-primary text-base">
                {detail.data.totals.net.toLocaleString()}
              </span>
            </DetailRow>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground text-[10px] uppercase tracking-wide">
                <tr>
                  <th className="text-start px-2 py-2">{t('payroll.day')}</th>
                  <th className="text-start px-2 py-2">{t('payroll.type')}</th>
                  <th className="text-start px-2 py-2">{t('attendance.checkIn')}</th>
                  <th className="text-start px-2 py-2">{t('attendance.checkOut')}</th>
                  <th className="text-end px-2 py-2">{t('payroll.late')}</th>
                  <th className="text-end px-2 py-2">{t('payroll.early')}</th>
                  <th className="text-end px-2 py-2">{t('payroll.overtime')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {detail.data.days.map((d) => (
                  <tr key={d.date}>
                    <td className="px-2 py-2 font-mono">{d.date.slice(-5)}</td>
                    <td className="px-2 py-2">
                      {d.isOffDay ? (
                        d.offDayApproved ? (
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
                    <td className="px-2 py-2 font-mono text-muted-foreground">
                      {d.checkedIn ? new Date(d.checkedIn).toLocaleTimeString() : '—'}
                    </td>
                    <td className="px-2 py-2 font-mono text-muted-foreground">
                      {d.checkedOut ? new Date(d.checkedOut).toLocaleTimeString() : '—'}
                    </td>
                    <td className="px-2 py-2 text-end font-mono">
                      {d.lateMinutes > 0 ? `${d.lateMinutes}m` : '—'}
                    </td>
                    <td className="px-2 py-2 text-end font-mono">
                      {d.earlyLeaveMinutes > 0 ? `${d.earlyLeaveMinutes}m` : '—'}
                    </td>
                    <td className="px-2 py-2 text-end font-mono">
                      {d.overtimeMinutes > 0 ? `${d.overtimeMinutes}m` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DetailDrawer>
      )}
    </motion.div>
  );
}
