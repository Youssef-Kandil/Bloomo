/**
 * Seeds a demo company with one admin, one manager, two employees, two clients,
 * tools, inventory items, and a sample request. Idempotent — re-running upserts.
 *
 * Run: npm run seed
 */
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const passwordHash = await argon2.hash('Password123!', { type: argon2.argon2id });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@bloomo.local' },
    update: {},
    create: {
      email: 'admin@bloomo.local',
      passwordHash,
      name: 'Admin Demo',
      role: 'ADMIN',
    },
  });

  const company = await prisma.company.upsert({
    where: { ownerAdminId: admin.id },
    update: { name: 'Bloomo Demo Co.' },
    create: { name: 'Bloomo Demo Co.', ownerAdminId: admin.id },
  });

  await prisma.user.update({ where: { id: admin.id }, data: { companyId: company.id } });

  const branch = await prisma.branch.upsert({
    where: { id: `${company.id}-main` },
    update: {},
    create: {
      id: `${company.id}-main`,
      companyId: company.id,
      name: 'Main Branch',
      address: 'Cairo, Egypt',
      lat: 30.0444,
      lng: 31.2357,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@bloomo.local' },
    update: {},
    create: {
      email: 'manager@bloomo.local',
      passwordHash,
      name: 'Manager Demo',
      role: 'MANAGER',
      companyId: company.id,
    },
  });

  // Grant manager view+edit on a default set of screens
  const managerScreens = [
    'overview', 'requests', 'clients', 'employees', 'tools', 'inventory',
    'attendance', 'treasury', 'whatsapp', 'tasks', 'settings',
  ];
  for (const screenKey of managerScreens) {
    await prisma.permission.upsert({
      where: { managerId_screenKey: { managerId: manager.id, screenKey } },
      update: { canView: true, canEdit: true },
      create: { managerId: manager.id, screenKey, canView: true, canEdit: true },
    });
  }

  for (const [email, name, lat, lng] of [
    ['emp1@bloomo.local', 'Ahmed Tech', 30.0500, 31.2400],
    ['emp2@bloomo.local', 'Mona Tech', 30.0600, 31.2500],
  ] as const) {
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, passwordHash, name, role: 'EMPLOYEE', companyId: company.id },
    });
    await prisma.employee.upsert({
      where: { id: user.id },
      update: { branchId: branch.id, currentLat: lat, currentLng: lng, lastPingAt: new Date() },
      create: { id: user.id, branchId: branch.id, currentLat: lat, currentLng: lng, lastPingAt: new Date() },
    });
  }

  const client1 = await prisma.client.upsert({
    where: { id: `${company.id}-client1` },
    update: {},
    create: {
      id: `${company.id}-client1`,
      companyId: company.id,
      name: 'Mr. Khaled',
      address: 'Nasr City, Cairo',
      lat: 30.0550,
      lng: 31.2450,
      marketingOptIn: true,
      phones: {
        create: [
          { label: 'مالك', phone: '+201000000001', isWhatsapp: true },
          { label: 'حارس', phone: '+201000000002', isWhatsapp: false },
        ],
      },
    },
  });

  await prisma.request.upsert({
    where: { id: `${company.id}-req1` },
    update: {},
    create: {
      id: `${company.id}-req1`,
      companyId: company.id,
      clientId: client1.id,
      type: 'MAINTENANCE',
      note: 'AC not cooling',
      status: 'PENDING',
    },
  });

  await prisma.tool.upsert({
    where: { companyId_code: { companyId: company.id, code: 'DRILL-01' } },
    update: {},
    create: { companyId: company.id, code: 'DRILL-01', name: 'Cordless Drill', qty: 5 },
  });

  await prisma.inventoryItem.upsert({
    where: { companyId_sku: { companyId: company.id, sku: 'AC-FILTER' } },
    update: {},
    create: { companyId: company.id, sku: 'AC-FILTER', name: 'AC Filter', qty: 50, unitPrice: 75 },
  });

  // eslint-disable-next-line no-console
  console.log('✅ Seed completed:');
  // eslint-disable-next-line no-console
  console.log('   admin@bloomo.local / Password123!');
  // eslint-disable-next-line no-console
  console.log('   manager@bloomo.local / Password123!');
  // eslint-disable-next-line no-console
  console.log('   emp1@bloomo.local / Password123!');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    // eslint-disable-next-line no-console
    console.error('Seed failed:', err);
    await prisma.$disconnect();
    process.exit(1);
  });
