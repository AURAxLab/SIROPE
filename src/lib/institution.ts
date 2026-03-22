/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Configuración Institucional — Singleton con caché
 * Gestiona la configuración de la institución que despliega SIROPE.
 * Usa un patrón singleton con caché en memoria para evitar consultas
 * repetidas a la base de datos.
 */

import prisma from './prisma';
import type { InstitutionConfig } from '@/generated/prisma/client';

// ============================================================
// Caché en memoria
// ============================================================

let cachedConfig: InstitutionConfig | null = null;
let cacheTimestamp = 0;

/** Tiempo de vida del caché en milisegundos (5 minutos). */
const CACHE_TTL_MS = 5 * 60 * 1000;

// ============================================================
// Funciones
// ============================================================

/**
 * Obtiene la configuración institucional actual.
 * Usa caché en memoria para evitar consultas innecesarias.
 * Si no existe configuración, crea una con valores por defecto.
 *
 * @param forceRefresh - Si true, ignora el caché y consulta la BD
 * @returns La configuración institucional
 */
export async function getInstitutionConfig(
  forceRefresh = false
): Promise<InstitutionConfig> {
  const now = Date.now();
  const cacheIsValid = cachedConfig && (now - cacheTimestamp) < CACHE_TTL_MS;

  if (cacheIsValid && !forceRefresh) {
    return cachedConfig!;
  }

  // Buscar o crear la configuración singleton
  let config = await prisma.institutionConfig.findUnique({
    where: { id: 'singleton' },
  });

  if (!config) {
    config = await prisma.institutionConfig.create({
      data: { id: 'singleton' },
    });
  }

  // Actualizar caché
  cachedConfig = config;
  cacheTimestamp = now;

  return config;
}

/**
 * Actualiza la configuración institucional.
 * Invalida el caché después de la actualización.
 *
 * @param data - Campos a actualizar
 * @returns La configuración actualizada
 */
export async function updateInstitutionConfig(
  data: Partial<Omit<InstitutionConfig, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<InstitutionConfig> {
  const config = await prisma.institutionConfig.upsert({
    where: { id: 'singleton' },
    update: data,
    create: { id: 'singleton', ...data },
  });

  // Invalidar caché
  cachedConfig = config;
  cacheTimestamp = Date.now();

  return config;
}

/**
 * Verifica si el setup inicial ya fue completado.
 * Usado por el middleware para redirigir al wizard si es necesario.
 *
 * @returns true si el setup fue completado
 */
export async function isSetupComplete(): Promise<boolean> {
  const config = await getInstitutionConfig();
  return config.setupComplete;
}

/**
 * Invalida el caché de configuración institucional.
 * Útil cuando se sabe que la configuración cambió externamente.
 */
export function invalidateInstitutionCache(): void {
  cachedConfig = null;
  cacheTimestamp = 0;
}
