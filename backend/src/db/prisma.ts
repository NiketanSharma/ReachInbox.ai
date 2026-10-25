import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export async function connectDatabase(): Promise<boolean> {
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL database connected successfully via Prisma');
    return true;
  } catch (error) {
    console.error('⚠️ Database connection warning:', (error as Error).message);
    console.log('💡 Ensure PostgreSQL is running (e.g. docker compose up -d postgres) or verify DATABASE_URL in .env');
    return false;
  }
}
