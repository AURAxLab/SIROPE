/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Acciones de Servidor — Timeslots
 * Gestiona horarios disponibles para estudios de investigación.
 * IP e IE pueden crear, editar e importar timeslots vía Excel.
 */

'use server';

import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { requirePermission, ACTIONS } from '@/lib/permissions';
import { timeslotSchema, timeslotImportRowSchema } from '@/lib/validations';
import { logAuditEvent } from '@/lib/audit';
import type { Role } from '@/lib/validations';
import { sendCancellationConfirmation } from '@/lib/email';

// ============================================================
// Tipos
// ============================================================

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================
// Lectura
// ============================================================

/**
 * Obtiene los timeslots de un estudio.
 * IP/IE ven todos; Estudiantes solo ven AVAILABLE con cupos.
 *
 * @param studyId - ID del estudio
 * @returns Lista de timeslots con conteo de participantes
 */
export async function getTimeslots(studyId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  let statusFilter: Record<string, unknown> = {};

  // Estudiantes solo ven timeslots disponibles
  if (role === 'ESTUDIANTE') {
    statusFilter = { status: 'AVAILABLE' };
  }

  const timeslots = await prisma.timeslot.findMany({
    where: {
      studyId,
      ...statusFilter,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: {
        select: {
          participations: {
            where: { status: { in: ['SIGNED_UP', 'REMINDED'] } },
          },
        },
      },
    },
    orderBy: { startTime: 'asc' },
  });

  return { success: true, data: timeslots };
}

/**
 * Obtiene un timeslot con sus participantes inscritos.
 * Solo IP/IE del estudio pueden ver la lista de inscritos.
 *
 * @param timeslotId - ID del timeslot
 * @returns Timeslot con participantes
 */
export async function getTimeslotWithParticipants(
  timeslotId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.VIEW_ENROLLED_PARTICIPANTS);

  const timeslot = await prisma.timeslot.findUnique({
    where: { id: timeslotId },
    include: {
      study: {
        select: {
          id: true,
          title: true,
          principalInvestigatorId: true,
        },
      },
      participations: {
        include: {
          student: {
            select: { id: true, name: true, email: true, studentId: true },
          },
        },
        orderBy: { signedUpAt: 'asc' },
      },
      waitlistEntries: {
        include: {
          student: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { position: 'asc' },
      },
    },
  });

  if (!timeslot) {
    return { success: false, error: 'Timeslot no encontrado' };
  }

  return { success: true, data: timeslot };
}

// ============================================================
// Escritura
// ============================================================

/**
 * Crea un nuevo timeslot para un estudio.
 * Solo IP (dueño) e IE (colaborador) pueden crear.
 *
 * @param formData - Datos del timeslot
 * @returns El timeslot creado
 */
export async function createTimeslot(formData: {
  studyId: string;
  startTime: string;
  endTime: string;
  maxParticipants: number;
  location?: string;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.CREATE_TIMESLOT);

  // Validar datos
  const parsed = timeslotSchema.safeParse(formData);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || 'Datos inválidos';
    return { success: false, error: firstError };
  }

  // Verificar que el estudio existe y está activo
  const study = await prisma.study.findUnique({
    where: { id: parsed.data.studyId },
    include: {
      collaborators: { select: { userId: true } },
    },
  });

  if (!study) {
    return { success: false, error: 'Estudio no encontrado' };
  }

  if (study.status !== 'ACTIVE') {
    return { success: false, error: 'Solo se pueden agregar timeslots a estudios activos' };
  }

  // Verificar que el usuario es IP del estudio o IE colaborador
  const isPI = study.principalInvestigatorId === session.user.id;
  const isCollaborator = study.collaborators.some(
    (c) => c.userId === session.user.id
  );

  if (!isPI && !isCollaborator) {
    return { success: false, error: 'No tiene acceso a este estudio' };
  }

  const timeslot = await prisma.timeslot.create({
    data: {
      studyId: parsed.data.studyId,
      createdById: session.user.id,
      startTime: new Date(parsed.data.startTime),
      endTime: new Date(parsed.data.endTime),
      maxParticipants: parsed.data.maxParticipants,
      location: parsed.data.location || study.location,
      status: 'AVAILABLE',
    },
  });

  await logAuditEvent({
    userId: session.user.id,
    action: 'CREATE_TIMESLOT',
    entityType: 'Timeslot',
    entityId: timeslot.id,
    newState: {
      studyId: timeslot.studyId,
      startTime: timeslot.startTime.toISOString(),
      maxParticipants: timeslot.maxParticipants,
    },
  });

  return { success: true, data: timeslot };
}

