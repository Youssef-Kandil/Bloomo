/**
 * One-shot script to bootstrap a system-owner account.
 * Reads OWNER_EMAIL / OWNER_PASSWORD / OWNER_NAME env vars (with safe defaults
 * for local dev). Idempotent — re-runs safely.
 *
 *   npx tsx prisma/seed-owner.ts
 */
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.OWNER_EMAIL ?? 'owner@bloomo.local';
  const password = process.env.OWNER_PASSWORD ?? 'OwnerPass123!';
  const name = process.env.OWNER_NAME ?? 'System Owner';

  const hash = await argon2.hash(password, { type: argon2.argon2id });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { email },
      data: {
        role: 'OWNER',
        passwordHash: hash,
        name,
        active: true,
        bannedAt: null,
        bannedReason: null,
        companyId: null,
      },
    });
    // eslint-disable-next-line no-console
    console.log(`✓ Existing user "${email}" promoted/refreshed as OWNER.`);
  } else {
    await prisma.user.create({
      data: {
        email,
        name,
        role: 'OWNER',
        passwordHash: hash,
      },
    });
    // eslint-disable-next-line no-console
    console.log(`✓ Created OWNER user "${email}".`);
  }

  // eslint-disable-next-line no-console
  console.log(`Login with: ${email} / ${password}`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
