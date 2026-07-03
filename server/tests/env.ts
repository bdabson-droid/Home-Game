// Runs in the test process before any modules (incl. Prisma) are imported.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test.db';
process.env.JWT_SECRET = 'test-secret';
