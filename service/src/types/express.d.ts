import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface UserContext {
      id: string;
      role: Role;
      companyId: string | null;
    }
    interface Request {
      user?: UserContext;
    }
  }
}

export {};
