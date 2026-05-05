'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertTriangle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  variant?: 'destructive' | 'default';
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  loading,
  variant = 'destructive',
}: Props): React.ReactElement {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed start-1/2 top-1/2 z-[120] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2',
            'rtl:translate-x-1/2',
            'rounded-2xl border border-border bg-card text-card-foreground shadow-elevated',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          )}
        >
          <div className="px-6 pt-6 pb-4 flex items-start gap-4">
            <div
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full',
                variant === 'destructive'
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-primary/10 text-primary',
              )}
            >
              <AlertTriangle className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogPrimitive.Title className="text-base font-semibold text-foreground">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="mt-1.5 text-sm text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4 rounded-b-2xl">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={variant === 'destructive' ? 'destructive' : 'default'}
              onClick={() => void onConfirm()}
              disabled={loading}
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {confirmLabel}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
