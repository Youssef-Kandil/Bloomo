/**
 * Multi-tenant SaaS demo seed.
 *
 * Creates several independent companies (each with its OWN admin / staff /
 * data), spread across the four plan tiers and every subscription state, so
 * the system-owner dashboard and per-company flows can all be exercised:
 *
 *   - Bloomo Demo Co.            PRO         ACTIVE      (existing)
 *   - Tech Solutions             TRIAL       TRIALING    (fresh signup)
 *   - AirCo Services             BASIC       ACTIVE      (yearly)
 *   - Fast Maintenance Group     ENTERPRISE  ACTIVE      (large team)
 *   - Past Services Co.          BASIC       EXPIRED     (admin gets redirected)
 *   - Pending Co.                TRIAL       PENDING_ACTIVATION (sales-contacted)
 *
 * For each company, ~3 months of historical records are generated:
 * branches, employees, manager, clients, requests with assignments/ratings,
 * tasks, supply ops, treasury, attendance, HR requests, location pings.
 *
 * Idempotent — re-runs delete records tagged `[SEED]` per-company and recreate
 * them. Pre-existing accounts (admin@bloomo.local, manager@bloomo.local,
 * emp1/2@bloomo.local, owner@bloomo.local) are preserved.
 *
 *   npx tsx prisma/seed-history.ts
 */
import { PrismaClient, type Prisma, type SubscriptionPlan } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const SEED_TAG = '[SEED]';
const PASSWORD = 'Password123!';
const NOW = new Date();
const DAY_MS = 24 * 60 * 60 * 1000;

interface TenantSpec {
  adminEmail: string;
  adminName: string;
  companyName: string;
  plan: SubscriptionPlan;
  billingCycle: 'MONTHLY' | 'YEARLY' | null;
  status: 'TRIALING' | 'ACTIVE' | 'EXPIRED' | 'PENDING_ACTIVATION';
  branches: number;
  employees: number;
  clients: number;
  /** days until trial ends (signed) — only used for TRIAL/PENDING_ACTIVATION */
  trialDays?: number;
  /** days until current period ends (signed; negative = expired) */
  periodDays?: number;
  /** scale factor for activity (requests/tasks/etc.) */
  activityScale?: number;
}

const TENANTS: TenantSpec[] = [
  {
    adminEmail: 'admin@bloomo.local',
    adminName: 'Admin Demo',
    companyName: 'Bloomo Demo Co.',
    plan: 'PRO',
    billingCycle: 'MONTHLY',
    status: 'ACTIVE',
    branches: 2,
    employees: 6,
    clients: 25,
    periodDays: 25,
    activityScale: 1.0,
  },
  {
    adminEmail: 'admin.tech@example.com',
    adminName: 'Karim Tech',
    companyName: 'Tech Solutions',
    plan: 'TRIAL',
    billingCycle: null,
    status: 'TRIALING',
    branches: 1,
    employees: 1,
    clients: 8,
    trialDays: 25,
    activityScale: 0.4,
  },
  {
    adminEmail: 'admin.airco@example.com',
    adminName: 'Hassan AirCo',
    companyName: 'AirCo Services',
    plan: 'BASIC',
    billingCycle: 'YEARLY',
    status: 'ACTIVE',
    branches: 1,
    employees: 4,
    clients: 40,
    periodDays: 200,
    activityScale: 0.8,
  },
  {
    adminEmail: 'admin.fast@example.com',
    adminName: 'Mohamed Fast',
    companyName: 'Fast Maintenance Group',
    plan: 'ENTERPRISE',
    billingCycle: 'MONTHLY',
    status: 'ACTIVE',
    branches: 4,
    employees: 12,
    clients: 60,
    periodDays: 12,
    activityScale: 1.4,
  },
  {
    adminEmail: 'admin.expired@example.com',
    adminName: 'Tarek Expired',
    companyName: 'Past Services Co.',
    plan: 'BASIC',
    billingCycle: 'MONTHLY',
    status: 'EXPIRED',
    branches: 1,
    employees: 3,
    clients: 12,
    periodDays: -7,
    activityScale: 0.5,
  },
  {
    adminEmail: 'admin.pending@example.com',
    adminName: 'Wael Pending',
    companyName: 'Pending Co.',
    plan: 'TRIAL',
    billingCycle: null,
    status: 'PENDING_ACTIVATION',
    branches: 1,
    employees: 2,
    clients: 10,
    trialDays: 5,
    activityScale: 0.5,
  },
];

