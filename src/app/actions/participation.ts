/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Acciones de Servidor — Participación e Inscripción
 * Gestiona la inscripción de estudiantes en timeslots, cancelaciones,
 * lista de espera (waitlist), y marcado de completitud / no-show.
 */

'use server';

import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { requirePermission, ACTIONS } from '@/lib/permissions';
import { notifyWaitlistPromotion } from './notifications';
import { markCompletionSchema, bulkCompletionSchema } from '@/lib/validations';
import { logAuditEvent } from '@/lib/audit';
import type { Role } from '@/lib/validations';

// ============================================================
// Tipos
// ============================================================

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================
// Inscripción del estudiante
// ============================================================

/**
 * Inscribe a un estudiante en un timeslot.
 * Valida: elegibilidad de prescreen, capacidad del timeslot,
 * e inscripciones duplicadas en el mismo estudio.
 *
 * @param timeslotId - ID del timeslot
 * @returns La participación creada
 */
export async function signUpForTimeslot(timeslotId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.SIGN_UP_TIMESLOT);

  // Obtener timeslot con estudio y conteo de participantes
  const timeslot = await prisma.timeslot.findUnique({
    where: { id: timeslotId },
    include: {
      study: {
        include: {
          prescreenQuestions: true,
        },
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

  if (timeslot.status !== 'AVAILABLE') {
    return { success: false, error: 'Este timeslot no está disponible' };
  }

  if (timeslot.study.status !== 'ACTIVE') {
    return { success: false, error: 'El estudio no está activo' };
  }

  // Verificar que no esté ya inscrito en este estudio
  const existingParticipation = await prisma.participation.findFirst({
    where: {
      studentId: session.user.id,
      studyId: timeslot.studyId,
      status: { in: ['SIGNED_UP', 'REMINDED', 'COMPLETED'] },
    },
  });

  if (existingParticipation) {
    return { success: false, error: 'Ya está inscrito o completó este estudio' };
  }

  // Verificar prescreen si hay preguntas
  if (timeslot.study.prescreenQuestions.length > 0) {
    const answers = await prisma.prescreenAnswer.findMany({
      where: {
        studentId: session.user.id,
        question: { studyId: timeslot.studyId },
      },
      include: { question: true },
    });

    if (answers.length === 0) {
      return { success: false, error: 'Debe completar el cuestionario de preselección antes de inscribirse' };
    }

    // Verificar elegibilidad
    const isEligible = answers.every(
      (a) => a.answer === a.question.requiredAnswer
    );
    if (!isEligible) {
      return { success: false, error: 'No cumple con los criterios de elegibilidad del estudio' };
    }
  }

  // Verificar capacidad
  const currentCount = timeslot._count.participations;
  if (currentCount >= timeslot.maxParticipants) {
    return { success: false, error: 'Este timeslot está lleno. Puede unirse a la lista de espera.' };
  }

  // Crear participación
  const participation = await prisma.participation.create({
    data: {
      studentId: session.user.id,
      studyId: timeslot.studyId,
      timeslotId,
      status: 'SIGNED_UP',
    },
  });

  // Actualizar conteo del timeslot
  const newCount = currentCount + 1;
  if (newCount >= timeslot.maxParticipants) {
    await prisma.timeslot.update({
      where: { id: timeslotId },
      data: {
        currentParticipants: newCount,
        status: 'FULL',
      },
    });
  } else {
    await prisma.timeslot.update({
      where: { id: timeslotId },
      data: { currentParticipants: newCount },
    });
  }

  await logAuditEvent({
    userId: session.user.id,
    action: 'SIGN_UP_TIMESLOT',
    entityType: 'Participation',
    entityId: participation.id,
    newState: {
      timeslotId,
      studyId: timeslot.studyId,
      status: 'SIGNED_UP',
    },
  });

  return { success: true, data: participation };
}

/**
 * Cancela la inscripción de un estudiante en un timeslot.
 * Verifica la política de cancelación (configurable).
 *
 * @param participationId - ID de la participación
 * @param reason - Razón de cancelación (opcional)
 */
export async function cancelSignUp(
  participationId: string,
  reason?: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.CANCEL_SIGN_UP);

  const participation = await prisma.participation.findUnique({
    where: { id: participationId },
    include: {
      timeslot: true,
    },
  });

  if (!participation) {
    return { success: false, error: 'Inscripción no encontrada' };
  }

  if (participation.studentId !== session.user.id) {
    return { success: false, error: 'Solo puede cancelar su propia inscripción' };
  }

  if (participation.status !== 'SIGNED_UP' && participation.status !== 'REMINDED') {
    return { success: false, error: `No se puede cancelar una inscripción en estado "${participation.status}"` };
  }

  // Verificar política de cancelación
  const cancellationConfig = await prisma.systemConfig.findUnique({
    where: { key: 'CANCELLATION_HOURS' },
  });
  const cancellationHours = cancellationConfig
    ? parseInt(cancellationConfig.value, 10)
    : 24;

  const timeslotStart = participation.timeslot.startTime;
  const hoursUntilStart =
    (timeslotStart.getTime() - Date.now()) / (1000 * 60 * 60);

  let penalized = false;
  if (hoursUntilStart < cancellationHours) {
    penalized = true;
    // Nota: no-show penalty se aplicaría en la UI como advertencia
  }

  // Cancelar la participación
  await prisma.participation.update({
    where: { id: participationId },
    data: {
      status: 'CANCELLED',
      cancellationReason: reason || (penalized
        ? `Cancelación tardía (< ${cancellationHours}h antes)`
        : 'Cancelado por el estudiante'),
    },
  });

  // Reabrir timeslot si estaba lleno
  const newCount = Math.max(0, participation.timeslot.currentParticipants - 1);
  await prisma.timeslot.update({
    where: { id: participation.timeslotId },
    data: {
      currentParticipants: newCount,
      status: newCount < participation.timeslot.maxParticipants ? 'AVAILABLE' : 'FULL',
    },
  });

  // Promover primer waitlisted si hay
  const nextInWaitlist = await prisma.waitlistEntry.findFirst({
    where: {
      timeslotId: participation.timeslotId,
      status: 'WAITING',
    },
    orderBy: { position: 'asc' },
  });

  if (nextInWaitlist) {
    await prisma.waitlistEntry.update({
      where: { id: nextInWaitlist.id },
      data: { status: 'NOTIFIED' },
    });
    await notifyWaitlistPromotion(nextInWaitlist.id);
  }

  await logAuditEvent({
    userId: session.user.id,
    action: 'CANCEL_SIGN_UP',
    entityType: 'Participation',
    entityId: participationId,
    previousState: { status: participation.status },
    newState: { status: 'CANCELLED', penalized },
  });

  return { success: true, data: { penalized } };
}

/**
 * Agrega un estudiante a la lista de espera de un timeslot lleno.
 *
 * @param timeslotId - ID del timeslot
 */
export async function joinWaitlist(timeslotId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.JOIN_WAITLIST);

  const timeslot = await prisma.timeslot.findUnique({
    where: { id: timeslotId },
  });

  if (!timeslot) {
    return { success: false, error: 'Timeslot no encontrado' };
  }

  // Solo se puede entrar a waitlist si el timeslot está lleno
  if (timeslot.status !== 'FULL') {
    return { success: false, error: 'Solo puede unirse a la lista de espera si el timeslot está lleno' };
  }

  // Verificar que no esté ya en waitlist
  const existing = await prisma.waitlistEntry.findFirst({
    where: {
      timeslotId,
      studentId: session.user.id,
      status: 'WAITING',
    },
  });

  if (existing) {
    return { success: false, error: 'Ya está en la lista de espera de este timeslot' };
  }

  // Obtener posición
  const lastEntry = await prisma.waitlistEntry.findFirst({
    where: { timeslotId },
    orderBy: { position: 'desc' },
  });
  const nextPosition = lastEntry ? lastEntry.position + 1 : 1;

  const entry = await prisma.waitlistEntry.create({
    data: {
      timeslotId,
      studentId: session.user.id,
      position: nextPosition,
      status: 'WAITING',
    },
  });

  await logAuditEvent({
    userId: session.user.id,
    action: 'JOIN_WAITLIST',
    entityType: 'WaitlistEntry',
    entityId: entry.id,
    newState: { timeslotId, position: nextPosition },
  });

  return { success: true, data: entry };
}

// ============================================================
// Completitud (IP + IE)
// ============================================================

/**
 * Marca una participación como COMPLETED o NO_SHOW.
 * Solo IP del estudio o IE colaborador pueden marcar.
 *
 * @param formData - {participationId, status}
 */
export async function markCompletion(formData: {
  participationId: string;
  status: 'COMPLETED' | 'NO_SHOW';
}): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.MARK_COMPLETION);

  // Validar datos
  const parsed = markCompletionSchema.safeParse(formData);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || 'Datos inválidos';
    return { success: false, error: firstError };
  }

  const participation = await prisma.participation.findUnique({
    where: { id: parsed.data.participationId },
    include: {
      study: {
        include: { collaborators: { select: { userId: true } } },
      },
    },
  });

  if (!participation) {
    return { success: false, error: 'Participación no encontrada' };
  }

  // Verificar acceso
  const isPI = participation.study.principalInvestigatorId === session.user.id;
  const isCollaborator = participation.study.collaborators.some(
    (c) => c.userId === session.user.id
  );
  if (!isPI && !isCollaborator) {
    return { success: false, error: 'No tiene acceso a este estudio' };
  }

  // Solo se pueden marcar participaciones SIGNED_UP o REMINDED
  if (
    participation.status !== 'SIGNED_UP' &&
    participation.status !== 'REMINDED'
  ) {
    return {
      success: false,
      error: `No se puede marcar una participación en estado "${participation.status}"`,
    };
  }

  const isCompleted = parsed.data.status === 'COMPLETED';
  const creditsEarned = isCompleted ? participation.study.creditsWorth : 0;

  await prisma.participation.update({
    where: { id: parsed.data.participationId },
    data: {
      status: parsed.data.status,
      completedById: session.user.id,
      completedAt: new Date(),
      creditsEarned,
    },
  });

  // Si es NO_SHOW, aplicar penalización (bloqueo temporal)
  if (parsed.data.status === 'NO_SHOW') {
    // La penalización se verifica al inscribirse (futuro)
    // Solo registramos el evento aquí
  }

  await logAuditEvent({
    userId: session.user.id,
    action: isCompleted ? 'MARK_COMPLETED' : 'MARK_NO_SHOW',
    entityType: 'Participation',
    entityId: parsed.data.participationId,
    previousState: { status: participation.status },
    newState: {
      status: parsed.data.status,
      creditsEarned,
    },
  });

  return { success: true };
}

