/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Cliente Prisma — Singleton
 * Garantiza una única instancia del cliente Prisma en desarrollo
 * para evitar agotar las conexiones de base de datos con hot reload.
 * Usa el adaptador better-sqlite3 para Prisma v7.
 */

import { PrismaClient } from '@/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

/**
 * Crea una nueva instancia del cliente Prisma con el adaptador SQLite.
 * El path al archivo .db se toma de DATABASE_URL (sin el prefijo "file:").
 *
 * @returns Nueva instancia de PrismaClient configurada
 */
function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
  const dbPath = dbUrl.replace('file:', '');

  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });

  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** Instancia singleton del cliente Prisma para uso en toda la aplicación. */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
