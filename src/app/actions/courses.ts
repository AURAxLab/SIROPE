/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Acciones de Servidor — Cursos
 * Gestiona todas las operaciones CRUD de cursos académicos.
 * Los profesores crean cursos, configuran los créditos extra máximos
 * y habilitan (opt-in) la participación en SIROPE.
 */

'use server';

import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { requirePermission, ACTIONS } from '@/lib/permissions';
import { courseSchema } from '@/lib/validations';
import { logAuditEvent } from '@/lib/audit';
import type { Role } from '@/lib/validations';

// ============================================================
// Tipos de respuesta
// ============================================================

/** Resultado estándar de una operación de servidor. */
interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================
// Acciones de lectura
// ============================================================

/**
 * Obtiene todos los cursos del semestre activo.
 * Accesible por: ADMIN, PROFESOR.
 *
 * @returns Lista de cursos con datos del profesor y semestre
 */
export async function getCourses(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;

  // Profesores solo ven sus propios cursos, Admin ve todos
  const whereClause = role === 'ADMIN'
    ? {}
    : { professorId: session.user.id };

  const courses = await prisma.course.findMany({
    where: {
      ...whereClause,
      semester: { active: true },
    },
    include: {
      professor: { select: { id: true, name: true, email: true } },
      semester: { select: { id: true, name: true } },
      _count: {
        select: {
          enrollments: true,
          creditAssignments: true,
        },
      },
    },
    orderBy: { code: 'asc' },
  });

  return { success: true, data: courses };
}

/**
 * Obtiene un curso por ID con detalles completos.
 *
 * @param courseId - ID del curso
 * @returns Curso con profesor, semestre y conteos
 */
export async function getCourseById(courseId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      professor: { select: { id: true, name: true, email: true } },
      semester: { select: { id: true, name: true } },
      enrollments: {
        include: {
          student: { select: { id: true, name: true, email: true, studentId: true } },
        },
      },
      _count: {
        select: {
          enrollments: true,
          creditAssignments: true,
        },
      },
    },
  });

  if (!course) {
    return { success: false, error: 'Curso no encontrado' };
  }

  // Verificar acceso: solo el profesor dueño o Admin
  const role = session.user.role as Role;
  if (role !== 'ADMIN' && course.professorId !== session.user.id) {
    return { success: false, error: 'No tiene acceso a este curso' };
  }

  return { success: true, data: course };
}

// ============================================================
// Acciones de escritura
// ============================================================

/**
 * Crea un nuevo curso en el semestre activo.
 * Solo ADMIN y PROFESOR pueden crear cursos.
 *
 * @param formData - Datos del curso a crear
 * @returns El curso creado
 */
export async function createCourse(formData: {
  code: string;
  name: string;
  semesterId: string;
  maxExtraCredits: number;
  optedIn: boolean;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.CREATE_COURSE);

  // Validar datos de entrada
  const parsed = courseSchema.safeParse(formData);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || 'Datos inválidos';
    return { success: false, error: firstError };
  }

  // Verificar que el semestre existe
  const semester = await prisma.semester.findUnique({
    where: { id: parsed.data.semesterId },
  });
  if (!semester) {
    return { success: false, error: 'Semestre no encontrado' };
  }

  // Verificar que no exista un curso con el mismo código en el semestre
  const existing = await prisma.course.findUnique({
    where: {
      code_semesterId: {
        code: parsed.data.code,
        semesterId: parsed.data.semesterId,
      },
    },
  });
  if (existing) {
    return { success: false, error: `Ya existe un curso con código "${parsed.data.code}" en este semestre` };
  }

  // Crear el curso
  const course = await prisma.course.create({
    data: {
      code: parsed.data.code,
      name: parsed.data.name,
      semesterId: parsed.data.semesterId,
      professorId: session.user.id,
      maxExtraCredits: parsed.data.maxExtraCredits,
      optedIn: parsed.data.optedIn,
    },
  });

  // Registrar auditoría
  await logAuditEvent({
    userId: session.user.id,
    action: 'CREATE_COURSE',
    entityType: 'Course',
    entityId: course.id,
    newState: {
      code: course.code,
      name: course.name,
      maxExtraCredits: course.maxExtraCredits,
      optedIn: course.optedIn,
    },
  });

  return { success: true, data: course };
}

