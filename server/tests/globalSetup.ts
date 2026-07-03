import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export default async function globalSetup(): Promise<void> {
  const dbFile = path.join(__dirname, '..', 'prisma', 'test.db');
  if (fs.existsSync(dbFile)) {
    fs.unlinkSync(dbFile);
  }
  execSync('npx prisma db push --skip-generate --force-reset', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
  });
}