/**
 * Actualiza un timeslot existente.
 * Solo se puede editar si no tiene participantes inscritos.
 *
 * @param timeslotId - ID del timeslot
 * @param formData - Campos a actualizar
 * @returns El timeslot actualizado
 */
export async function updateTimeslot(
  timeslotId: string,
  formData: {
    startTime?: string;
    endTime?: string;
    maxParticipants?: number;
    location?: string;
  }
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.EDIT_TIMESLOT);

  const timeslot = await prisma.timeslot.findUnique({
    where: { id: timeslotId },
    include: {
      study: {
        include: { collaborators: { select: { userId: true } } },
      },
      _count: {
        select: {
          participations: {
            where: { status: { in: ['SIGNED_UP', 'REMINDED'] } },
          },
        },
      },
    },
  });

  if (!timeslot) {
    return { success: false, error: 'Timeslot no encontrado' };
  }

  // Verificar acceso al estudio
  const isPI = timeslot.study.principalInvestigatorId === session.user.id;
  const isCollaborator = timeslot.study.collaborators.some(
    (c) => c.userId === session.user.id
  );
  if (!isPI && !isCollaborator) {
    return { success: false, error: 'No tiene acceso a este timeslot' };
  }

  // No permitir reducir max si ya hay inscritos que excederían
  if (
    formData.maxParticipants !== undefined &&
    formData.maxParticipants < timeslot._count.participations
  ) {
    return {
      success: false,
      error: `No se puede reducir a ${formData.maxParticipants}: ya hay ${timeslot._count.participations} inscritos`,
    };
  }

  const updateData: Record<string, unknown> = {};
  if (formData.startTime) updateData.startTime = new Date(formData.startTime);
  if (formData.endTime) updateData.endTime = new Date(formData.endTime);
  if (formData.maxParticipants !== undefined) updateData.maxParticipants = formData.maxParticipants;
  if (formData.location !== undefined) updateData.location = formData.location;

  const updated = await prisma.timeslot.update({
    where: { id: timeslotId },
    data: updateData,
  });

  await logAuditEvent({
    userId: session.user.id,
    action: 'UPDATE_TIMESLOT',
    entityType: 'Timeslot',
    entityId: timeslotId,
    previousState: {
      startTime: timeslot.startTime.toISOString(),
      maxParticipants: timeslot.maxParticipants,
    },
    newState: {
      startTime: updated.startTime.toISOString(),
      maxParticipants: updated.maxParticipants,
    },
  });

  return { success: true, data: updated };
}

/**
 * Cancela un timeslot.
 * Notifica a todos los participantes inscritos.
 *
 * @param timeslotId - ID del timeslot a cancelar
 */
