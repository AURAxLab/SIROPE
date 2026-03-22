/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Acciones de Servidor — Créditos
 * Gestiona la asignación de créditos de participación a cursos.
 * Valida límites a 3 niveles: sistema (global), curso (profesor), estudio (IP).
 */

'use server';

import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { requirePermission, ACTIONS } from '@/lib/permissions';
import { creditAssignmentSchema } from '@/lib/validations';
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

/** Resumen de créditos de un estudiante en un semestre. */
interface CreditSummary {
  totalSemester: number;
  maxSemester: number;
  remainingSemester: number;
  byCourse: Array<{
    courseId: string;
    courseCode: string;
    courseName: string;
    assigned: number;
    maxForCourse: number;
    remaining: number;
  }>;
}

// ============================================================
// Lectura
// ============================================================

/**
 * Obtiene el resumen de créditos del estudiante en el semestre activo.
 * Incluye cuántos créditos ha usado y cuántos le quedan por curso.
 *
 * @returns Resumen de créditos con desglose por curso
 */
export async function getCreditSummary(): Promise<ActionResult<CreditSummary>> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.VIEW_OWN_HISTORY);

  // Obtener semestre activo
  const activeSemester = await prisma.semester.findFirst({
    where: { active: true },
  });

  if (!activeSemester) {
    return { success: false, error: 'No hay semestre activo' };
  }

  // Obtener máximo global de créditos por semestre
  const maxCreditsConfig = await prisma.systemConfig.findUnique({
    where: { key: 'MAX_CREDITS_PER_SEMESTER' },
  });
  const maxSemester = maxCreditsConfig
    ? parseFloat(maxCreditsConfig.value)
    : 4;

  // Obtener todas las asignaciones del semestre
  const assignments = await prisma.creditAssignment.findMany({
    where: {
      studentId: session.user.id,
      course: { semesterId: activeSemester.id },
    },
    include: {
      course: { select: { id: true, code: true, name: true, maxExtraCredits: true } },
    },
  });

  // Calcular total del semestre
  const totalSemester = assignments.reduce((sum, a) => sum + a.credits, 0);

  // Obtener matrículas del estudiante con cursos opt-in
  const enrollments = await prisma.enrollment.findMany({
    where: {
      studentId: session.user.id,
      course: {
        semesterId: activeSemester.id,
        optedIn: true,
      },
    },
    include: {
      course: { select: { id: true, code: true, name: true, maxExtraCredits: true } },
    },
  });

  // Agrupar asignaciones por curso
  const assignmentsByCourse = new Map<string, number>();
  for (const assignment of assignments) {
    const current = assignmentsByCourse.get(assignment.courseId) || 0;
    assignmentsByCourse.set(assignment.courseId, current + assignment.credits);
  }

  const byCourse = enrollments.map((enrollment) => {
    const assigned = assignmentsByCourse.get(enrollment.courseId) || 0;
    const maxForCourse = enrollment.course.maxExtraCredits;
    return {
      courseId: enrollment.courseId,
      courseCode: enrollment.course.code,
      courseName: enrollment.course.name,
      assigned,
      maxForCourse,
      remaining: Math.max(0, maxForCourse - assigned),
    };
  });

  return {
    success: true,
    data: {
      totalSemester,
      maxSemester,
      remainingSemester: Math.max(0, maxSemester - totalSemester),
      byCourse,
    },
  };
}

/**
 * Obtiene los créditos asignados a los cursos de un profesor.
 * Solo PROFESOR y ADMIN pueden ver.
 *
 * @returns Créditos asignados por estudiante y curso
 */
export async function getCourseCredits(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.VIEW_COURSE_CREDITS);

  // Obtener semestre activo
  const activeSemester = await prisma.semester.findFirst({
    where: { active: true },
  });

  if (!activeSemester) {
    return { success: false, error: 'No hay semestre activo' };
  }

  // Filtrar por profesor o admin
  const whereClause = role === 'ADMIN'
    ? { semesterId: activeSemester.id }
    : { semesterId: activeSemester.id, professorId: session.user.id };

  const courses = await prisma.course.findMany({
    where: whereClause,
    include: {
      creditAssignments: {
        include: {
          student: { select: { id: true, name: true, studentId: true } },
          participation: {
            select: {
              study: { select: { title: true } },
              completedAt: true,
            },
          },
        },
        orderBy: { assignedAt: 'desc' },
      },
    },
    orderBy: { code: 'asc' },
  });

  return { success: true, data: courses };
}

// ============================================================
// Escritura
// ============================================================

