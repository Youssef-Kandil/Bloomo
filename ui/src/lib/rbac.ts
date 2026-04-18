import {
  LayoutDashboard,
  Building2,
  Package,
  Users,
  UserSquare2,
  ShieldCheck,
  CheckCircle2,
  Wrench,
  Inbox,
  Clock,
  Wallet,
  MessageCircle,
  Banknote,
  Settings,
  PlusCircle,
  type LucideIcon,
} from 'lucide-react';

export type Role = 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'CLIENT';

export interface ScreenDef {
  key: string;
  labelKey: string;
  href: string;
  icon: LucideIcon;
}

/** Master nav for ADMIN. Manager subset is gated by Permission rows from server. */
export const SCREENS: readonly ScreenDef[] = [
  { key: 'overview', labelKey: 'nav.overview', href: '/dashboard/overview', icon: LayoutDashboard },
  { key: 'company', labelKey: 'nav.company', href: '/dashboard/company', icon: Building2 },
  { key: 'inventory', labelKey: 'nav.inventory', href: '/dashboard/inventory', icon: Package },
  { key: 'employees', labelKey: 'nav.employees', href: '/dashboard/employees', icon: Users },
  { key: 'clients', labelKey: 'nav.clients', href: '/dashboard/clients', icon: UserSquare2 },
  { key: 'permissions', labelKey: 'nav.permissions', href: '/dashboard/permissions', icon: ShieldCheck },
  { key: 'tasks', labelKey: 'nav.tasks', href: '/dashboard/tasks', icon: CheckCircle2 },
  { key: 'tools', labelKey: 'nav.tools', href: '/dashboard/tools', icon: Wrench },
  { key: 'requests', labelKey: 'nav.requests', href: '/dashboard/requests', icon: Inbox },
  { key: 'attendance', labelKey: 'nav.attendance', href: '/dashboard/attendance', icon: Clock },
  { key: 'treasury', labelKey: 'nav.treasury', href: '/dashboard/treasury', icon: Wallet },
  { key: 'payroll', labelKey: 'nav.payroll', href: '/dashboard/payroll', icon: Banknote },
  { key: 'whatsapp', labelKey: 'nav.whatsapp', href: '/dashboard/whatsapp', icon: MessageCircle },
  { key: 'settings', labelKey: 'nav.settings', href: '/dashboard/settings', icon: Settings },
] as const;

export const EMPLOYEE_SCREENS = new Set(['attendance', 'my-tasks', 'settings']);
export const CLIENT_SCREENS = new Set(['new-request', 'settings']);

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'assign';

/** Which actions are meaningful per screen. `view` is always implicit. */
export const SCREEN_ACTIONS: Record<string, readonly PermissionAction[]> = {
  overview: ['view'],
  company: ['view', 'create', 'edit', 'delete'],
  inventory: ['view', 'create', 'edit', 'delete'],
  employees: ['view', 'create', 'edit', 'delete'],
  clients: ['view', 'create', 'edit', 'delete'],
  permissions: ['view', 'edit'],
  tasks: ['view', 'create', 'edit', 'delete', 'assign'],
  tools: ['view', 'create', 'edit', 'delete', 'assign'],
  requests: ['view', 'create', 'edit', 'delete', 'assign'],
  attendance: ['view', 'edit'],
  treasury: ['view', 'create', 'edit', 'delete'],
  payroll: ['view', 'edit'],
  whatsapp: ['view', 'edit'],
  settings: ['view', 'edit'],
};

export interface ManagerPermission {
  screenKey: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAssign: boolean;
}

export function visibleScreens(
  role: Role,
  managerPermissions: ManagerPermission[] = [],
): ScreenDef[] {
  if (role === 'ADMIN') return [...SCREENS];

  if (role === 'EMPLOYEE') {
    return [
      { key: 'attendance', labelKey: 'nav.attendance', href: '/dashboard/attendance', icon: Clock },
      { key: 'my-tasks', labelKey: 'nav.myTasks', href: '/dashboard/my-tasks', icon: CheckCircle2 },
      { key: 'settings', labelKey: 'nav.settings', href: '/dashboard/settings', icon: Settings },
    ];
  }

  if (role === 'CLIENT') {
    return [
      { key: 'new-request', labelKey: 'nav.newRequest', href: '/dashboard/new-request', icon: PlusCircle },
      { key: 'settings', labelKey: 'nav.settings', href: '/dashboard/settings', icon: Settings },
    ];
  }

  // MANAGER — a screen is visible if canView is granted for it
  const allowed = new Set(managerPermissions.filter((p) => p.canView).map((p) => p.screenKey));
  return SCREENS.filter((s) => allowed.has(s.key));
}
