'use client';

import { motion } from 'framer-motion';
import { Banknote, Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from '@/i18n/routing';
import { usePayrollSummary } from '@/hooks/queries/payroll';

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
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const summary = usePayrollSummary(year, month);

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
      <motion.header variants={item} className="no-print flex items-start justify-between gap-4 flex-wrap">
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
          <Button type="button" variant="gradient" onClick={() => window.print()} className="self-end">
            <Printer className="size-4" />
            {t('payroll.print')}
          </Button>
        </div>
      </motion.header>

      <div className="hidden print-only print-header">
        <h1 className="text-xl font-bold">{t('nav.payroll')}</h1>
        <p className="text-sm text-muted-foreground">
          {MONTHS_AR[month - 1]} {year}
        </p>
      </div>

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
              <div className="scroll-tbl">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-start font-medium px-5 py-3">{t('employees.name')}</th>
                      <th className="text-start font-medium px-5 py-3">{t('payroll.period')}</th>
                      <th className="text-end font-medium px-5 py-3">{t('employees.monthlySalary')}</th>
                      <th className="text-end font-medium px-5 py-3">{t('payroll.late')}</th>
                      <th className="text-end font-medium px-5 py-3">{t('payroll.early')}</th>
                      <th className="text-end font-medium px-5 py-3">{t('payroll.overtimeHours')}</th>
                      <th className="text-end font-medium px-5 py-3">{t('payroll.offDayHours')}</th>
                      <th className="text-end font-medium px-5 py-3">{t('payroll.net')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {summary.data?.map((row) => {
                      const lastDay = new Date(year, month, 0).getDate();
                      const period = `01/${String(month).padStart(2, '0')} – ${lastDay}/${String(month).padStart(2, '0')}/${year}`;
                      return (
                        <tr
                          key={row.employeeId}
                          onClick={() =>
                            router.push(
                              `/dashboard/payroll/${row.employeeId}?year=${year}&month=${month}`,
                            )
                          }
                          className="cursor-pointer transition-colors hover:bg-muted/50"
                        >
                          <td className="px-5 py-3 font-medium">{row.name}</td>
                          <td className="px-5 py-3 text-xs text-muted-foreground font-mono">
                            {period}
                          </td>
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

    </motion.div>
  );
}
