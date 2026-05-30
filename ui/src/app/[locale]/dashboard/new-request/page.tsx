'use client';

import axios from 'axios';
import { useRef, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Loader2, Send, Wrench } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { VoiceRecorder, type VoiceRecorderHandle } from '@/components/shared/VoiceRecorder';
import { useCreateRequest } from '@/hooks/queries/requests';
import { cn } from '@/lib/utils';

const TYPES = ['MAINTENANCE', 'INSPECTION', 'REPAIR', 'SUPPLY', 'INSTALL', 'SUPPLY_INSTALL'] as const;
type RequestType = (typeof TYPES)[number];

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: { message?: string } } | undefined;
    return data?.error?.message ?? err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

export default function NewRequestPage() {
  const t = useTranslations();
  const create = useCreateRequest();
  const recorderRef = useRef<VoiceRecorderHandle>(null);

  const [type, setType] = useState<RequestType>('MAINTENANCE');
  const [note, setNote] = useState('');
  const [hasVoice, setHasVoice] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  // A request needs *some* description: text note OR a recorded voice note.
  // Both being empty would leave staff with no idea what the client needs.
  const hasNote = note.trim().length > 0;
  const hasDescription = hasNote || hasVoice;

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (recorderRef.current?.isRecording) {
      toast.error(t('newRequest.stopRecordingFirst'));
      return;
    }
    if (!hasDescription) {
      toast.error(t('newRequest.descriptionRequired'));
      return;
    }
    try {
      // Upload the voice note first (if recorded). Done before creating the
      // request so the request row links to a definitely-stored file — if the
      // upload fails the request is never created.
      const audio = await recorderRef.current?.uploadIfPresent().catch((err) => {
        toast.error(t('newRequest.audioUploadFailed', { reason: errorMessage(err) }));
        throw err;
      });
      const r = await create.mutateAsync({
        type,
        note: note.trim() || undefined,
        voiceNoteUrl: audio?.url,
        voiceDurationMs: audio?.durationMs,
      });
      setSubmittedId(r.id);
      setNote('');
      toast.success(t('newRequest.submitted'));
    } catch (err) {
      if (!axios.isAxiosError(err) && !(err instanceof Error)) return;
      toast.error(errorMessage(err));
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-2xl mx-auto space-y-4"
    >
      <header>
        <h1 className="text-xl md:text-2xl font-semibold">{t('newRequest.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('newRequest.subtitle')}</p>
      </header>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="size-4 text-primary" />
            {t('newRequest.details')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            {/* Type — pills instead of a raw select so labels are obviously
                localized and the user can compare options at a glance. */}
            <div className="space-y-2">
              <Label>
                {t('newRequest.typeLabel')} <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TYPES.map((typ) => {
                  const active = type === typ;
                  return (
                    <button
                      key={typ}
                      type="button"
                      onClick={() => setType(typ)}
                      className={cn(
                        'rounded-lg border px-3 py-2.5 text-sm font-medium transition-all',
                        active
                          ? 'border-primary bg-primary/10 text-foreground shadow-soft'
                          : 'border-border bg-card hover:bg-muted/40 text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {t(`newRequest.type.${typ}`)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Text note */}
            <div className="space-y-2">
              <Label htmlFor="note">{t('newRequest.noteLabel')}</Label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder={t('newRequest.notePlaceholder')}
                className="flex w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm shadow-soft placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="text-xs text-muted-foreground">{note.length} / 2000</p>
            </div>

            {/* Voice note */}
            <div className="space-y-2">
              <Label>{t('newRequest.voiceLabel')}</Label>
              <VoiceRecorder ref={recorderRef} onRecordingChange={setHasVoice} />
              <p className="text-xs text-muted-foreground">{t('newRequest.voiceHint')}</p>
            </div>

            {/* Either-or validation hint — visible until the user provides
                a description (typed OR recorded). Turns success-styled once
                satisfied so the user gets immediate positive feedback. */}
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg border p-3 text-sm transition-colors',
                hasDescription
                  ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300'
                  : 'border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300',
              )}
            >
              {hasDescription ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : (
                <AlertCircle className="size-4 shrink-0" />
              )}
              <span>
                {hasDescription
                  ? t('newRequest.descriptionOk')
                  : t('newRequest.descriptionRequired')}
              </span>
            </div>

            {submittedId && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>{t('newRequest.submitted')} — #{submittedId.slice(-6)}</span>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="gradient"
                size="lg"
                disabled={create.isPending || !hasDescription}
                title={!hasDescription ? t('newRequest.descriptionRequired') : undefined}
              >
                {create.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                {t('newRequest.submit')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
