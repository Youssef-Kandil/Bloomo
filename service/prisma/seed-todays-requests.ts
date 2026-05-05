/**
 * Seeds open support requests for today and yesterday across every demo
 * company so the overview screen has data to show. Idempotent — re-runs
 * delete previous `[OVERVIEW-SEED]` entries before recreating them.
 *
 *   npx tsx prisma/seed-todays-requests.ts
 */
import { PrismaClient, type RequestType } from '@prisma/client';

const prisma = new PrismaClient();
const TAG = '[OVERVIEW-SEED]';

const TYPES: RequestType[] = [
  'MAINTENANCE',
  'INSPECTION',
  'REPAIR',
  'SUPPLY',
  'INSTALL',
  'SUPPLY_INSTALL',
];

const NOTES: Record<RequestType, string[]> = {
  MAINTENANCE: ['التكييف مش بيبرّد', 'صيانة دورية', 'صوت في الموتور', 'الفلتر يحتاج تنظيف'],
  INSPECTION: ['كشف سنوي', 'فحص قبل الاستلام'],
  REPAIR: ['تسريب فريون', 'عطل كهربائي', 'كابل مقطوع'],
  SUPPLY: ['قطع غيار', 'تعبئة فريون'],
  INSTALL: ['تركيب وحدة جديدة', 'تركيب حامل'],
  SUPPLY_INSTALL: ['توريد + تركيب كامل'],
};

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
function pick<T>(arr: T[], r: () => number): T {
  return arr[Math.floor(r() * arr.length)];
}
function rand(min: number, max: number, r: () => number): number {
  return Math.floor(r() * (max - min + 1)) + min;
}

async function main(): Promise<void> {
  const companies = await prisma.company.findMany({
    include: { clients: { take: 6 } },
  });

  let total = 0;
  for (let i = 0; i < companies.length; i++) {
    const c = companies[i];
    if (c.clients.length === 0) continue;

    // Clean previous overview seed entries
    await prisma.request.deleteMany({
      where: { companyId: c.id, note: { startsWith: TAG } },
    });

    const r = rng(7919 + i * 113);
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const todayCount = rand(2, 5, r);
    const yesterdayCount = rand(2, 5, r);

    for (let n = 0; n < todayCount; n++) {
      const type = pick(TYPES, r);
      const client = pick(c.clients, r);
      const createdAt = new Date(today);
      createdAt.setHours(rand(8, 16, r), rand(0, 59, r), 0, 0);
      // Spread of statuses among open: PENDING, ASSIGNED, IN_PROGRESS
      const statusRoll = r();
      const status =
        statusRoll < 0.5 ? 'PENDING' : statusRoll < 0.8 ? 'ASSIGNED' : 'IN_PROGRESS';
      const req = await prisma.request.create({
        data: {
          companyId: c.id,
          clientId: client.id,
          type,
          note: `${TAG} ${pick(NOTES[type], r)}`,
          status,
          createdAt,
        },
      });
      await prisma.requestHistory.create({
        data: { requestId: req.id, event: 'CREATED', meta: { by: 'overview-seed' }, createdAt },
      });
      total++;
    }

    for (let n = 0; n < yesterdayCount; n++) {
      const type = pick(TYPES, r);
      const client = pick(c.clients, r);
      const createdAt = new Date(yesterday);
      createdAt.setHours(rand(9, 18, r), rand(0, 59, r), 0, 0);
      const statusRoll = r();
      const status =
        statusRoll < 0.4 ? 'PENDING' : statusRoll < 0.75 ? 'ASSIGNED' : 'IN_PROGRESS';
      const req = await prisma.request.create({
        data: {
          companyId: c.id,
          clientId: client.id,
          type,
          note: `${TAG} ${pick(NOTES[type], r)}`,
          status,
          createdAt,
        },
      });
      await prisma.requestHistory.create({
        data: { requestId: req.id, event: 'CREATED', meta: { by: 'overview-seed' }, createdAt },
      });
      total++;
    }

    console.log(`  ${c.name}: today=${todayCount}, yesterday=${yesterdayCount}`);
  }

  console.log(`\n✅ Seeded ${total} open requests across ${companies.length} companies.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
