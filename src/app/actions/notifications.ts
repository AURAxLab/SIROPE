/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Acciones de Servidor — Notificaciones
 * Funciones de notificación que integran las acciones del sistema
 * con el envío de emails. Incluye el procesamiento de recordatorios.
 */

'use server';

import prisma from '@/lib/prisma';
import {
  sendSignUpConfirmation,
  sendReminder,
  sendCreditsGranted,
  sendNewSignUpNotification,
  sendCancellationConfirmation,
  sendWaitlistPromotion,
  sendStudyApproved,
  sendStudyRejected,
} from '@/lib/email';

// ============================================================
// Tipos
// ============================================================

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================
// Notificaciones de inscripción
// ============================================================

/**
 * Envía las notificaciones correspondientes a una nueva inscripción.
 * Notifica al estudiante y al investigador principal.
 *
 * @param participationId - ID de la participación recién creada
 */
export async function notifySignUp(participationId: string): Promise<void> {
  const participation = await prisma.participation.findUnique({
    where: { id: participationId },
    include: {
      student: { select: { name: true, email: true } },
      study: {
        select: {
          title: true,
          principalInvestigator: { select: { name: true, email: true } },
        },
      },
      timeslot: { select: { startTime: true, endTime: true, location: true } },
    },
  });

  if (!participation) return;

  const dateTime = formatDateTime(participation.timeslot.startTime);
  const location = participation.timeslot.location || 'Por confirmar';

  // Notificar al estudiante
  await sendSignUpConfirmation(
    participation.student.email,
    participation.student.name,
    participation.study.title,
    dateTime,
    location
  );

  // Notificar al IP
  await sendNewSignUpNotification(
    participation.study.principalInvestigator.email,
    participation.study.principalInvestigator.name,
    participation.student.name,
    participation.study.title,
    dateTime
  );
}

/**
 * Envía notificación de cancelación al estudiante.
 *
 * @param participationId - ID de la participación cancelada
 * @param penalized - Si la cancelación fue con penalización
 */
export async function notifyCancellation(
  participationId: string,
  penalized: boolean
): Promise<void> {
  const participation = await prisma.participation.findUnique({
    where: { id: participationId },
    include: {
      student: { select: { name: true, email: true } },
      study: { select: { title: true } },
    },
  });

  if (!participation) return;

  await sendCancellationConfirmation(
    participation.student.email,
    participation.student.name,
    participation.study.title,
    penalized
  );
}

/**
 * Envía notificación a un estudiante en lista de espera
 * cuando se libera un espacio.
 *
 * @param waitlistEntryId - ID de la entrada en waitlist
 */
export async function notifyWaitlistPromotion(
  waitlistEntryId: string
): Promise<void> {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: waitlistEntryId },
    include: {
      student: { select: { name: true, email: true } },
      timeslot: {
        select: {
          startTime: true,
          study: { select: { title: true } },
        },
      },
    },
  });

  if (!entry) return;

  // Obtener horas configurables para expiración del waitlist
  const expiresConfig = await prisma.systemConfig.findUnique({
    where: { key: 'WAITLIST_EXPIRATION_HOURS' },
  });
  const expiresIn = expiresConfig ? parseInt(expiresConfig.value, 10) : 12;

  await sendWaitlistPromotion(
    entry.student.email,
    entry.student.name,
    entry.timeslot.study.title,
    formatDateTime(entry.timeslot.startTime),
    expiresIn
  );
}

/**
 * Envía notificación al IP sobre la decisión de su estudio.
 *
 * @param studyId - ID del estudio revisado
 * @param approved - Si fue aprobado o rechazado
 * @param rejectionReason - Razón de rechazo (si aplica)
 */
export async function notifyStudyReview(
  studyId: string,
  approved: boolean,
  rejectionReason?: string
): Promise<void> {
  const study = await prisma.study.findUnique({
    where: { id: studyId },
    include: {
      principalInvestigator: { select: { name: true, email: true } },
    },
  });

  if (!study) return;

  if (approved) {
    await sendStudyApproved(
      study.principalInvestigator.email,
      study.principalInvestigator.name,
      study.title
    );
  } else {
    await sendStudyRejected(
      study.principalInvestigator.email,
      study.principalInvestigator.name,
      study.title,
      rejectionReason || 'No se proporcionó una razón específica.'
    );
  }
}

/**
 * Envía notificaciones de créditos cuando se marca una participación
 * como COMPLETED.
 *
 * @param participationId - ID de la participación completada
 */
export async function notifyCreditsEarned(
  participationId: string
): Promise<void> {
  const participation = await prisma.participation.findUnique({
    where: { id: participationId },
    include: {
      student: { select: { name: true, email: true } },
      study: { select: { title: true, creditsWorth: true } },
    },
  });

  if (!participation) return;

  await sendCreditsGranted(
    participation.student.email,
    participation.student.name,
    participation.study.title,
    participation.study.creditsWorth
  );
}

// ============================================================
// Procesamiento de recordatorios
// ============================================================

/**
 * Procesa y envía recordatorios para timeslots que ocurren
 * en las próximas 24 horas. Cambia el estado de SIGNED_UP a REMINDED.
 *
 * Esta función está diseñada para ser llamada por un cron job
 * (e.g., cada hora) a través de una API route protegida.
 *
 * @returns Resumen de recordatorios enviados
 */
export async function processReminders(): Promise<
  ActionResult<{ sent: number; errors: number }>
> {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Buscar participaciones SIGNED_UP con timeslot en las próximas 24h
  const participations = await prisma.participation.findMany({
    where: {
      status: 'SIGNED_UP',
      timeslot: {
        startTime: {
          gte: now,
          lte: in24Hours,
        },
        status: { not: 'CANCELLED' },
      },
    },
    include: {
      student: { select: { name: true, email: true } },
      study: { select: { title: true } },
      timeslot: { select: { startTime: true, location: true } },
    },
  });

  let sent = 0;
  let errors = 0;

  for (const participation of participations) {
    const dateTime = formatDateTime(participation.timeslot.startTime);
    const location = participation.timeslot.location || 'Por confirmar';

    const result = await sendReminder(
      participation.student.email,
      participation.student.name,
      participation.study.title,
      dateTime,
      location
    );

    if (result.success) {
      // Actualizar estado a REMINDED
      await prisma.participation.update({
        where: { id: participation.id },
        data: { status: 'REMINDED' },
      });
      sent++;
    } else {
      errors++;
    }
  }

  return { success: true, data: { sent, errors } };
}

// ============================================================
// Utilidades
// ============================================================

/**
 * Formatea una fecha/hora para mostrar en emails.
 * Usa zona horaria de Costa Rica por defecto.
 *
 * @param date - Fecha a formatear
 * @returns Cadena formateada legible
 */
function formatDateTime(date: Date): string {
  return date.toLocaleString('es-CR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Costa_Rica',
  });
}
