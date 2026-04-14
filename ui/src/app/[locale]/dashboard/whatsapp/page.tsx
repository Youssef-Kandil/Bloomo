'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

import { api } from '@/lib/api';

interface Session {
  status: 'DISCONNECTED' | 'PAIRING' | 'CONNECTED';
  healthState: 'HEALTHY' | 'THROTTLED' | 'BANNED_SUSPECTED';
  phoneNumber: string | null;
  dailySentCount: number;
  lastQrCode: string | null;
  lastQrAt: string | null;
}

interface StatusResponse {
  session: Session | null;
  provider: 'cloud' | 'web' | 'stub';
  cloudConfigured: boolean;
}

interface MessageRow {
  id: string;
  toPhone: string;
  template: string;
  status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  createdAt: string;
  externalId: string | null;
  error: string | null;
}

const STATUS_BADGE: Record<MessageRow['status'], string> = {
  QUEUED: 'text-fg-muted',
  SENT: 'text-fg',
  DELIVERED: 'text-primary',
  READ: 'text-success',
  FAILED: 'text-danger',
};

export default function WhatsappPage() {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [testTo, setTestTo] = useState('');
  const [testBody, setTestBody] = useState('Hello from Bloomo 🌱');

  const status = useQuery({
    queryKey: ['whatsapp', 'status'],
    queryFn: async () => (await api.get<StatusResponse>('/api/whatsapp/status')).data,
    refetchInterval: 5_000,
  });

  const messages = useQuery({
    queryKey: ['whatsapp', 'messages'],
    queryFn: async () =>
      (await api.get<{ items: MessageRow[] }>('/api/whatsapp/messages')).data.items,
    refetchInterval: 8_000,
  });

  const pair = useMutation({
    mutationFn: async () => (await api.post('/api/whatsapp/pair')).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp', 'status'] }),
  });
  const pairingCode = useMutation({
    mutationFn: async (phoneNumber: string) =>
      (await api.post<{ code: string }>('/api/whatsapp/pairing-code', { phone: phoneNumber })).data,
  });
  const [pairPhone, setPairPhone] = useState('');
  const disconnect = useMutation({
    mutationFn: async () => (await api.post('/api/whatsapp/disconnect')).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp', 'status'] }),
  });
  const resetSession = useMutation({
    mutationFn: async () => (await api.post('/api/whatsapp/reset')).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp', 'status'] }),
  });
  const sendTest = useMutation({
    mutationFn: async () =>
      (await api.post('/api/whatsapp/send-test', { toPhone: testTo, body: testBody })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp', 'messages'] }),
  });
  const broadcast = useMutation({
    mutationFn: async () =>
      (await api.post('/api/whatsapp/broadcast', { text, audience: 'all_opted_in' })).data,
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['whatsapp', 'messages'] });
    },
  });

  const provider = status.data?.provider ?? 'cloud';
  const session = status.data?.session;
  const isConnected = session?.status === 'CONNECTED';

  return (
    <div className="space-y-4">
      <h1 className="text-xl md:text-2xl font-semibold">WhatsApp</h1>

      {/* Provider banner */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm text-fg-muted">Provider</p>
            <p className="text-lg font-semibold">
              {provider === 'cloud' && '☁️ Meta Cloud API (official)'}
              {provider === 'stub' && '🧪 Stub (no real send)'}
              {provider === 'web' && '📱 Baileys (per-company phone pairing)'}
            </p>
          </div>
          <div className="text-end">
            <p className="text-sm text-fg-muted">Status</p>
            <p className={`text-lg font-semibold ${isConnected ? 'text-success' : 'text-warning'}`}>
              {session?.status ?? 'DISCONNECTED'}
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><span className="text-fg-muted">Phone:</span> {session?.phoneNumber ?? '—'}</div>
          <div><span className="text-fg-muted">Health:</span> {session?.healthState ?? '—'}</div>
          <div><span className="text-fg-muted">Sent today:</span> {session?.dailySentCount ?? 0}</div>
          <div><span className="text-fg-muted">Cloud configured:</span> {status.data?.cloudConfigured ? 'Yes' : 'No'}</div>
        </div>

        {provider === 'cloud' && !status.data?.cloudConfigured && (
          <p className="mt-3 text-sm text-warning">
            ⚠️ ضع <code>WHATSAPP_PHONE_NUMBER_ID</code> و <code>WHATSAPP_ACCESS_TOKEN</code> في
            <code> service/.env</code> ثم أعد تشغيل الـ backend.
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => pair.mutate()} disabled={pair.isPending}>
            {provider === 'cloud' ? 'Activate connection' : isConnected ? 'Re-pair' : 'Pair'}
          </button>
          <button className="btn-ghost" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
            Disconnect
          </button>
          <button
            className="btn-danger"
            onClick={() => {
              if (confirm('Reset will delete the saved session files and log out from WhatsApp. Continue?')) {
                resetSession.mutate();
              }
            }}
            disabled={resetSession.isPending}
          >
            Reset session
          </button>
        </div>
      </div>

      {/* QR + Pairing code (web/Baileys provider only) */}
      {provider === 'web' && !isConnected && session?.lastQrCode && (
        <div className="card flex flex-col items-center gap-3">
          <h2 className="text-lg font-medium">Scan this QR from WhatsApp → Linked Devices</h2>
          <QRCodeSVG value={session.lastQrCode} size={240} />
          {session.lastQrAt && (
            <p className="text-xs text-fg-muted">
              Generated {new Date(session.lastQrAt).toLocaleTimeString()} — QR refreshes every ~20 seconds.
            </p>
          )}
        </div>
      )}

      {provider === 'web' && !isConnected && (
        <div className="card space-y-3">
          <h2 className="text-lg font-medium">Or: pair with phone number</h2>
          <p className="text-sm text-fg-muted">
            أدخل رقم تليفونك بالكود الدولي (بدون +). مثال: <code>201278993600</code>.
            بعد الضغط على "Get pairing code" هتظهر كود من 8 أرقام — أدخله في تطبيق واتساب من
            <strong> الإعدادات → الأجهزة المرتبطة → ربط جهاز → ربط برقم الهاتف بدلاً من ذلك</strong>.
          </p>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="label">Phone (E.164 without +)</label>
              <input
                className="input"
                placeholder="201278993600"
                value={pairPhone}
                onChange={(e) => setPairPhone(e.target.value)}
              />
            </div>
            <button
              className="btn-primary"
              onClick={() => pairingCode.mutate(pairPhone)}
              disabled={pairingCode.isPending || pairPhone.length < 8}
            >
              {pairingCode.isPending ? 'Requesting…' : 'Get pairing code'}
            </button>
          </div>
          {pairingCode.data && (
            <div className="p-3 rounded-md bg-primary/10 border border-primary text-center">
              <p className="text-xs text-fg-muted">أدخل هذا الكود في واتساب:</p>
              <p className="text-3xl font-mono font-bold tracking-wider text-primary mt-1">
                {pairingCode.data.code.replace(/^(\w{4})/, '$1 ')}
              </p>
              <p className="text-xs text-fg-muted mt-2">صلاحيته 60 ثانية</p>
            </div>
          )}
          {pairingCode.isError && (
            <p className="text-sm text-danger">
              {(pairingCode.error as { response?: { data?: { error?: { message: string } } } })?.response?.data?.error?.message
                ?? (pairingCode.error as Error).message}
            </p>
          )}
        </div>
      )}

      {/* Test send */}
      {(provider === 'cloud' || provider === 'stub' || (provider === 'web' && isConnected)) && (
        <div className="card space-y-2">
          <h2 className="text-lg font-medium">Send a test message</h2>
          <p className="text-xs text-fg-muted">
            ⚠️ في وضع <strong>cloud</strong>: لازم يكون الرقم المستهدف <strong>مسجل كرقم اختبار</strong> في Meta dashboard،
            أو يكون فتح محادثة معاك في آخر 24 ساعة (لو خارج الـ session window لازم template معتمد).
          </p>
          <div className="grid md:grid-cols-2 gap-2">
            <div>
              <label className="label">رقم بصيغة دولية (مثلاً 201001234567)</label>
              <input className="input" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
            </div>
            <div>
              <label className="label">الرسالة</label>
              <input className="input" value={testBody} onChange={(e) => setTestBody(e.target.value)} />
            </div>
          </div>
          <button
            className="btn-primary"
            onClick={() => sendTest.mutate()}
            disabled={sendTest.isPending || testTo.length < 8 || testBody.length < 1}
          >
            {sendTest.isPending ? 'Sending…' : 'Send test'}
          </button>
          {sendTest.isSuccess && <p className="text-success text-sm">Sent ✓</p>}
          {sendTest.isError && (
            <p className="text-danger text-sm">
              {(sendTest.error as { response?: { data?: { error?: { message: string } } } })?.response?.data?.error?.message
                ?? (sendTest.error as Error).message}
            </p>
          )}
        </div>
      )}

      {/* Broadcast */}
      <div className="card space-y-2">
        <h2 className="text-lg font-medium">Broadcast (opted-in only)</h2>
        <textarea
          className="input min-h-24"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Personalized message — recipient name will be prefixed automatically."
        />
        <button
          className="btn-primary"
          onClick={() => broadcast.mutate()}
          disabled={broadcast.isPending || text.length < 10}
        >
          Send broadcast
        </button>
        {broadcast.isSuccess && <p className="text-success text-sm">Queued ✓</p>}
        {broadcast.isError && <p className="text-danger text-sm">{(broadcast.error as Error).message}</p>}
      </div>

      {/* Recent messages */}
      <div className="card overflow-x-auto">
        <h2 className="text-lg font-medium mb-2">Recent messages</h2>
        <table className="w-full text-sm">
          <thead className="text-fg-muted text-xs uppercase">
            <tr>
              <th className="text-start py-2">When</th>
              <th className="text-start py-2">To</th>
              <th className="text-start py-2">Template</th>
              <th className="text-start py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {messages.data?.map((m) => (
              <tr key={m.id}>
                <td className="py-2 text-xs text-fg-muted">{new Date(m.createdAt).toLocaleString()}</td>
                <td className="py-2">{m.toPhone}</td>
                <td className="py-2">{m.template}</td>
                <td className={`py-2 ${STATUS_BADGE[m.status]}`}>
                  {m.status}
                  {m.error && <span className="block text-xs text-danger truncate max-w-[200px]">{m.error}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {messages.data?.length === 0 && <p className="text-fg-muted">No messages yet.</p>}
      </div>
    </div>
  );
}
