'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, Building2, Search } from 'lucide-react';

import { Pagination } from '@/components/shared/Pagination';
import { Input } from '@/components/ui/input';
import { Link } from '@/i18n/routing';
import { useSystemCompanies } from '@/hooks/queries/system';

export default function SystemCompaniesPage() {
  const t = useTranslations('system');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const list = useSystemCompanies(search || undefined, page, PAGE_SIZE);
  const total = list.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const itemsLen = list.data?.items.length ?? 0;
  const firstIndex = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastIndex = total === 0 ? 0 : (page - 1) * PAGE_SIZE + itemsLen;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">{t('companies.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('companies.subtitle')}</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={t('companies.searchPlaceholder')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="ps-9"
          />
        </div>
      </header>

      <div className="scroll-tbl bg-card rounded-2xl">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-start py-3 px-4">{t('companies.col.name')}</th>
              <th className="text-start py-3 px-4">{t('companies.col.owner')}</th>
              <th className="text-start py-3 px-4">{t('companies.col.plan')}</th>
              <th className="text-start py-3 px-4">{t('companies.col.status')}</th>
              <th className="text-start py-3 px-4">{t('companies.col.users')}</th>
              <th className="text-start py-3 px-4">{t('companies.col.clients')}</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.data?.items.map((c) => (
              <tr key={c.id}>
                <td className="py-3 px-4 font-medium">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-muted-foreground" />
                    {c.name}
                  </div>
                </td>
                <td className="py-3 px-4 text-muted-foreground">
                  <div className="flex flex-col">
                    <span>{c.owner.name}</span>
                    <span className="text-xs">{c.owner.email}</span>
                    {c.owner.bannedAt && (
                      <span className="text-xs text-destructive font-medium">
                        {t('users.bannedTag')}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <PlanPill plan={c.subscription?.plan ?? 'TRIAL'} />
                </td>
                <td className="py-3 px-4">
                  <StatusPill status={c.subscription?.status ?? 'TRIALING'} />
                </td>
                <td className="py-3 px-4 tabular-nums">{c._count.users}</td>
                <td className="py-3 px-4 tabular-nums">{c._count.clients}</td>
                <td className="py-3 px-4 text-end">
                  <Link
                    href={`/system/companies/${c.id}`}
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {t('common.manage')}
                    <ArrowRight className="size-3.5 flip-x" />
                  </Link>
                </td>
              </tr>
            ))}
            {!list.isLoading && (list.data?.items.length ?? 0) === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-muted-foreground">
                  {t('companies.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
        totalCount={total}
        firstIndex={firstIndex}
        lastIndex={lastIndex}
      />
    </div>
  );
}

function PlanPill({ plan }: { plan: string }) {
  const t = useTranslations('plans.names');
  const colors: Record<string, string> = {
    TRIAL: 'bg-emerald-500/15 text-emerald-600',
    BASIC: 'bg-blue-500/15 text-blue-600',
    PRO: 'bg-primary/15 text-primary',
    ENTERPRISE: 'bg-amber-500/15 text-amber-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[plan] ?? 'bg-muted'}`}>
      {t(plan)}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const t = useTranslations('system.statuses');
  const colors: Record<string, string> = {
    TRIALING: 'bg-emerald-500/15 text-emerald-600',
    ACTIVE: 'bg-primary/15 text-primary',
    EXPIRED: 'bg-destructive/15 text-destructive',
    PENDING_ACTIVATION: 'bg-amber-500/15 text-amber-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? 'bg-muted'}`}>
      {t(status)}
    </span>
  );
}