/**
 * Marca múltiples participaciones como COMPLETED o NO_SHOW.
 * Operación masiva para IP/IE.
 *
 * @param formData - {participationIds, status}
 * @returns Resumen de operación
 */
export async function bulkMarkCompletion(formData: {
  participationIds: string[];
  status: 'COMPLETED' | 'NO_SHOW';
}): Promise<ActionResult<{ updated: number; skipped: number }>> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.BULK_MARK_COMPLETION);

  // Validar datos
  const parsed = bulkCompletionSchema.safeParse(formData);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || 'Datos inválidos';
    return { success: false, error: firstError };
  }

  let updated = 0;
  let skipped = 0;

  for (const participationId of parsed.data.participationIds) {
    const result = await markCompletion({
      participationId,
      status: parsed.data.status,
    });

    if (result.success) {
      updated++;
    } else {
      skipped++;
    }
  }

  await logAuditEvent({
    userId: session.user.id,
    action: 'BULK_MARK_COMPLETION',
    entityType: 'Participation',
    entityId: 'bulk',
    newState: {
      status: parsed.data.status,
      count: parsed.data.participationIds.length,
      updated,
      skipped,
    },
  });

  return { success: true, data: { updated, skipped } };
}

// ============================================================
// Historial del estudiante
// ============================================================

/**
 * Obtiene el historial de participaciones de un estudiante.
 *
 * @returns Lista de participaciones con estudio y créditos
 */
export async function getParticipationHistory(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.VIEW_OWN_HISTORY);

  const participations = await prisma.participation.findMany({
    where: { studentId: session.user.id },
    include: {
      study: {
        select: {
          id: true,
          title: true,
          creditsWorth: true,
        },
      },
      timeslot: {
        select: {
          startTime: true,
          endTime: true,
          location: true,
        },
      },
      creditAssignments: {
        include: {
          course: { select: { code: true, name: true } },
        },
      },
    },
    orderBy: { signedUpAt: 'desc' },
  });

  return { success: true, data: participations };
}