export async function cancelTimeslot(timeslotId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.EDIT_TIMESLOT);

  const timeslot = await prisma.timeslot.findUnique({
    where: { id: timeslotId },
    include: {
      study: {
        include: { collaborators: { select: { userId: true } } },
      },
    },
  });

  if (!timeslot) {
    return { success: false, error: 'Timeslot no encontrado' };
  }

  // Verificar acceso
  const isPI = timeslot.study.principalInvestigatorId === session.user.id;
  const isCollaborator = timeslot.study.collaborators.some(
    (c) => c.userId === session.user.id
  );
  if (!isPI && !isCollaborator) {
    return { success: false, error: 'No tiene acceso a este timeslot' };
  }

  if (timeslot.status === 'CANCELLED') {
    return { success: false, error: 'El timeslot ya está cancelado' };
  }

  // Obtener participaciones activas para notificar
  const activeParticipations = await prisma.participation.findMany({
    where: {
      timeslotId,
      status: { in: ['SIGNED_UP', 'REMINDED'] },
    },
    include: {
      student: { select: { name: true, email: true } },
    },
  });

  // Cancelar participaciones activas
  await prisma.participation.updateMany({
    where: {
      timeslotId,
      status: { in: ['SIGNED_UP', 'REMINDED'] },
    },
    data: {
      status: 'CANCELLED',
      cancellationReason: 'Timeslot cancelado por el investigador',
    },
  });

  // Notificar a los estudiantes de la cancelación sin penalización
  for (const part of activeParticipations) {
    if (part.student.email) {
      await sendCancellationConfirmation(
        part.student.email,
        part.student.name || 'Estudiante',
        timeslot.study.title,
        false // No penalty
      );
    }
  }

  // Cancelar waitlist
  await prisma.waitlistEntry.updateMany({
    where: { timeslotId, status: 'WAITING' },
    data: { status: 'EXPIRED' },
  });

  const updated = await prisma.timeslot.update({
    where: { id: timeslotId },
    data: { status: 'CANCELLED' },
  });

  await logAuditEvent({
    userId: session.user.id,
    action: 'CANCEL_TIMESLOT',
    entityType: 'Timeslot',
    entityId: timeslotId,
    previousState: { status: timeslot.status },
    newState: { status: 'CANCELLED' },
  });

  return { success: true, data: updated };
}

/**
 * Importa timeslots masivamente desde datos procesados de Excel.
 * Cada fila contiene: fecha, horaInicio, horaFin, maxParticipantes, ubicación.
 *
 * @param studyId - ID del estudio
 * @param rows - Filas parseadas del Excel
 * @returns Resumen de importación
 */
export async function importTimeslots(
  studyId: string,
  rows: Array<{
    fecha: string;
    horaInicio: string;
    horaFin: string;
    maxParticipantes: number;
    ubicacion?: string;
  }>
): Promise<ActionResult<{ created: number; errors: string[] }>> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.IMPORT_TIMESLOTS);

  // Verificar acceso al estudio
  const study = await prisma.study.findUnique({
    where: { id: studyId },
    include: { collaborators: { select: { userId: true } } },
  });

  if (!study) {
    return { success: false, error: 'Estudio no encontrado' };
  }

  if (study.status !== 'ACTIVE') {
    return { success: false, error: 'Solo se pueden importar timeslots a estudios activos' };
  }

  const isPI = study.principalInvestigatorId === session.user.id;
  const isCollaborator = study.collaborators.some(
    (c) => c.userId === session.user.id
  );
  if (!isPI && !isCollaborator) {
    return { success: false, error: 'No tiene acceso a este estudio' };
  }

  const errors: string[] = [];
  let created = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 1;
    const row = rows[i];

    // Validar fila
    const parsed = timeslotImportRowSchema.safeParse(row);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Datos inválidos';
      errors.push(`Fila ${rowNum}: ${msg}`);
      continue;
    }

    // Construir fechas
    try {
      const startTime = new Date(`${parsed.data.fecha}T${parsed.data.horaInicio}:00`);
      const endTime = new Date(`${parsed.data.fecha}T${parsed.data.horaFin}:00`);

      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        errors.push(`Fila ${rowNum}: Fecha/hora inválida`);
        continue;
      }

      if (endTime <= startTime) {
        errors.push(`Fila ${rowNum}: La hora de fin debe ser posterior a la de inicio`);
        continue;
      }

      await prisma.timeslot.create({
        data: {
          studyId,
          createdById: session.user.id,
          startTime,
          endTime,
          maxParticipants: parsed.data.maxParticipantes,
          location: parsed.data.ubicacion || study.location,
          status: 'AVAILABLE',
        },
      });

      created++;
    } catch {
      errors.push(`Fila ${rowNum}: Error al crear timeslot`);
    }
  }

  await logAuditEvent({
    userId: session.user.id,
    action: 'IMPORT_TIMESLOTS',
    entityType: 'Study',
    entityId: studyId,
    newState: { created, errors: errors.length },
  });

  return {
    success: true,
    data: { created, errors },
  };
}
