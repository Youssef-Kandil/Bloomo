'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Mic, Pause, Play, Square, Trash2, Upload, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { api, apiAssetUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

const MAX_SECONDS = 60;

/**
 * Picks the best supported MIME type for the current browser, prioritizing
 * Opus-in-WebM (smallest, modern), then OGG, then MP4 fallback for Safari.
 * Returns undefined → MediaRecorder picks its own default (Safari path).
 */
function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return undefined;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export interface VoiceRecorderHandle {
  /** Resolves to the uploaded URL (or null if no recording). Throws on upload failure. */
  uploadIfPresent: () => Promise<{ url: string; durationMs: number } | null>;
  /** True while a recording is in progress (used to disable submit). */
  isRecording: boolean;
}

interface Props {
  /** Endpoint that accepts multipart/form-data `audio` and returns { url }. */
  uploadEndpoint?: string;
  /** Notified whenever the recorder transitions to/from "has a recording". */
  onRecordingChange?: (hasRecording: boolean) => void;
}

/**
 * Self-contained voice recorder with mic permission handling, live timer +
 * waveform meter, max-duration auto-stop, and in-browser playback. The actual
 * upload is deferred — the parent calls `uploadIfPresent()` at submit time so
 * the audio never hits the server unless the form is actually submitted.
 */
