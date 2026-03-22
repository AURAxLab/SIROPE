/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Auditoría — Logger de Eventos
 * Registra cada mutación relevante del sistema para trazabilidad completa.
 * Almacena estados previos y nuevos, IP del usuario, y timestamp.
 */

import prisma from './prisma';

// ============================================================
// Tipos
// ============================================================

/** Parámetros necesarios para registrar un evento de auditoría. */
interface AuditLogParams {
  /** ID del usuario que realizó la acción. */
  userId: string;
  /** Nombre de la acción realizada. Ej: "CREATE_STUDY", "APPROVE_STUDY". */
  action: string;
  /** Tipo de entidad afectada. Ej: "Study", "Participation". */
  entityType: string;
  /** ID de la entidad afectada. */
  entityId: string;
  /** Estado previo de la entidad (objeto serializable a JSON). */
  previousState?: Record<string, unknown> | null;
  /** Estado nuevo de la entidad (objeto serializable a JSON). */
  newState?: Record<string, unknown> | null;
  /** Dirección IP del cliente. */
  ipAddress?: string;
}

// ============================================================
// Funciones
// ============================================================

/**
 * Registra un evento de auditoría en la base de datos.
 * Cada mutación relevante debe llamar esta función para garantizar
 * trazabilidad completa del sistema.
 *
 * @param params - Datos del evento a registrar
 * @returns El registro de auditoría creado
 *
 * @example
 * ```typescript
 * await logAuditEvent({
 *   userId: session.user.id,
 *   action: 'CREATE_STUDY',
 *   entityType: 'Study',
 *   entityId: newStudy.id,
 *   newState: { title: newStudy.title, status: 'DRAFT' },
 *   ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
 * });
 * ```
 */
export async function logAuditEvent(params: AuditLogParams) {
  const {
    userId,
    action,
    entityType,
    entityId,
    previousState,
    newState,
    ipAddress = 'unknown',
  } = params;

  const auditLog = await prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      previousState: previousState ? JSON.stringify(previousState) : null,
      newState: newState ? JSON.stringify(newState) : null,
      ipAddress,
    },
  });

  return auditLog;
}

/**
 * Obtiene los registros de auditoría con filtros opcionales.
 * Usado por el panel de administración para revisar actividad del sistema.
 *
 * @param filters - Filtros opcionales para la consulta
 * @param filters.userId - Filtrar por usuario específico
 * @param filters.action - Filtrar por tipo de acción
 * @param filters.entityType - Filtrar por tipo de entidad
 * @param filters.entityId - Filtrar por entidad específica
 * @param filters.fromDate - Fecha de inicio del rango
 * @param filters.toDate - Fecha de fin del rango
 * @param filters.page - Número de página (default: 1)
 * @param filters.pageSize - Registros por página (default: 50)
 * @returns Objeto con los registros y el total para paginación
 */
export async function getAuditLogs(filters: {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  pageSize?: number;
}) {
  const {
    userId,
    action,
    entityType,
    entityId,
    fromDate,
    toDate,
    page = 1,
    pageSize = 50,
  } = filters;

  // Construir condiciones de filtrado
  const where: Record<string, unknown> = {};

  if (userId) {
    where.userId = userId;
  }
  if (action) {
    where.action = action;
  }
  if (entityType) {
    where.entityType = entityType;
  }
  if (entityId) {
    where.entityId = entityId;
  }
  if (fromDate || toDate) {
    where.timestamp = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {}),
    };
  }

  // Ejecutar consulta con paginación
  const skip = (page - 1) * pageSize;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { timestamp: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
