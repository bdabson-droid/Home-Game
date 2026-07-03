import { prisma } from '../src/db';
import { generateJoinCode } from '../src/utils/code';

async function main() {
  const host = await prisma.user.upsert({
    where: { phone: '+15550000001' },
    update: {},
    create: { phone: '+15550000001', name: 'Demo Host' },
  });

  await prisma.subscription.upsert({
    where: { userId: host.id },
    update: { status: 'active', currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000) },
    create: {
      userId: host.id,
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    },
  });

  const existing = await prisma.homeGame.findFirst({ where: { hostId: host.id } });
  if (!existing) {
    await prisma.homeGame.create({
      data: {
        name: 'Friday Night Hold’em',
        description: 'Weekly $1/$2 NLHE at the clubhouse.',
        location: 'The Clubhouse',
        defaultBuyIn: 200,
        joinCode: generateJoinCode(6),
        hostId: host.id,
        memberships: { create: { userId: host.id, role: 'host' } },
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete. Demo host phone: +15550000001');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
