import type { NextFunction, Request, Response } from 'express';

import { prisma } from '@/config/prisma';
import { AppError } from '@/lib/http-error';
import { verifyAccessToken } from '@/lib/jwt';
import type { Role } from '@prisma/client';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    next(AppError.unauthorized('Missing bearer token'));
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      companyId: payload.companyId,
    };
    next();
  } catch {
    next(AppError.unauthorized('Invalid or expired token'));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(AppError.forbidden('Role not allowed'));
      return;
    }
    next();
  };
}

const HARDCODED_EMPLOYEE_SCREENS = new Set(['attendance', 'my-tasks', 'settings']);
const HARDCODED_CLIENT_SCREENS = new Set(['new-request', 'settings']);

type PermissionAction = 'view' | 'edit';

export function requirePermission(screenKey: string, action: PermissionAction = 'view') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    const { id, role } = req.user;

    if (role === 'ADMIN') {
      next();
      return;
    }

    if (role === 'EMPLOYEE') {
      if (HARDCODED_EMPLOYEE_SCREENS.has(screenKey)) next();
      else next(AppError.forbidden('Screen not allowed for employees'));
      return;
    }

    if (role === 'CLIENT') {
      if (HARDCODED_CLIENT_SCREENS.has(screenKey)) next();
      else next(AppError.forbidden('Screen not allowed for clients'));
      return;
    }

    // MANAGER
    try {
      const row = await prisma.permission.findUnique({
        where: { managerId_screenKey: { managerId: id, screenKey } },
      });
      if (!row) {
        next(AppError.forbidden('Permission not granted'));
        return;
      }
      const allowed = action === 'view' ? row.canView || row.canEdit : row.canEdit;
      if (!allowed) next(AppError.forbidden('Permission not granted'));
      else next();
    } catch (err) {
      next(err);
    }
  };
}
