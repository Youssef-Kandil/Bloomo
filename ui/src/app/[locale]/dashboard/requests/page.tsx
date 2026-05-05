'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { AssignTechnicianDrawer } from '@/components/shared/AssignTechnicianDrawer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Pagination } from '@/components/shared/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { Button } from '@/components/ui/button';
import {
  useDeleteRequest,
  useRequests,
  type ServiceRequest,
} from '@/hooks/queries/requests';

const STATUSES = ['', 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;

export default function RequestsPage() {
  const t = useTranslations();
  const [status, setStatus] = useState<string>('');
  const list = useRequests(status || undefined);
  const items = list.data?.items ?? [];
  const reqPg = usePagination(items);
  const [assignTarget, setAssignTarget] = useState<ServiceRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceRequest | null>(null);
  const deleteMut = useDeleteRequest();

  async function onDeleteConfirm(): Promise<void> {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget.id);
      toast.success(t('requests.deleteSuccess'));
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('requests.deleteError'));
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl md:text-2xl font-semibold">{t('nav.requests')}</h1>
        <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s || 'All'}</option>
          ))}
        </select>
      </header>

      <div>
        {list.isLoading && <p className="text-fg-muted">{t('common.loading')}</p>}
        {list.data?.items?.length === 0 && <p className="text-fg-muted">{t('common.empty')}</p>}
      </div>
      <div className="scroll-tbl">
        <table className="w-full text-sm">
          <thead className="text-fg-muted text-xs uppercase">
            <tr>
              <th className="text-start px-4 py-2">Client</th>
              <th className="text-start px-4 py-2">Type</th>
              <th className="text-start px-4 py-2">Status</th>
              <th className="text-start px-4 py-2">Created</th>
              <th className="text-end px-4 py-2">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {reqPg.paginated.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 truncate">{r.client?.name ?? '—'}</td>
                <td className="px-4 py-2">{r.type}</td>
                <td className="px-4 py-2">{r.status}</td>
                <td className="px-4 py-2 text-xs text-fg-muted">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2 text-end">
                  <div className="inline-flex items-center gap-2">
                    {(r.status === 'PENDING' || r.status === 'ASSIGNED') && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAssignTarget(r)}
                      >
                        <UserPlus className="size-3.5" />
                        {t('requests.assignTechnician')}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(r)}
                      aria-label={t('common.delete')}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={reqPg.page}
        pageCount={reqPg.pageCount}
        onPageChange={reqPg.setPage}
        totalCount={reqPg.totalCount}
        firstIndex={reqPg.firstIndex}
        lastIndex={reqPg.lastIndex}
      />

      <AssignTechnicianDrawer
        request={assignTarget}
        open={!!assignTarget}
        onOpenChange={(open) => !open && setAssignTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('requests.confirmDeleteTitle')}
        description={t('requests.confirmDeleteDescription', {
          name: deleteTarget?.client?.name ?? '',
        })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        loading={deleteMut.isPending}
        onConfirm={onDeleteConfirm}
      />
    </div>
  );
}