/**
 * Asigna créditos de una participación completada a un curso.
 * Valida:
 * 1. La participación está COMPLETED
 * 2. El estudiante está matriculado en el curso
 * 3. El curso tiene opt-in activado
 * 4. No excede el máximo del curso (profesor)
 * 5. No excede el máximo del semestre (sistema)
 * 6. No se duplican asignaciones
 *
 * @param formData - {participationId, courseId, credits}
 * @returns La asignación creada
 */
export async function assignCredits(formData: {
  participationId: string;
  courseId: string;
  credits: number;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.ASSIGN_CREDITS);

  // Validar datos
  const parsed = creditAssignmentSchema.safeParse(formData);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || 'Datos inválidos';
    return { success: false, error: firstError };
  }

  // 1. Verificar que la participación existe y está COMPLETED
  const participation = await prisma.participation.findUnique({
    where: { id: parsed.data.participationId },
    include: {
      study: { select: { creditsWorth: true, semesterId: true } },
    },
  });

  if (!participation) {
    return { success: false, error: 'Participación no encontrada' };
  }

  if (participation.studentId !== session.user.id) {
    return { success: false, error: 'Solo puede asignar créditos de sus propias participaciones' };
  }

  if (participation.status !== 'COMPLETED') {
    return { success: false, error: 'Solo se pueden asignar créditos de participaciones completadas' };
  }

  // Verificar que los créditos no excedan lo ganado en el estudio
  if (parsed.data.credits > participation.study.creditsWorth) {
    return {
      success: false,
      error: `Los créditos (${parsed.data.credits}) exceden los ganados en el estudio (${participation.study.creditsWorth})`,
    };
  }

  // 2. Verificar que el curso existe y está en el mismo semestre
  const course = await prisma.course.findUnique({
    where: { id: parsed.data.courseId },
  });

  if (!course) {
    return { success: false, error: 'Curso no encontrado' };
  }

  if (course.semesterId !== participation.study.semesterId) {
    return { success: false, error: 'El curso debe ser del mismo semestre que el estudio' };
  }

  // 3. Verificar opt-in
  if (!course.optedIn) {
    return { success: false, error: 'Este curso no tiene habilitados los créditos de investigación' };
  }

  // 4. Verificar matrícula
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: session.user.id,
        courseId: parsed.data.courseId,
      },
    },
  });

  if (!enrollment) {
    return { success: false, error: 'No está matriculado en este curso' };
  }

  // 5. Verificar duplicado: no asignar la misma participación dos veces al mismo curso
  const existingAssignment = await prisma.creditAssignment.findFirst({
    where: {
      participationId: parsed.data.participationId,
      courseId: parsed.data.courseId,
    },
  });

  if (existingAssignment) {
    return { success: false, error: 'Ya asignó los créditos de esta participación a este curso' };
  }

  // 6. Verificar límite del curso (profesor)
  const courseAssignments = await prisma.creditAssignment.findMany({
    where: {
      studentId: session.user.id,
      courseId: parsed.data.courseId,
    },
  });
  const currentCourseCredits = courseAssignments.reduce(
    (sum, a) => sum + a.credits,
    0
  );

  if (currentCourseCredits + parsed.data.credits > course.maxExtraCredits) {
    return {
      success: false,
      error: `Excede el máximo del curso (${course.maxExtraCredits}). Ya tiene ${currentCourseCredits} asignados.`,
    };
  }

  // 7. Verificar límite del semestre (sistema)
  const maxCreditsConfig = await prisma.systemConfig.findUnique({
    where: { key: 'MAX_CREDITS_PER_SEMESTER' },
  });
  const maxSemester = maxCreditsConfig
    ? parseFloat(maxCreditsConfig.value)
    : 4;

  const semesterAssignments = await prisma.creditAssignment.findMany({
    where: {
      studentId: session.user.id,
      course: { semesterId: course.semesterId },
    },
  });
  const currentSemesterCredits = semesterAssignments.reduce(
    (sum, a) => sum + a.credits,
    0
  );

  if (currentSemesterCredits + parsed.data.credits > maxSemester) {
    return {
      success: false,
      error: `Excede el máximo del semestre (${maxSemester}). Ya tiene ${currentSemesterCredits} asignados.`,
    };
  }

  // Crear la asignación
  const assignment = await prisma.creditAssignment.create({
    data: {
      participationId: parsed.data.participationId,
      studentId: session.user.id,
      courseId: parsed.data.courseId,
      credits: parsed.data.credits,
    },
  });

  await logAuditEvent({
    userId: session.user.id,
    action: 'ASSIGN_CREDITS',
    entityType: 'CreditAssignment',
    entityId: assignment.id,
    newState: {
      courseId: parsed.data.courseId,
      credits: parsed.data.credits,
      participationId: parsed.data.participationId,
    },
  });

  return { success: true, data: assignment };
}