const CLIENT_NAMES = [
  'Khaled Ibrahim','Mona Saeed','Tarek Hassan','Rana Ashraf','Mahmoud Naguib','Sara Fahmy',
  'Ahmed Selim','Yara Mostafa','Karim Riad','Hala Adel','Omar Magdy','Heba El-Sayed',
  'Marwan Helmy','Nourhan Aly','Bassem Atef','Dina Lotfi','Hossam Anwar','Salma Tarek',
  'Youssef Wagih','Reem Sherif','Walid Sami','Asmaa Khaled','Fady Ezzat','Iman Reda',
  'Mostafa Gamil','Lina Hesham','Amr Saleh','Nada Samir','Haitham Adly','Rasha Magdy',
  'Sameh Ezzat','Mai Ihab','Ehab Magdi','Donia Abu Bakr','Tamer Riad','Loay Helmy',
  'Bishoy Adel','Mariam Hossam','Marwa Ali','Karim Ezzat','Ziad Kamel','Yasmine Helmy',
  'Hany Saad','Rania Sherif','Abeer Naguib','Nabil Adel','Sahar Wahid','Magdy Sami',
  'Suzan Helmy','Adham Talat','Abdo Reda','Maged Hosny','Aliaa Sayed','Nesma Anwar',
  'Tony Adel','Mariam Ezzat','Hesham Tawfik','Fatma Anwar','Sherif Atef','Layla Ezzat',
];

const EMPLOYEE_FIRST = ['Adel','Mahmoud','Ali','Hassan','Mostafa','Sayed','Ehab','Sherif','Hany','Nasser','Atef','Tamer','Bassem','Karim','Reda'];
const EMPLOYEE_LAST = ['Foreman','Tech','Engineer','Specialist','Operator','Master','Pro'];

const BRANCH_LAT = 30.0444;
const BRANCH_LNG = 31.2357;
const ADDRESSES = [
  'Nasr City, Cairo','Maadi, Cairo','Heliopolis, Cairo','Zamalek, Cairo','6th of October',
  'New Cairo','Sheikh Zayed','Dokki, Giza','Mohandessin, Giza','Ain Shams, Cairo',
  'Shubra, Cairo','Tagammoa, Cairo','Mokattam, Cairo','El Marg, Cairo','Helwan, Cairo',
];
const BRANCH_NAMES = ['Main Branch','New Cairo Branch','6 October Branch','Heliopolis Branch','Maadi Branch','Sheikh Zayed Branch'];

const REQUEST_TYPES: Prisma.RequestCreateInput['type'][] = [
  'MAINTENANCE','INSPECTION','REPAIR','SUPPLY','INSTALL','SUPPLY_INSTALL',
];
const REQUEST_NOTES: Record<string, string[]> = {
  MAINTENANCE: ['AC not cooling','Routine check','Compressor noise','Filter clogged'],
  INSPECTION: ['Yearly inspection','Pre-purchase check'],
  REPAIR: ['Leak repair','Electrical fault','Cable damage'],
  SUPPLY: ['Spare parts','Refrigerant top-up'],
  INSTALL: ['New unit install','Mount bracket install'],
  SUPPLY_INSTALL: ['Supply + install full kit'],
};

