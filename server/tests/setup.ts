import { prisma } from '../src/db';

beforeEach(async () => {
  // Clean all tables before each test for isolation.
  await prisma.sessionSeat.deleteMany();
  await prisma.gameSession.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.homeGame.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
