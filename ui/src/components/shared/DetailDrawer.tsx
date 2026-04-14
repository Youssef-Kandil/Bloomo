'use client';

import * as React from 'react';
import { Loader2, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export type DrawerMode = 'create' | 'edit' | 'view';

interface BaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  side?: 'left' | 'right';
  children: React.ReactNode;
  className?: string;
}

interface FormProps extends BaseProps {
  mode: 'create' | 'edit';
  onSubmit?: () => void | Promise<void>;
  submitLabel?: string;
  cancelLabel?: string;
  submitting?: boolean;
  submitDisabled?: boolean;
}

interface ViewProps extends BaseProps {
  mode: 'view';
  onEdit?: () => void;
  onDelete?: () => void | Promise<void>;
  deleting?: boolean;
  editLabel?: string;
  deleteLabel?: string;
}

export type DetailDrawerProps = FormProps | ViewProps;

export function DetailDrawer(props: DetailDrawerProps): React.ReactElement {
  const { open, onOpenChange, title, description, side = 'right', children, className } = props;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className={cn('w-full sm:max-w-lg', className)}>
        <SheetHeader>
          <div className="flex items-start justify-between gap-3 pe-8">
            <div className="flex-1 min-w-0">
              <SheetTitle>{title}</SheetTitle>
              {description && <SheetDescription>{description}</SheetDescription>}
            </div>
            {props.mode === 'view' && props.onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => props.onDelete?.()}
                disabled={props.deleting}
                aria-label={props.deleteLabel ?? 'Delete'}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                {props.deleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            )}
          </div>
        </SheetHeader>

        {props.mode === 'create' || props.mode === 'edit' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void props.onSubmit?.();
            }}
            className="flex flex-col flex-1 min-h-0"
          >
            <SheetBody>{children}</SheetBody>
            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={props.submitting}
              >
                {props.cancelLabel ?? 'Cancel'}
              </Button>
              <Button
                type="submit"
                variant="gradient"
                disabled={props.submitting || props.submitDisabled}
              >
                {props.submitting && <Loader2 className="size-4 animate-spin" />}
                {props.submitLabel ?? (props.mode === 'create' ? 'Create' : 'Save')}
              </Button>
            </SheetFooter>
          </form>
        ) : (
          <ViewContent viewProps={props as ViewProps}>{children}</ViewContent>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ViewContent({
  viewProps,
  children,
}: {
  viewProps: ViewProps;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <>
      <SheetBody>{children}</SheetBody>
      {viewProps.onEdit && (
        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => viewProps.onEdit?.()}>
            <Pencil className="size-4" />
            {viewProps.editLabel ?? 'Edit'}
          </Button>
        </SheetFooter>
      )}
    </>
  );
}

/** Labeled row for view mode: <DetailRow label="Status">Active</DetailRow> */
export function DetailRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 py-3 border-b border-border last:border-0',
        className,
      )}
    >
      <span className="text-sm font-medium text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-foreground text-end break-words">{children}</span>
    </div>
  );
}
