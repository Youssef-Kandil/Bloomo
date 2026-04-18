'use client';

import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, CircleDashed, Clock, CoinsIcon, PlayCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useResource } from '@/hooks/queries/generic';
import { useEmployeeCompleteTask, type Task } from '@/hooks/queries/tasks';
import { api } from '@/lib/api';

interface Assignment {
  id: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  request: {
    type: string;
    status: string;
    client: { id: string; name: string; address: string };
  };
}

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { error?: { message?: string } })?.error?.message ?? err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

export default function MyTasksPage() {
  const t = useTranslations();
  const qc = useQueryClient();
  const assignments = useResource<{ tasks: Assignment[] }>(['tasks', 'mine'], '/api/tasks/mine');
  const standalone = useQuery({
    queryKey: ['tasks', 'mine', 'standalone'] as const,
    queryFn: async () =>
      (await api.get<{ tasks: Task[] }>('/api/tasks/mine/standalone')).data.tasks,
  });

  const [errorByTask, setErrorByTask] = useState<Record<string, string>>({});

  const startAssignment = useMutation({
    mutationFn: async (id: string) => {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true }),
      );
      return (
        await api.post(`/api/tasks/${id}/start`, {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
      ).data;
    },
    onSuccess: (_d, id) => {
      setErrorByTask((p) => ({ ...p, [id]: '' }));
      qc.invalidateQueries({ queryKey: ['tasks', 'mine'] });
    },
    onError: (err, id) => {
      setErrorByTask((p) => ({ ...p, [id]: errorMessage(err) }));
    },
  });

  const finishAssignment = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) =>
      (await api.post(`/api/tasks/${id}/finish`, { note })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', 'mine'] }),
  });

  const completeMut = useEmployeeCompleteTask();

  async function handleComplete(task: Task): Promise<void> {
    try {
      await completeMut.mutateAsync(task.id);
      if (task.type === 'COLLECTION') {
        toast.success(t('tasks.sentForApproval'));
      } else {
        toast.success(t('tasks.completed'));
      }
      qc.invalidateQueries({ queryKey: ['tasks', 'mine', 'standalone'] });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const standaloneList = standalone.data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('nav.myTasks')}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleDashed className="size-5 text-primary" />
            {t('tasks.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {standalone.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-20 rounded-lg shimmer" />
              ))}
            </div>
          ) : standaloneList.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('tasks.empty')}</p>
          ) : (
            <div className="grid gap-3">
              {standaloneList.map((task) => (
                <StandaloneTaskCard
                  key={task.id}
                  task={task}
                  onComplete={() => handleComplete(task)}
                  completing={completeMut.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="size-5 text-primary" />
            {t('nav.requests')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.data?.tasks?.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('tasks.empty')}</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {assignments.data?.tasks?.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-border bg-surface p-3 space-y-2"
                >
                  <div>
                    <p className="font-medium">{a.request.client.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.request.type} · {a.request.status}
                    </p>
                    <p className="text-sm">{a.request.client.address}</p>
                  </div>
                  <div className="flex gap-2">
                    {!a.actualStart && (
                      <Button size="sm" onClick={() => startAssignment.mutate(a.id)}>
                        <PlayCircle className="size-4" />
                        {t('tasks.markInProgress')}
                      </Button>
                    )}
                    {a.actualStart && !a.actualEnd && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const note = prompt(t('tasks.description'));
                          if (note) finishAssignment.mutate({ id: a.id, note });
                        }}
                      >
                        <CheckCircle2 className="size-4" />
                        {t('tasks.markComplete')}
                      </Button>
                    )}
                  </div>
                  {errorByTask[a.id] && (
                    <p className="text-xs text-destructive">{errorByTask[a.id]}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StandaloneTaskCard({
  task,
  onComplete,
  completing,
}: {
  task: Task;
  onComplete: () => void;
  completing: boolean;
}): React.ReactElement {
  const t = useTranslations();
  const isCollection = task.type === 'COLLECTION';
  const isPending = task.status === 'PENDING' || task.status === 'IN_PROGRESS';
  const isPendingApproval = task.status === 'PENDING_APPROVAL';

  return (
    <div className="rounded-lg border border-border bg-surface p-3 space-y-2">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{task.title}</span>
            <Badge variant="outline" className="text-[10px]">
              {t(`tasks.type${task.type}` as Parameters<typeof t>[0])}
            </Badge>
            {isPendingApproval && (
              <Badge className="text-[10px] bg-[hsl(var(--warning))] text-black">
                {t('tasks.pendingApproval')}
              </Badge>
            )}
          </div>
          {task.client && (
            <p className="text-xs text-muted-foreground mt-1">{task.client.name}</p>
          )}
          {isCollection && task.collectionAmount != null && (
            <p className="mt-1 flex items-center gap-1 text-sm font-mono text-primary font-semibold">
              <CoinsIcon className="size-3.5" />
              {task.collectionAmount.toLocaleString()}
            </p>
          )}
        </div>
        {task.plannedStart && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="size-3" />
            {new Date(task.plannedStart).toLocaleDateString()}
          </span>
        )}
      </div>

      {isPending && (
        <Button size="sm" onClick={onComplete} disabled={completing}>
          <CheckCircle2 className="size-4" />
          {isCollection ? t('tasks.markDoneAwaitApproval') : t('tasks.markComplete')}
        </Button>
      )}
      {isPendingApproval && (
        <p className="text-xs text-[hsl(var(--warning))] italic">
          {t('tasks.awaitingApproval')}
        </p>
      )}
    </div>
  );
}