export const VoiceRecorder = React.forwardRef<VoiceRecorderHandle, Props>(
  function VoiceRecorder({ uploadEndpoint = '/api/requests/voice-note', onRecordingChange }, ref) {
    const t = useTranslations('voiceRecorder');

    type Phase = 'idle' | 'recording' | 'recorded' | 'playing';
    const [phase, setPhase] = React.useState<Phase>('idle');
    const [elapsed, setElapsed] = React.useState(0);
    const [level, setLevel] = React.useState(0);
    const [error, setError] = React.useState<string | null>(null);

    const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
    const streamRef = React.useRef<MediaStream | null>(null);
    const chunksRef = React.useRef<Blob[]>([]);
    const blobRef = React.useRef<Blob | null>(null);
    const blobUrlRef = React.useRef<string | null>(null);
    const audioCtxRef = React.useRef<AudioContext | null>(null);
    const analyserRef = React.useRef<AnalyserNode | null>(null);
    const rafRef = React.useRef<number | null>(null);
    const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
    const startedAtRef = React.useRef<number>(0);
    const playerRef = React.useRef<HTMLAudioElement | null>(null);

    const stopMicAndAnalyser = React.useCallback((): void => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => undefined);
        audioCtxRef.current = null;
        analyserRef.current = null;
      }
    }, []);

    React.useEffect(() => {
      return () => {
        stopMicAndAnalyser();
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      };
    }, [stopMicAndAnalyser]);

    React.useEffect(() => {
      onRecordingChange?.(phase === 'recorded' || phase === 'playing');
    }, [phase, onRecordingChange]);

    function discardCurrent(): void {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      blobRef.current = null;
      chunksRef.current = [];
      setElapsed(0);
    }

    async function startRecording(): Promise<void> {
      setError(null);
      discardCurrent();
      // Browsers gate mic access behind a secure context (HTTPS or localhost).
      // Over plain HTTP on a LAN IP, `navigator.mediaDevices` is undefined,
      // so calling getUserMedia would crash with a confusing TypeError —
      // surface a precise, actionable message instead.
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setError(
          window.isSecureContext === false
            ? t('errorInsecureContext')
            : t('errorNoMic'),
        );
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        streamRef.current = stream;
        const mime = pickMimeType();
        const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          blobRef.current = blob;
          if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = URL.createObjectURL(blob);
          stopMicAndAnalyser();
          setPhase('recorded');
        };

        // Level meter wiring
        const audioCtx = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        audioCtxRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        audioCtx.createMediaStreamSource(stream).connect(analyser);
        const buf = new Uint8Array(analyser.frequencyBinCount);
        const tick = (): void => {
          analyser.getByteTimeDomainData(buf);
          let peak = 0;
          for (let i = 0; i < buf.length; i++) {
            const v = Math.abs(buf[i] - 128) / 128;
            if (v > peak) peak = v;
          }
          setLevel(peak);
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);

        recorder.start(100);
        startedAtRef.current = performance.now();
        setElapsed(0);
        setPhase('recording');
        timerRef.current = setInterval(() => {
          const e = (performance.now() - startedAtRef.current) / 1000;
          setElapsed(e);
          if (e >= MAX_SECONDS) {
            // Auto-stop at the limit; onstop transitions to "recorded".
            try {
              recorder.stop();
            } catch {
              /* already stopped */
            }
          }
        }, 100);
      } catch (e) {
        const err = e as Error & { name?: string };
        const msg =
          err.name === 'NotAllowedError'
            ? t('errorPermission')
            : err.name === 'NotFoundError'
              ? t('errorNoMic')
              : err.message || t('errorGeneric');
        setError(msg);
        setPhase('idle');
        stopMicAndAnalyser();
      }
    }

    function stopRecording(): void {
      try {
        mediaRecorderRef.current?.stop();
      } catch {
        /* noop */
      }
    }

    function togglePlay(): void {
      if (!playerRef.current || !blobUrlRef.current) return;
      if (phase === 'playing') {
        playerRef.current.pause();
      } else {
        void playerRef.current.play();
      }
    }

    React.useImperativeHandle(
      ref,
      () => ({
        isRecording: phase === 'recording',
        async uploadIfPresent(): Promise<{ url: string; durationMs: number } | null> {
          if (!blobRef.current) return null;
          const ext =
            blobRef.current.type.includes('ogg')
              ? 'ogg'
              : blobRef.current.type.includes('mp4')
                ? 'm4a'
                : 'webm';
          const fd = new FormData();
          fd.append('audio', blobRef.current, `note.${ext}`);
          const res = await api.post<{ url: string }>(uploadEndpoint, fd);
          return { url: res.data.url, durationMs: Math.round(elapsed * 1000) };
        },
      }),
      [phase, elapsed, uploadEndpoint],
    );

    const hasRecording = phase === 'recorded' || phase === 'playing';
    const isRecording = phase === 'recording';
    const progressPct = Math.min(100, (elapsed / MAX_SECONDS) * 100);
    // True iff this browser blocks getUserMedia entirely (insecure context
    // over HTTP from a non-localhost host, or really old browser).
    // Evaluated lazily so SSR doesn't access `navigator`.
    const micBlocked =
      typeof window !== 'undefined' &&
      (!navigator.mediaDevices?.getUserMedia || window.isSecureContext === false);

    return (
      <div className="space-y-2">
        <div
          className={cn(
            'rounded-xl border bg-card p-3 sm:p-4 transition-colors',
            isRecording
              ? 'border-rose-500/50 bg-rose-500/5'
              : hasRecording
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : 'border-border',
          )}
        >
          <div className="flex items-center gap-3">
            {/* Primary control */}
            {phase === 'idle' && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => void startRecording()}
                aria-label={t('start')}
                disabled={micBlocked}
                title={micBlocked ? t('errorInsecureContext') : undefined}
              >
                <Mic className="size-4" />
              </Button>
            )}
            {isRecording && (
              <Button
                type="button"
                variant="default"
                size="icon"
                onClick={stopRecording}
                aria-label={t('stop')}
                className="bg-rose-500 hover:bg-rose-600 text-white animate-pulse"
              >
                <Square className="size-4 fill-current" />
              </Button>
            )}
            {hasRecording && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={togglePlay}
                aria-label={phase === 'playing' ? t('pause') : t('play')}
              >
                {phase === 'playing' ? <Pause className="size-4" /> : <Play className="size-4" />}
              </Button>
            )}

            {/* Timer + level meter */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-mono tabular-nums">
                  {formatTime(elapsed)} / {formatTime(MAX_SECONDS)}
                </span>
                <span className="text-muted-foreground">
                  {isRecording
                    ? t('recording')
                    : hasRecording
                      ? t('ready')
                      : t('hint')}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all',
                    isRecording ? 'bg-rose-500' : 'bg-emerald-500',
                  )}
                  style={{
                    width: isRecording ? `${progressPct}%` : hasRecording ? '100%' : '0%',
                  }}
                />
              </div>
              {isRecording && (
                <div className="mt-1 h-0.5 w-full bg-muted overflow-hidden rounded-full">
                  <div
                    className="h-full bg-rose-400 transition-[width] duration-75"
                    style={{ width: `${Math.min(100, level * 200)}%` }}
                  />
                </div>
              )}
            </div>

            {hasRecording && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  discardCurrent();
                  setPhase('idle');
                }}
                aria-label={t('discard')}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>

          {hasRecording && (
            <audio
              ref={playerRef}
              src={blobUrlRef.current ?? undefined}
              onPlay={() => setPhase('playing')}
              onPause={() => setPhase('recorded')}
              onEnded={() => setPhase('recorded')}
              className="hidden"
            />
          )}
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="size-3.5" />
            <span>{error}</span>
          </div>
        )}

        {micBlocked && phase === 'idle' && !error && (
          <div className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300">
            <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
            <span>{t('errorInsecureContext')}</span>
          </div>
        )}
      </div>
    );
  },
);

/** Read-only player for an already-uploaded voice note (used in admin views). */
export function VoiceNotePlayer({
  url,
  durationMs,
  className,
}: {
  url: string;
  durationMs?: number | null;
  className?: string;
}): React.ReactElement {
  const t = useTranslations('voiceRecorder');
  const seconds = durationMs ? Math.round(durationMs / 1000) : null;
  return (
    <div className={cn('rounded-lg border border-border bg-card p-3 flex items-center gap-3', className)}>
      <Upload className="size-4 text-primary rotate-180" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium">{t('attachedNote')}</p>
        {seconds !== null && (
          <p className="text-[11px] text-muted-foreground tabular-nums">{formatTime(seconds)}</p>
        )}
      </div>
      {/* Browser-native controls keep things lightweight (no extra JS), and
          the file is served with long cache headers so re-plays are instant. */}
      <audio src={apiAssetUrl(url)} controls preload="none" className="h-8 max-w-[220px]" />
    </div>
  );
}