/**
 * Actualiza un curso existente.
 * Solo el profesor dueño o un ADMIN puede editar.
 *
 * @param courseId - ID del curso a actualizar
 * @param formData - Campos a actualizar
 * @returns El curso actualizado
 */
export async function updateCourse(
  courseId: string,
  formData: {
    name?: string;
    maxExtraCredits?: number;
    optedIn?: boolean;
  }
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;

  // Buscar el curso actual
  const existing = await prisma.course.findUnique({
    where: { id: courseId },
  });
  if (!existing) {
    return { success: false, error: 'Curso no encontrado' };
  }

  // Verificar propiedad
  if (role !== 'ADMIN' && existing.professorId !== session.user.id) {
    return { success: false, error: 'No tiene permiso para editar este curso' };
  }

  requirePermission(role, ACTIONS.EDIT_OWN_COURSE);

  // Construir datos de actualización
  const updateData: Record<string, unknown> = {};
  if (formData.name !== undefined) {
    updateData.name = formData.name;
  }
  if (formData.maxExtraCredits !== undefined) {
    if (formData.maxExtraCredits < 0 || formData.maxExtraCredits > 10) {
      return { success: false, error: 'Los créditos extra deben estar entre 0 y 10' };
    }
    updateData.maxExtraCredits = formData.maxExtraCredits;
  }
  if (formData.optedIn !== undefined) {
    updateData.optedIn = formData.optedIn;
  }

  const previousState = {
    name: existing.name,
    maxExtraCredits: existing.maxExtraCredits,
    optedIn: existing.optedIn,
  };

  const course = await prisma.course.update({
    where: { id: courseId },
    data: updateData,
  });

  await logAuditEvent({
    userId: session.user.id,
    action: 'UPDATE_COURSE',
    entityType: 'Course',
    entityId: course.id,
    previousState,
    newState: {
      name: course.name,
      maxExtraCredits: course.maxExtraCredits,
      optedIn: course.optedIn,
    },
  });

  return { success: true, data: course };
}

/**
 * Elimina un curso.
 * Solo un ADMIN puede eliminar cursos.
 * No se puede eliminar si tiene créditos asignados.
 *
 * @param courseId - ID del curso a eliminar
 */
export async function deleteCourse(courseId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  if (role !== 'ADMIN') {
    return { success: false, error: 'Solo un administrador puede eliminar cursos' };
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      _count: { select: { creditAssignments: true } },
    },
  });

  if (!course) {
    return { success: false, error: 'Curso no encontrado' };
  }

  if (course._count.creditAssignments > 0) {
    return { success: false, error: 'No se puede eliminar un curso con créditos asignados' };
  }

  // Eliminar matrículas primero, luego el curso
  await prisma.enrollment.deleteMany({ where: { courseId } });
  await prisma.course.delete({ where: { id: courseId } });

  await logAuditEvent({
    userId: session.user.id,
    action: 'DELETE_COURSE',
    entityType: 'Course',
    entityId: courseId,
    previousState: { code: course.code, name: course.name },
  });

  return { success: true };
}

/**
 * Elimina a un estudiante de un curso (Purga de Matrícula).
 * Elimina tanto su matrícula como los créditos que haya asignado a este curso.
 * Los créditos vuelven a estar disponibles en la billetera del estudiante.
 * Solo el profesor dueño o un ADMIN puede hacer esto.
 *
 * @param courseId - ID del curso
 * @param studentId - ID del estudiante
 */
export async function removeStudentFromCourse(courseId: string, studentId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });

  if (!course) {
    return { success: false, error: 'Curso no encontrado' };
  }

  if (role !== 'ADMIN' && course.professorId !== session.user.id) {
    return { success: false, error: 'No tiene permiso para gestionar este curso' };
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId } }
  });

  if (!enrollment) {
    return { success: false, error: 'El estudiante no está matriculado en este curso' };
  }

  // Eliminar asignaciones de créditos para este curso (devuelve los créditos a la "billetera")
  await prisma.creditAssignment.deleteMany({
    where: { studentId, courseId }
  });

  // Eliminar matrícula
  await prisma.enrollment.delete({
    where: { id: enrollment.id }
  });

  await logAuditEvent({
    userId: session.user.id,
    action: 'REMOVE_STUDENT_FROM_COURSE',
    entityType: 'Course',
    entityId: courseId,
    previousState: { studentId },
    newState: { action: 'Purged from course' },
  });

  return { success: true };
}
