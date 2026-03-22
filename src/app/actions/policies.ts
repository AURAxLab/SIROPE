/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Acciones de Servidor — Políticas y Penalizaciones
 * Gestiona la política de cancelación configurable, penalizaciones
 * por no-show, y asignaciones alternativas.
 */

'use server';

import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { requirePermission, ACTIONS } from '@/lib/permissions';
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

/** Resumen de penalizaciones de un estudiante. */
interface PenaltySummary {
  noShowCount: number;
  lateCancellationCount: number;
  isBlocked: boolean;
  blockedUntil: Date | null;
  nextAllowedSignUp: Date | null;
}

// ============================================================
// Verificación de elegibilidad (penalizaciones)
// ============================================================

/**
 * Verifica si un estudiante tiene penalizaciones activas que
 * le impidan inscribirse en nuevos timeslots.
 *
 * Reglas de penalización (configurables via SystemConfig):
 * - MAX_NO_SHOWS: máximo de no-shows antes de bloqueo (default: 3)
 * - NO_SHOW_BLOCK_DAYS: días de bloqueo por exceder no-shows (default: 14)
 *
 * @returns Resumen de penalizaciones
 */
export async function checkPenalties(): Promise<ActionResult<PenaltySummary>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'No autenticado' };

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.BROWSE_STUDIES);

  // Obtener configuración de penalizaciones
  const [maxNoShowsConfig, blockDaysConfig] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { key: 'MAX_NO_SHOWS' } }),
    prisma.systemConfig.findUnique({ where: { key: 'NO_SHOW_BLOCK_DAYS' } }),
  ]);

  const maxNoShows = maxNoShowsConfig
    ? parseInt(maxNoShowsConfig.value, 10)
    : 3;
  const blockDays = blockDaysConfig
    ? parseInt(blockDaysConfig.value, 10)
    : 14;

  // Obtener semestre activo
  const activeSemester = await prisma.semester.findFirst({
    where: { active: true },
  });

  if (!activeSemester) {
    return {
      success: true,
      data: {
        noShowCount: 0,
        lateCancellationCount: 0,
        isBlocked: false,
        blockedUntil: null,
        nextAllowedSignUp: null,
      },
    };
  }

  // Contar no-shows del semestre activo
  const noShowCount = await prisma.participation.count({
    where: {
      studentId: session.user.id,
      status: 'NO_SHOW',
      study: { semesterId: activeSemester.id },
    },
  });

  // Contar cancelaciones tardías
  const lateCancellationCount = await prisma.participation.count({
    where: {
      studentId: session.user.id,
      status: 'CANCELLED',
      cancellationReason: { contains: 'Cancelación tardía' },
      study: { semesterId: activeSemester.id },
    },
  });

  // Determinar si está bloqueado
  let isBlocked = false;
  let blockedUntil: Date | null = null;

  if (noShowCount >= maxNoShows) {
    // Buscar el último no-show
    const lastNoShow = await prisma.participation.findFirst({
      where: {
        studentId: session.user.id,
        status: 'NO_SHOW',
        study: { semesterId: activeSemester.id },
      },
      orderBy: { completedAt: 'desc' },
    });

    if (lastNoShow?.completedAt) {
      blockedUntil = new Date(
        lastNoShow.completedAt.getTime() + blockDays * 24 * 60 * 60 * 1000
      );
      isBlocked = blockedUntil > new Date();
    }
  }

  return {
    success: true,
    data: {
      noShowCount,
      lateCancellationCount,
      isBlocked,
      blockedUntil: isBlocked ? blockedUntil : null,
      nextAllowedSignUp: isBlocked ? blockedUntil : null,
    },
  };
}

// ============================================================
// Asignación alternativa (ensayo)
// ============================================================

/**
 * Registra una asignación alternativa para estudiantes que
 * no pueden o no desean participar en estudios de investigación.
 * El profesor debe validar la asignación manualmente.
 *
 * @param formData - Datos de la asignación alternativa
 */
export async function submitAlternativeAssignment(formData: {
  courseId: string;
  description: string;
  credits: number;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'No autenticado' };

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.ASSIGN_CREDITS);

  // Validaciones básicas
  if (!formData.description || formData.description.length < 20) {
    return { success: false, error: 'La descripción debe tener al menos 20 caracteres' };
  }

  if (formData.credits <= 0 || formData.credits > 5) {
    return { success: false, error: 'Los créditos deben estar entre 0.5 y 5' };
  }

  // Verificar que el curso existe y acepta opt-in
  const course = await prisma.course.findUnique({
    where: { id: formData.courseId },
  });

  if (!course) {
    return { success: false, error: 'Curso no encontrado' };
  }

  if (!course.optedIn) {
    return { success: false, error: 'Este curso no acepta créditos de investigación' };
  }

  // Verificar matrícula
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: session.user.id,
        courseId: formData.courseId,
      },
    },
  });

  if (!enrollment) {
    return { success: false, error: 'No está matriculado en este curso' };
  }

  // Crear la solicitud de asignación alternativa
  const alternativeAssignment = await prisma.alternativeAssignment.create({
    data: {
      studentId: session.user.id,
      courseId: formData.courseId,
      description: formData.description,
      creditsRequested: formData.credits,
      status: 'PENDING',
    },
  });

  await logAuditEvent({
    userId: session.user.id,
    action: 'SUBMIT_ALTERNATIVE_ASSIGNMENT',
    entityType: 'AlternativeAssignment',
    entityId: alternativeAssignment.id,
    newState: {
      courseId: formData.courseId,
      credits: formData.credits,
      status: 'PENDING',
    },
  });

  return { success: true, data: alternativeAssignment };
}

