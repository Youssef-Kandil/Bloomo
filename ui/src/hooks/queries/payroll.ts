'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

export interface PayrollDay {
  date: string;
  weekday: number;
  isOffDay: boolean;
  offDayApproved: boolean;
  checkedIn: string | null;
  checkedOut: string | null;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  offDayHoursWorked: number;
}

export interface PayrollResult {
  employeeId: string;
  name: string;
  year: number;
  month: number;
  monthlySalary: number;
  hourlyRate: number;
  overtimeHourlyRate: number;
  offDayHourlyRate: number;
  totals: {
    lateMinutes: number;
    earlyLeaveMinutes: number;
    overtimeHours: number;
    offDayHours: number;
    lateDeduction: number;
    earlyLeaveDeduction: number;
    overtimePay: number;
    offDayPay: number;
    net: number;
  };
  days: PayrollDay[];
}

export interface PayrollSummaryRow {
  employeeId: string;
  name: string;
  email: string;
  monthlySalary: number;
  net: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeHours: number;
  offDayHours: number;
}

export function usePayrollSummary(year: number, month: number) {
  return useQuery({
    queryKey: ['payroll', 'summary', year, month] as const,
    queryFn: async () =>
      (
        await api.get<{ rows: PayrollSummaryRow[] }>('/api/payroll/summary', {
          params: { year, month },
        })
      ).data.rows,
  });
}

export function usePayroll(employeeId: string | null, year: number, month: number) {
  return useQuery({
    queryKey: ['payroll', 'detail', employeeId, year, month] as const,
    enabled: !!employeeId,
    queryFn: async () =>
      (
        await api.get<{ payroll: PayrollResult }>('/api/payroll', {
          params: { employeeId, year, month },
        })
      ).data.payroll,
  });
}