function daysAgo(n: number, hour = 9, minute = 0): Date {
  const d = new Date(NOW.getTime() - n * DAY_MS);
  d.setHours(hour, minute, 0, 0);
  return d;
}
function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}
function rand(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}
function seedRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

async function clearTenant(companyId: string): Promise<void> {
  const seededClients = await prisma.client.findMany({
    where: { companyId, note: { startsWith: SEED_TAG } },
    select: { id: true },
  });
  const clientIds = seededClients.map((c) => c.id);
  if (clientIds.length) {
    const reqs = await prisma.request.findMany({
      where: { clientId: { in: clientIds } },
      select: { id: true },
    });
    if (reqs.length) await prisma.request.deleteMany({ where: { id: { in: reqs.map((r) => r.id) } } });
    await prisma.task.deleteMany({ where: { clientId: { in: clientIds } } });
    const ops = await prisma.supplyOperation.findMany({
      where: { clientId: { in: clientIds } },
      select: { id: true },
    });
    if (ops.length) {
      await prisma.supplyOperationItem.deleteMany({ where: { operationId: { in: ops.map((o) => o.id) } } });
      await prisma.supplyOperation.deleteMany({ where: { id: { in: ops.map((o) => o.id) } } });
    }
    await prisma.client.deleteMany({ where: { id: { in: clientIds } } });
  }

  const seededEmps = await prisma.user.findMany({
    where: { companyId, role: 'EMPLOYEE', whatsappPhone: { startsWith: '+SEED' } },
    select: { id: true },
  });
  const empIds = seededEmps.map((u) => u.id);
  if (empIds.length) {
    await prisma.locationPing.deleteMany({ where: { employeeId: { in: empIds } } });
    await prisma.attendance.deleteMany({ where: { employeeId: { in: empIds } } });
    await prisma.offDayAttendanceRequest.deleteMany({ where: { employeeId: { in: empIds } } });
    await prisma.overtimeRequest.deleteMany({ where: { employeeId: { in: empIds } } });
    await prisma.leaveRequest.deleteMany({ where: { employeeId: { in: empIds } } });
    await prisma.salaryAdvance.deleteMany({ where: { employeeId: { in: empIds } } });
    await prisma.assignment.deleteMany({ where: { employeeId: { in: empIds } } });
    await prisma.toolAssignment.deleteMany({ where: { employeeId: { in: empIds } } });
    await prisma.task.deleteMany({ where: { assigneeId: { in: empIds } } });
    await prisma.employee.deleteMany({ where: { id: { in: empIds } } });
    await prisma.user.deleteMany({ where: { id: { in: empIds } } });
  }

  const seededManagers = await prisma.user.findMany({
    where: { companyId, role: 'MANAGER', whatsappPhone: { startsWith: '+SEED' } },
    select: { id: true },
  });
  if (seededManagers.length) {
    const ids = seededManagers.map((m) => m.id);
    await prisma.permission.deleteMany({ where: { managerId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }

  await prisma.branch.deleteMany({
    where: { companyId, name: { startsWith: SEED_TAG } },
  });

  await prisma.treasuryEntry.deleteMany({
    where: { companyId, reason: { startsWith: SEED_TAG } },
  });
}

async function ensureTenant(spec: TenantSpec, hash: string): Promise<{ adminId: string; companyId: string }> {
  const existingAdmin = await prisma.user.findUnique({ where: { email: spec.adminEmail } });
  let adminId: string;
  let companyId: string;

  if (existingAdmin) {
    adminId = existingAdmin.id;
    if (!existingAdmin.companyId) {
      // create company and link
      const company = await prisma.company.create({
        data: { name: spec.companyName, ownerAdminId: adminId },
      });
      companyId = company.id;
      await prisma.user.update({ where: { id: adminId }, data: { companyId } });
    } else {
      companyId = existingAdmin.companyId;
      await prisma.company.update({ where: { id: companyId }, data: { name: spec.companyName } });
      await prisma.user.update({
        where: { id: adminId },
        data: { name: spec.adminName, role: 'ADMIN', active: true, bannedAt: null },
      });
    }
  } else {
    const admin = await prisma.user.create({
      data: { email: spec.adminEmail, passwordHash: hash, name: spec.adminName, role: 'ADMIN' },
    });
    adminId = admin.id;
    const company = await prisma.company.create({
      data: { name: spec.companyName, ownerAdminId: adminId },
    });
    companyId = company.id;
    await prisma.user.update({ where: { id: adminId }, data: { companyId } });
  }

  // Subscription
  const trialEndsAt =
    spec.plan === 'TRIAL' && spec.trialDays !== undefined
      ? new Date(NOW.getTime() + spec.trialDays * DAY_MS)
      : null;
  const currentPeriodEnd =
    spec.plan !== 'TRIAL' && spec.periodDays !== undefined
      ? new Date(NOW.getTime() + spec.periodDays * DAY_MS)
      : null;

  await prisma.subscription.upsert({
    where: { companyId },
    update: {
      plan: spec.plan,
      billingCycle: spec.billingCycle,
      status: spec.status,
      trialEndsAt,
      currentPeriodEnd,
      customClientsLimit: null,
      customEmployeesLimit: null,
      customBranchesLimit: null,
    },
    create: {
      companyId,
      plan: spec.plan,
      billingCycle: spec.billingCycle,
      status: spec.status,
      trialEndsAt,
      currentPeriodEnd,
    },
  });

  return { adminId, companyId };
}

async function seedTenant(spec: TenantSpec, adminId: string, companyId: string, hash: string, idx: number): Promise<void> {
  console.log(`\n=== ${spec.companyName} (${spec.plan} / ${spec.status}) ===`);
  await clearTenant(companyId);

  const rng = seedRng(100 + idx * 37);
  const slug = spec.adminEmail.split('@')[0].replace(/\./g, '_');
  const ts = Date.now();

  // ---- BRANCHES -----------------------------------------------------
  let branches = await prisma.branch.findMany({ where: { companyId } });
  while (branches.length < spec.branches) {
    const i = branches.length;
    const name = `${SEED_TAG} ${BRANCH_NAMES[i] ?? `Branch ${i + 1}`}`;
    await prisma.branch.create({
      data: {
        companyId,
        name,
        address: pick(ADDRESSES, rng),
        lat: BRANCH_LAT + (rng() - 0.5) * 0.1,
        lng: BRANCH_LNG + (rng() - 0.5) * 0.1,
      },
    });
    branches = await prisma.branch.findMany({ where: { companyId } });
  }
  console.log(`  ✓ Branches: ${branches.length}`);

  // ---- EMPLOYEES ----------------------------------------------------
  const employees: { userId: string; name: string }[] = [];
  for (let i = 0; i < spec.employees; i++) {
    const name = `${pick(EMPLOYEE_FIRST, rng)} ${pick(EMPLOYEE_LAST, rng)}`;
    const email = `${slug}.emp${i + 1}@bloomo.local`;
    const branch = branches[i % branches.length];
    const u = await prisma.user.create({
      data: {
        email,
        passwordHash: hash,
        name,
        role: 'EMPLOYEE',
        companyId,
        whatsappPhone: `+SEED${ts}${idx}${i.toString().padStart(2, '0')}`,
      },
    });
    await prisma.employee.create({
      data: {
        id: u.id,
        branchId: branch.id,
        currentLat: BRANCH_LAT + (rng() - 0.5) * 0.05,
        currentLng: BRANCH_LNG + (rng() - 0.5) * 0.05,
        lastPingAt: new Date(),
        checkInTime: '09:00',
        checkOutTime: '17:00',
        offDays: [5, 6],
        monthlySalary: 5000 + i * 400,
      },
    });
    employees.push({ userId: u.id, name });
  }
  console.log(`  ✓ Employees: ${employees.length}`);

  // Branch manager (only for medium+ tenants)
  if (spec.employees >= 4) {
    const mgrEmail = `${slug}.manager@bloomo.local`;
    const existingMgr = await prisma.user.findUnique({ where: { email: mgrEmail } });
    if (!existingMgr) {
      const mgr = await prisma.user.create({
        data: {
          email: mgrEmail,
          passwordHash: hash,
          name: `${pick(EMPLOYEE_FIRST, rng)} Branch Manager`,
          role: 'MANAGER',
          companyId,
          branchId: branches[branches.length - 1].id,
          whatsappPhone: `+SEED${ts}${idx}MG`,
        },
      });
      const screens = ['overview','requests','clients','employees','tasks','attendance','treasury','settings'];
      for (const s of screens) {
        await prisma.permission.create({
          data: {
            managerId: mgr.id,
            screenKey: s,
            canView: true,
            canEdit: true,
            canCreate: true,
            canAssign: true,
          },
        });
      }
      console.log(`  ✓ Manager: ${mgrEmail}`);
    }
  }

  // ---- CLIENTS ------------------------------------------------------
  const clients: { id: string; name: string }[] = [];
  for (let i = 0; i < spec.clients; i++) {
    const name = CLIENT_NAMES[(i * 7 + idx * 11) % CLIENT_NAMES.length];
    const c = await prisma.client.create({
      data: {
        companyId,
        name,
        note: `${SEED_TAG} ${spec.companyName} client ${i + 1}`,
        address: pick(ADDRESSES, rng),
        lat: BRANCH_LAT + (rng() - 0.5) * 0.1,
        lng: BRANCH_LNG + (rng() - 0.5) * 0.1,
        marketingOptIn: rng() > 0.5,
        phones: {
          create: [
            { label: 'مالك', phone: `+201${rand(100, 199, rng)}${rand(1000000, 9999999, rng)}`, isWhatsapp: true },
          ],
        },
      },
    });
    clients.push({ id: c.id, name });
  }
  console.log(`  ✓ Clients: ${clients.length}`);

  // ---- INVENTORY (basic shared set) --------------------------------
  const skus = [
    { sku: 'AC-FILTER', name: 'AC Filter', qty: 50, price: 75 },
    { sku: 'CAPACITOR', name: 'Capacitor', qty: 30, price: 120 },
    { sku: 'COPPER-PIPE-3M', name: 'Copper pipe 3m', qty: 25, price: 350 },
  ];
  for (const it of skus) {
    await prisma.inventoryItem.upsert({
      where: { companyId_sku: { companyId, sku: it.sku } },
      update: {},
      create: { companyId, sku: it.sku, name: it.name, qty: it.qty, unitPrice: it.price },
    });
  }
  const inventory = await prisma.inventoryItem.findMany({ where: { companyId } });

  // ---- REQUESTS / ASSIGNMENTS / RATINGS / HISTORY ------------------
  const scale = spec.activityScale ?? 1.0;
  const reqCount = Math.floor(20 * scale);
  let assignmentCount = 0, ratingCount = 0;
  for (let i = 0; i < reqCount; i++) {
    const ageDays = rand(0, 89, rng);
    const type = pick(REQUEST_TYPES, rng);
    const client = pick(clients, rng);
    const createdAt = daysAgo(ageDays, rand(8, 17, rng), rand(0, 59, rng));

    const r = rng();
    let status: 'COMPLETED' | 'IN_PROGRESS' | 'ASSIGNED' | 'PENDING' | 'CANCELLED' = 'COMPLETED';
    if (r > 0.6 && r <= 0.75) status = 'IN_PROGRESS';
    else if (r > 0.75 && r <= 0.9) status = 'ASSIGNED';
    else if (r > 0.9 && r <= 0.95) status = 'PENDING';
    else if (r > 0.95) status = 'CANCELLED';

    const req = await prisma.request.create({
      data: {
        companyId,
        clientId: client.id,
        type,
        note: pick(REQUEST_NOTES[type] ?? ['Service request'], rng),
        status,
        createdAt,
      },
    });
    await prisma.requestHistory.create({
      data: { requestId: req.id, event: 'CREATED', meta: { by: 'seed' }, createdAt },
    });

    if (status !== 'PENDING' && status !== 'CANCELLED' && employees.length > 0) {
      const emp = pick(employees, rng);
      const plannedStart = new Date(createdAt.getTime() + 60 * 60 * 1000);
      const plannedEnd = new Date(plannedStart.getTime() + 2 * 60 * 60 * 1000);
      const actualStart = status !== 'ASSIGNED' ? new Date(plannedStart.getTime() + rand(-15, 30, rng) * 60 * 1000) : null;
      const actualEnd = status === 'COMPLETED' ? new Date(actualStart!.getTime() + rand(30, 180, rng) * 60 * 1000) : null;
      await prisma.assignment.create({
        data: {
          requestId: req.id,
          employeeId: emp.userId,
          plannedStart,
          plannedEnd,
          actualStart,
          actualEnd,
          assignedByUserId: adminId,
          createdAt: plannedStart,
        },
      });
      assignmentCount++;
      await prisma.requestHistory.create({
        data: { requestId: req.id, event: 'ASSIGNED', meta: { employeeId: emp.userId }, createdAt: plannedStart },
      });
      if (status === 'COMPLETED') {
        const rr = rng();
        const stars = rr < 0.7 ? rand(4, 5, rng) : rr < 0.9 ? 3 : 2;
        await prisma.rating.create({
          data: {
            requestId: req.id,
            clientId: client.id,
            stars,
            note: stars >= 4 ? 'Great service' : stars === 3 ? 'OK' : 'Could be better',
            createdAt: actualEnd!,
          },
        });
        ratingCount++;
        await prisma.requestHistory.create({
          data: { requestId: req.id, event: 'COMPLETED', createdAt: actualEnd! },
        });
        if (rng() > 0.6 && inventory.length > 0) {
          const item = pick(inventory, rng);
          const qty = rand(1, 3, rng);
          await prisma.requestCustody.create({
            data: { requestId: req.id, inventoryItemId: item.id, qty, unitPrice: item.unitPrice, total: qty * item.unitPrice },
          });
        }
      }
    }
  }
  console.log(`  ✓ Requests: ${reqCount} (assignments=${assignmentCount}, ratings=${ratingCount})`);

  // ---- ATTENDANCE (last 60 days) -----------------------------------
  let attCount = 0;
  for (const emp of employees) {
    for (let d = 0; d < 60; d++) {
      const date = new Date(NOW.getTime() - d * DAY_MS);
      const wd = date.getDay();
      if (wd === 5 || wd === 6) continue;
      if (rng() > 0.95) continue;
      const ci = new Date(date); ci.setHours(rand(8, 9, rng), rand(0, 59, rng), 0, 0);
      const co = new Date(date); co.setHours(rand(16, 18, rng), rand(0, 59, rng), 0, 0);
      await prisma.attendance.create({
        data: { employeeId: emp.userId, type: 'CHECK_IN', requestedAt: ci, status: 'APPROVED', decidedByUserId: adminId, decidedAt: ci },
      });
      await prisma.attendance.create({
        data: { employeeId: emp.userId, type: 'CHECK_OUT', requestedAt: co, status: 'APPROVED', decidedByUserId: adminId, decidedAt: co },
      });
      attCount += 2;
    }
  }
  console.log(`  ✓ Attendance: ${attCount}`);

  // ---- HR REQUESTS -------------------------------------------------
  let hrCount = 0;
  for (const emp of employees.slice(0, Math.min(employees.length, 3))) {
    const offDate = daysAgo(rand(15, 60, rng), 0, 0);
    await prisma.offDayAttendanceRequest.create({
      data: {
        companyId, employeeId: emp.userId, date: offDate,
        reason: 'Personal errand', status: 'APPROVED',
        decidedByUserId: adminId, decidedAt: new Date(offDate.getTime() - DAY_MS),
        createdAt: new Date(offDate.getTime() - 2 * DAY_MS),
      },
    });
    hrCount++;
    const otDate = daysAgo(rand(5, 40, rng), 0, 0);
    const otStart = new Date(otDate); otStart.setHours(17, 0, 0, 0);
    const otEnd = new Date(otDate); otEnd.setHours(20, 0, 0, 0);
    await prisma.overtimeRequest.create({
      data: {
        companyId, employeeId: emp.userId, date: otDate, startAt: otStart, endAt: otEnd,
        reason: 'Urgent client', status: rng() > 0.5 ? 'APPROVED' : 'PENDING',
        decidedByUserId: adminId, decidedAt: new Date(otDate.getTime() - DAY_MS),
        createdAt: new Date(otDate.getTime() - 2 * DAY_MS),
      },
    });
    hrCount++;
    const ls = daysAgo(rand(20, 70, rng), 0, 0);
    const le = new Date(ls.getTime() + 2 * DAY_MS);
    await prisma.leaveRequest.create({
      data: {
        companyId, employeeId: emp.userId, fromDate: ls, toDate: le, reason: 'Family event',
        status: 'APPROVED', decidedByUserId: adminId, decidedAt: new Date(ls.getTime() - 3 * DAY_MS),
        createdAt: new Date(ls.getTime() - 5 * DAY_MS),
      },
    });
    hrCount++;
    await prisma.salaryAdvance.create({
      data: {
        companyId, employeeId: emp.userId,
        amount: rand(500, 2000, rng), reason: 'Family expense',
        appliedYear: NOW.getFullYear(), appliedMonth: NOW.getMonth() + 1,
        status: 'APPROVED', decidedByUserId: adminId, decidedAt: daysAgo(rand(5, 20, rng)),
        createdAt: daysAgo(rand(20, 25, rng)),
      },
    });
    hrCount++;
  }
  console.log(`  ✓ HR requests: ${hrCount}`);

  // ---- TASKS -------------------------------------------------------
  const taskCount = Math.floor(10 * scale);
  for (let i = 0; i < taskCount; i++) {
    if (employees.length === 0) break;
    const ageDays = rand(0, 89, rng);
    const emp = pick(employees, rng);
    const client = pick(clients, rng);
    const status = rng() > 0.4 ? 'COMPLETED' : rng() > 0.5 ? 'IN_PROGRESS' : 'PENDING';
    const ps = daysAgo(ageDays, rand(9, 12, rng));
    const pe = new Date(ps.getTime() + 3 * 60 * 60 * 1000);
    await prisma.task.create({
      data: {
        companyId,
        title: pick(['Follow up with client','Inventory restock','Site visit','Equipment check'], rng),
        description: 'Seeded task',
        status,
        priority: pick(['LOW','MEDIUM','HIGH'], rng),
        type: pick(['MAINTENANCE','INSPECTION','REPAIR','INSTALL'], rng),
        clientId: client.id,
        assigneeId: emp.userId,
        createdById: adminId,
        plannedStart: ps,
        plannedEnd: pe,
        actualStart: status !== 'PENDING' ? ps : null,
        actualEnd: status === 'COMPLETED' ? new Date(ps.getTime() + 2 * 60 * 60 * 1000) : null,
        createdAt: ps,
      },
    });
  }
  console.log(`  ✓ Tasks: ${taskCount}`);

  // ---- SUPPLY OPERATIONS -------------------------------------------
  const opCount = Math.floor(7 * scale);
  for (let i = 0; i < opCount; i++) {
    if (employees.length === 0 || inventory.length === 0) break;
    const ageDays = rand(0, 89, rng);
    const emp = pick(employees, rng);
    const client = pick(clients, rng);
    const items: { itemId: string; qty: number; unitPrice: number }[] = [];
    let total = 0;
    for (let j = 0; j < rand(1, 3, rng); j++) {
      const item = pick(inventory, rng);
      const qty = rand(1, 4, rng);
      items.push({ itemId: item.id, qty, unitPrice: item.unitPrice });
      total += qty * item.unitPrice;
    }
    const op = await prisma.supplyOperation.create({
      data: {
        companyId, employeeId: emp.userId, clientId: client.id,
        needsInstall: rng() > 0.5,
        invoiceAmount: total,
        isDeferred: rng() > 0.7,
        paidAt: rng() > 0.3 ? daysAgo(ageDays - 1) : null,
        note: 'Supply operation',
        createdById: adminId,
        createdAt: daysAgo(ageDays),
      },
    });
    for (const it of items) {
      await prisma.supplyOperationItem.create({
        data: { operationId: op.id, inventoryItemId: it.itemId, qty: it.qty, unitPrice: it.unitPrice },
      });
    }
  }
  console.log(`  ✓ Supply operations: ${opCount}`);

  // ---- TREASURY ----------------------------------------------------
  const trCount = Math.floor(30 * scale);
  for (let i = 0; i < trCount; i++) {
    const ageDays = rand(0, 89, rng);
    const isIncome = rng() > 0.4;
    await prisma.treasuryEntry.create({
      data: {
        companyId,
        kind: isIncome ? 'INCOME' : 'EXPENSE',
        amount: isIncome ? rand(500, 5000, rng) : rand(100, 2500, rng),
        reason: `${SEED_TAG} ${isIncome ? 'Service payment' : pick(['Fuel','Tools','Office supplies','Salary advance','Maintenance'], rng)}`,
        createdByUserId: adminId,
        createdAt: daysAgo(ageDays, rand(9, 17, rng)),
      },
    });
  }
  console.log(`  ✓ Treasury: ${trCount}`);

  // ---- LOCATION PINGS (last 7 days) --------------------------------
  let pingCount = 0;
  for (const emp of employees) {
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 6; h++) {
        const at = new Date(NOW.getTime() - d * DAY_MS - h * 60 * 60 * 1000);
        await prisma.locationPing.create({
          data: {
            employeeId: emp.userId,
            lat: BRANCH_LAT + (rng() - 0.5) * 0.05,
            lng: BRANCH_LNG + (rng() - 0.5) * 0.05,
            createdAt: at,
          },
        });
        pingCount++;
      }
    }
  }
  console.log(`  ✓ Location pings: ${pingCount}`);

  // ---- SUBSCRIPTION REQUEST (only for PENDING_ACTIVATION) ----------
  if (spec.status === 'PENDING_ACTIVATION') {
    await prisma.subscriptionRequest.create({
      data: {
        companyId,
        plan: 'BASIC',
        billingCycle: 'MONTHLY',
        contactName: spec.adminName,
        contactEmail: spec.adminEmail,
        contactPhone: '+201000111222',
        note: 'Want to upgrade to BASIC plan',
        status: 'PENDING',
        createdAt: daysAgo(2),
      },
    });
    console.log('  ✓ Subscription request (PENDING)');
  }
}

async function main(): Promise<void> {
  const hash = await argon2.hash(PASSWORD, { type: argon2.argon2id });

  console.log('🌱 Seeding multi-tenant SaaS demo data...');

  for (let i = 0; i < TENANTS.length; i++) {
    const spec = TENANTS[i];
    const { adminId, companyId } = await ensureTenant(spec, hash);
    await seedTenant(spec, adminId, companyId, hash, i);
  }

  console.log('\n✅ Done. Login any admin with password: ' + PASSWORD);
  console.log('\nAdmin accounts:');
  for (const t of TENANTS) {
    console.log(`  ${t.adminEmail.padEnd(34)} → ${t.companyName} (${t.plan}/${t.status})`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