/**
 * Aprueba o rechaza una asignación alternativa.
 * Solo el profesor del curso puede revisar.
 *
 * @param assignmentId - ID de la asignación alternativa
 * @param decision - APPROVE o REJECT
 * @param feedback - Retroalimentación del profesor
 */
export async function reviewAlternativeAssignment(
  assignmentId: string,
  decision: 'APPROVE' | 'REJECT',
  feedback?: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'No autenticado' };

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.EDIT_OWN_COURSE);

  const assignment = await prisma.alternativeAssignment.findUnique({
    where: { id: assignmentId },
    include: { course: true },
  });

  if (!assignment) {
    return { success: false, error: 'Asignación no encontrada' };
  }

  // Verificar que el profesor es dueño del curso
  if (assignment.course.professorId !== session.user.id) {
    return { success: false, error: 'Solo el profesor del curso puede revisar' };
  }

  if (assignment.status !== 'PENDING') {
    return { success: false, error: 'Esta asignación ya fue revisada' };
  }

  const newStatus = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';

  await prisma.alternativeAssignment.update({
    where: { id: assignmentId },
    data: {
      status: newStatus,
      reviewedById: session.user.id,
      reviewedAt: new Date(),
      feedback: feedback || null,
    },
  });

  // Si se aprueba, crear la asignación de créditos
  if (decision === 'APPROVE') {
    await prisma.creditAssignment.create({
      data: {
        studentId: assignment.studentId,
        courseId: assignment.courseId,
        credits: assignment.creditsRequested,
        alternativeAssignmentId: assignmentId,
      },
    });
  }

  await logAuditEvent({
    userId: session.user.id,
    action: `REVIEW_ALTERNATIVE_${decision}`,
    entityType: 'AlternativeAssignment',
    entityId: assignmentId,
    previousState: { status: 'PENDING' },
    newState: { status: newStatus, feedback },
  });

  return { success: true };
}

// ============================================================
// Analytics (Admin)
// ============================================================

/**
 * Obtiene estadísticas generales del sistema para el dashboard
 * de analytics del administrador.
 *
 * @returns Métricas del sistema
 */
export async function getSystemAnalytics(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'No autenticado' };

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.VIEW_AUDIT_LOG);

  const activeSemester = await prisma.semester.findFirst({
    where: { active: true },
  });

  if (!activeSemester) {
    return { success: false, error: 'No hay semestre activo' };
  }

  const [
    totalStudents,
    totalResearchers,
    totalProfessors,
    activeStudies,
    totalParticipations,
    completedCount,
    noShowCount,
    cancelledCount,
    totalCreditsAssigned,
    studiesByStatus,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'ESTUDIANTE', active: true } }),
    prisma.user.count({
      where: { role: { in: ['INV_PRINCIPAL', 'INV_EJECUTOR'] }, active: true },
    }),
    prisma.user.count({ where: { role: 'PROFESOR', active: true } }),
    prisma.study.count({
      where: { status: 'ACTIVE', semesterId: activeSemester.id },
    }),
    prisma.participation.count({
      where: { study: { semesterId: activeSemester.id } },
    }),
    prisma.participation.count({
      where: { status: 'COMPLETED', study: { semesterId: activeSemester.id } },
    }),
    prisma.participation.count({
      where: { status: 'NO_SHOW', study: { semesterId: activeSemester.id } },
    }),
    prisma.participation.count({
      where: { status: 'CANCELLED', study: { semesterId: activeSemester.id } },
    }),
    prisma.creditAssignment.aggregate({
      where: { course: { semesterId: activeSemester.id } },
      _sum: { credits: true },
    }),
    prisma.study.groupBy({
      by: ['status'],
      where: { semesterId: activeSemester.id },
      _count: true,
    }),
  ]);

  // Tasa de completitud
  const completionRate = totalParticipations > 0
    ? Math.round((completedCount / totalParticipations) * 100)
    : 0;

  // Tasa de no-show
  const noShowRate = totalParticipations > 0
    ? Math.round((noShowCount / totalParticipations) * 100)
    : 0;

  return {
    success: true,
    data: {
      semester: activeSemester.name,
      users: {
        students: totalStudents,
        researchers: totalResearchers,
        professors: totalProfessors,
      },
      studies: {
        active: activeStudies,
        byStatus: studiesByStatus,
      },
      participations: {
        total: totalParticipations,
        completed: completedCount,
        noShow: noShowCount,
        cancelled: cancelledCount,
        completionRate,
        noShowRate,
      },
      credits: {
        totalAssigned: totalCreditsAssigned._sum.credits || 0,
      },
    },
  };
}
