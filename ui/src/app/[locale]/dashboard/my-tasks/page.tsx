'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useResource } from '@/hooks/queries/generic';
import { api } from '@/lib/api';

interface Task {
  id: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  request: { type: string; status: string; client: { id: string; name: string; address: string } };
}

export default function MyTasksPage() {
  const qc = useQueryClient();
  const list = useResource<{ tasks: Task[] }>(['tasks', 'mine'], '/api/tasks/mine');
  const [errorByTask, setErrorByTask] = useState<Record<string, string>>({});

  const start = useMutation({
    mutationFn: async (id: string) => {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true }),
      );
      return (await api.post(`/api/tasks/${id}/start`, { lat: pos.coords.latitude, lng: pos.coords.longitude })).data;
    },
    onSuccess: (_d, id) => {
      setErrorByTask((p) => ({ ...p, [id]: '' }));
      qc.invalidateQueries({ queryKey: ['tasks', 'mine'] });
    },
    onError: (err: { response?: { data?: { error?: { message: string } } } }, id) => {
      const msg = err?.response?.data?.error?.message ?? 'Failed';
      setErrorByTask((p) => ({ ...p, [id]: msg }));
    },
  });

  const finish = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) =>
      (await api.post(`/api/tasks/${id}/finish`, { note })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', 'mine'] }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl md:text-2xl font-semibold">My tasks</h1>
      {list.data?.tasks?.length === 0 && <p className="text-fg-muted">No active tasks</p>}
      <div className="grid md:grid-cols-2 gap-4">
        {list.data?.tasks?.map((task) => (
          <div key={task.id} className="card space-y-2">
            <div>
              <p className="font-medium">{task.request.client.name}</p>
              <p className="text-xs text-fg-muted">{task.request.type} · {task.request.status}</p>
              <p className="text-sm">{task.request.client.address}</p>
            </div>
            <div className="flex gap-2">
              {!task.actualStart && (
                <button className="btn-primary" onClick={() => start.mutate(task.id)}>Start</button>
              )}
              {task.actualStart && !task.actualEnd && (
                <button
                  className="btn-ghost"
                  onClick={() => {
                    const note = prompt('Finish note?');
                    if (note) finish.mutate({ id: task.id, note });
                  }}
                >Finish</button>
              )}
            </div>
            {errorByTask[task.id] && <p className="text-xs text-danger">{errorByTask[task.id]}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
