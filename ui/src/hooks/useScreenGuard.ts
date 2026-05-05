'use client';

import { useMemo } from 'react';

import { useMe } from '@/hooks/queries/auth';
import { useMyManagerPermissions } from '@/hooks/queries/permissions';
import {
  ADMIN_ONLY_SCREENS,
  EMPLOYEE_SCREENS,
  CLIENT_SCREENS,
  type Role,
} from '@/lib/rbac';

export interface ScreenGuardResult {
  /** True while we are still loading me/permissions. Render a loader. */
  loading: boolean;
  /** True when the user is authorized to view this screen. */
  allowed: boolean;
  /** True when we have finished loading and the user is forbidden. */
  forbidden: boolean;
  role: Role | null;
}

interface Options {
  /** The rbac screen key (matches keys in SCREENS / SCREEN_ACTIONS). */
  screenKey?: string;
  /** Optional explicit role allowlist. If set, screenKey is ignored. */
  roles?: Role[];
}

/**
 * Permission gate for a dashboard screen.
 *
 *   const guard = useScreenGuard({ screenKey: 'treasury' });
 *   if (guard.loading) return <Loader />;
 *   if (guard.forbidden) return <NotAuthorized />;
 *   ...rest of the page
 */
export function useScreenGuard(opts: Options): ScreenGuardResult {
  const me = useMe();
  const perms = useMyManagerPermissions(me.data?.id, me.data?.role);

  const role: Role | null = (me.data?.role as Role | undefined) ?? null;
  const loading =
    me.isLoading || (role === 'MANAGER' && (perms.isLoading || !perms.isFetched));

  const allowed = useMemo(() => {
    if (!role) return false;

    // Explicit role list overrides screen-based logic.
    if (opts.roles && opts.roles.length > 0) {
      return opts.roles.includes(role);
    }

    if (!opts.screenKey) return true;

    if (role === 'OWNER') return true;
    if (role === 'ADMIN') return true;

    if (role === 'EMPLOYEE') return EMPLOYEE_SCREENS.has(opts.screenKey);
    if (role === 'CLIENT') return CLIENT_SCREENS.has(opts.screenKey);

    if (role === 'MANAGER') {
      if (ADMIN_ONLY_SCREENS.has(opts.screenKey)) return false;
      const allow = (perms.data ?? []).find(
        (p) => p.screenKey === opts.screenKey && p.canView,
      );
      return !!allow;
    }
    return false;
  }, [role, opts.roles, opts.screenKey, perms.data]);

  return {
    loading,
    allowed: !loading && allowed,
    forbidden: !loading && !allowed,
    role,
  };
}
