/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Cliente Prisma — Singleton (PostgreSQL)
 * Garantiza una única instancia del cliente Prisma en desarrollo
 * para evitar agotar las conexiones de base de datos con hot reload.
 * Usa el adaptador pg para PostgreSQL en producción.
 */

import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

/**
 * Crea una nueva instancia del cliente Prisma con el adaptador PostgreSQL.
 * La conexión se toma de DATABASE_URL.
 *
 * @returns Nueva instancia de PrismaClient configurada
 */
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);

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
