'use client';

import { useState, type FormEvent } from 'react';

import { useCreateRequest } from '@/hooks/queries/requests';

const TYPES = ['MAINTENANCE', 'INSPECTION', 'REPAIR', 'SUPPLY', 'INSTALL', 'SUPPLY_INSTALL'] as const;

export default function NewRequestPage() {
  const create = useCreateRequest();
  const [type, setType] = useState<string>('MAINTENANCE');
  const [note, setNote] = useState('');
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    const r = await create.mutateAsync({ type, note });
    setSubmittedId(r.id);
    setNote('');
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-4">
      <h1 className="text-xl md:text-2xl font-semibold">New request</h1>

      <div>
        <label className="label">Type</label>
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="input min-h-32" value={note} onChange={(e) => setNote(e.target.value)} required />
      </div>

      {submittedId && <p className="text-success text-sm">Request submitted ✓ ({submittedId})</p>}
      {create.isError && <p className="text-danger text-sm">{(create.error as Error).message}</p>}

      <button type="submit" className="btn-primary" disabled={create.isPending}>
        {create.isPending ? 'Sending…' : 'Send'}
      </button>
    </form>
  );
}
