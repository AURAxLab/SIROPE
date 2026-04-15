/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Acciones de Servidor — Estudios
 * Gestiona todas las operaciones CRUD de estudios de investigación.
 * Los Investigadores Principales (IP) crean, editan y envían a aprobación.
 * Los Administradores aprueban o rechazan.
 */

'use server';

import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { requirePermission, ACTIONS } from '@/lib/permissions';
import { studySchema, studyApprovalSchema } from '@/lib/validations';
import { logAuditEvent } from '@/lib/audit';
import type { Role } from '@/lib/validations';
import { sendStudyPendingApproval } from '@/lib/email';

// ============================================================
// Tipos
// ============================================================

/** Resultado estándar de una operación de servidor. */
interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================
// Lectura
// ============================================================

/**
 * Obtiene estudios según el rol del usuario.
 * - ADMIN: todos los estudios (para aprobación)
 * - IP: sus propios estudios
 * - IE: estudios donde es colaborador
 * - ESTUDIANTE: estudios activos del semestre
 *
 * @param filters - Filtros opcionales
 * @returns Lista de estudios con relaciones
 */
export async function getStudies(filters?: {
  status?: string;
  semesterId?: string;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  const whereClause: Record<string, unknown> = {};

  // Filtrar por rol
  if (role === 'ADMIN') {
    // Admin ve todos (por defecto, PENDING_APPROVAL para aprobación)
    if (filters?.status) {
      whereClause.status = filters.status;
    }
  } else if (role === 'INV_PRINCIPAL') {
    whereClause.principalInvestigatorId = session.user.id;
    if (filters?.status) {
      whereClause.status = filters.status;
    }
  } else if (role === 'INV_EJECUTOR') {
    whereClause.collaborators = {
      some: { userId: session.user.id },
    };
  } else if (role === 'ESTUDIANTE') {
    whereClause.status = 'ACTIVE';
  } else {
    return { success: false, error: 'Rol no autorizado para ver estudios' };
  }

  // Filtrar por semestre
  if (filters?.semesterId) {
    whereClause.semesterId = filters.semesterId;
  } else {
    // Por defecto, semestre activo
    whereClause.semester = { active: true };
  }

  const studies = await prisma.study.findMany({
    where: whereClause,
    include: {
      principalInvestigator: {
        select: { id: true, name: true, email: true },
      },
      semester: { select: { id: true, name: true } },
      _count: {
        select: {
          timeslots: true,
          participations: true,
          collaborators: true,
          prescreenQuestions: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return { success: true, data: studies };
}

/**
 * Obtiene un estudio por ID con todos sus detalles.
 *
 * @param studyId - ID del estudio
 * @returns Estudio con relaciones completas
 */
export async function getStudyById(studyId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const study = await prisma.study.findUnique({
    where: { id: studyId },
    include: {
      principalInvestigator: {
        select: { id: true, name: true, email: true },
      },
      approvedBy: {
        select: { id: true, name: true },
      },
      semester: { select: { id: true, name: true } },
      collaborators: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      prescreenQuestions: {
        orderBy: { orderIndex: 'asc' },
      },
      _count: {
        select: {
          timeslots: true,
          participations: true,
        },
      },
    },
  });

  if (!study) {
    return { success: false, error: 'Estudio no encontrado' };
  }

  return { success: true, data: study };
}

// ============================================================
// Escritura
// ============================================================

/**
 * Crea un nuevo estudio de investigación.
 * Solo INV_PRINCIPAL puede crear estudios. Se crea en estado DRAFT.
 *
 * @param formData - Datos del estudio
 * @returns El estudio creado
 */
export async function createStudy(formData: {
  title: string;
  description: string;
  semesterId: string;
  creditsWorth: number;
  estimatedDuration: number;
  location?: string;
  eligibilityCriteria?: string;
  ethicsApproved?: boolean;
  ethicsNote?: string;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.CREATE_STUDY);

  // Validar datos
  const parsed = studySchema.safeParse(formData);
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

  const study = await prisma.study.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      principalInvestigatorId: session.user.id,
      semesterId: parsed.data.semesterId,
      creditsWorth: parsed.data.creditsWorth,
      estimatedDuration: parsed.data.estimatedDuration,
      location: parsed.data.location || '',
      eligibilityCriteria: parsed.data.eligibilityCriteria || '',
      ethicsApproved: formData.ethicsApproved ?? false,
      ethicsNote: formData.ethicsNote || '',
      status: 'DRAFT',
    },
  });

  await logAuditEvent({
    userId: session.user.id,
    action: 'CREATE_STUDY',
    entityType: 'Study',
    entityId: study.id,
    newState: { title: study.title, status: 'DRAFT' },
  });

  return { success: true, data: study };
}

/**
 * Actualiza un estudio existente.
 * Solo el IP dueño puede editar, y solo si está en DRAFT o REJECTED.
 *
 * @param studyId - ID del estudio
 * @param formData - Campos a actualizar
 * @returns El estudio actualizado
 */
export async function updateStudy(
  studyId: string,
  formData: {
    title?: string;
    description?: string;
    creditsWorth?: number;
    estimatedDuration?: number;
    location?: string;
    eligibilityCriteria?: string;
  }
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.EDIT_OWN_STUDY);

  const existing = await prisma.study.findUnique({
    where: { id: studyId },
  });

  if (!existing) {
    return { success: false, error: 'Estudio no encontrado' };
  }

  // Verificar propiedad
  if (existing.principalInvestigatorId !== session.user.id) {
    return { success: false, error: 'Solo el investigador principal puede editar este estudio' };
  }

  // Solo se puede editar en DRAFT o REJECTED
  if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
    return {
      success: false,
      error: `No se puede editar un estudio en estado "${existing.status}". Solo se pueden editar estudios en DRAFT o REJECTED.`,
    };
  }

  const previousState = {
    title: existing.title,
    description: existing.description,
    creditsWorth: existing.creditsWorth,
    estimatedDuration: existing.estimatedDuration,
  };

  // Construir update dinámico
  const updateData: Record<string, unknown> = {};
  if (formData.title !== undefined) updateData.title = formData.title;
  if (formData.description !== undefined) updateData.description = formData.description;
  if (formData.creditsWorth !== undefined) updateData.creditsWorth = formData.creditsWorth;
  if (formData.estimatedDuration !== undefined) updateData.estimatedDuration = formData.estimatedDuration;
  if (formData.location !== undefined) updateData.location = formData.location;
  if (formData.eligibilityCriteria !== undefined) updateData.eligibilityCriteria = formData.eligibilityCriteria;

  // Si estaba REJECTED y se edita, volver a DRAFT
  if (existing.status === 'REJECTED') {
    updateData.status = 'DRAFT';
    updateData.rejectionReason = null;
  }

  const study = await prisma.study.update({
    where: { id: studyId },
    data: updateData,
  });

  await logAuditEvent({
    userId: session.user.id,
    action: 'UPDATE_STUDY',
    entityType: 'Study',
    entityId: study.id,
    previousState,
    newState: {
      title: study.title,
      status: study.status,
    },
  });

  return { success: true, data: study };
}

/**
 * Elimina un estudio.
 * Solo el IP dueño puede eliminar, y solo si está en DRAFT.
 *
 * @param studyId - ID del estudio a eliminar
 */
export async function deleteStudy(studyId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.DELETE_OWN_STUDY);

  const study = await prisma.study.findUnique({
    where: { id: studyId },
    include: {
      _count: { select: { participations: true } },
    },
  });

  if (!study) {
    return { success: false, error: 'Estudio no encontrado' };
  }

  if (study.principalInvestigatorId !== session.user.id) {
    return { success: false, error: 'Solo el investigador principal puede eliminar este estudio' };
  }

  if (study.status !== 'DRAFT') {
    return { success: false, error: 'Solo se pueden eliminar estudios en estado DRAFT' };
  }

  if (study._count.participations > 0) {
    return { success: false, error: 'No se puede eliminar un estudio con participaciones registradas' };
  }

  // Eliminar en cascada: prescreen, colaboradores, timeslots, waitlist
  await prisma.prescreenAnswer.deleteMany({
    where: { question: { studyId } },
  });
  await prisma.prescreenQuestion.deleteMany({ where: { studyId } });
  await prisma.waitlistEntry.deleteMany({
    where: { timeslot: { studyId } },
  });
  await prisma.timeslot.deleteMany({ where: { studyId } });
  await prisma.studyCollaborator.deleteMany({ where: { studyId } });
  await prisma.study.delete({ where: { id: studyId } });

  await logAuditEvent({
    userId: session.user.id,
    action: 'DELETE_STUDY',
    entityType: 'Study',
    entityId: studyId,
    previousState: { title: study.title, status: study.status },
  });

  return { success: true };
}

/**
 * Envía un estudio para aprobación del Admin.
 * Cambia el estado de DRAFT a PENDING_APPROVAL.
 *
 * @param studyId - ID del estudio a enviar
 */
export async function submitStudyForApproval(studyId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.SUBMIT_STUDY_FOR_APPROVAL);

  const study = await prisma.study.findUnique({
    where: { id: studyId },
  });

  if (!study) {
    return { success: false, error: 'Estudio no encontrado' };
  }

  if (study.principalInvestigatorId !== session.user.id) {
    return { success: false, error: 'Solo el investigador principal puede enviar este estudio a aprobación' };
  }

  if (study.status !== 'DRAFT') {
    return { success: false, error: `El estudio debe estar en DRAFT para enviarse a aprobación (actual: ${study.status})` };
  }

  const updated = await prisma.study.update({
    where: { id: studyId },
    data: { status: 'PENDING_APPROVAL' },
  });

  await logAuditEvent({
    userId: session.user.id,
    action: 'SUBMIT_STUDY_FOR_APPROVAL',
    entityType: 'Study',
    entityId: studyId,
    previousState: { status: 'DRAFT' },
    newState: { status: 'PENDING_APPROVAL' },
  });

  // Notificar a todos los administradores activos
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', active: true },
    select: { name: true, email: true },
  });

  for (const admin of admins) {
    await sendStudyPendingApproval(
      admin.email,
      admin.name,
      study.title,
      session.user.name || 'Investigador'
    );
  }

  return { success: true, data: updated };
}

/**
 * Aprueba o rechaza un estudio (solo ADMIN).
 *
 * @param formData - Datos de la decisión
 * @returns El estudio actualizado
 */
export async function reviewStudy(formData: {
  studyId: string;
  decision: 'APPROVE' | 'REJECT';
  rejectionReason?: string;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.APPROVE_STUDIES);

  // Validar datos
  const parsed = studyApprovalSchema.safeParse(formData);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || 'Datos inválidos';
    return { success: false, error: firstError };
  }

  const study = await prisma.study.findUnique({
    where: { id: parsed.data.studyId },
  });

  if (!study) {
    return { success: false, error: 'Estudio no encontrado' };
  }

  if (study.status !== 'PENDING_APPROVAL') {
    return { success: false, error: `Solo se pueden revisar estudios en PENDING_APPROVAL (actual: ${study.status})` };
  }

  const isApproval = parsed.data.decision === 'APPROVE';
  const newStatus = isApproval ? 'ACTIVE' : 'REJECTED';

  const updated = await prisma.study.update({
    where: { id: parsed.data.studyId },
    data: {
      status: newStatus,
      approvedById: isApproval ? session.user.id : null,
      approvedAt: isApproval ? new Date() : null,
      rejectionReason: isApproval ? null : (parsed.data.rejectionReason || ''),
    },
  });

  await logAuditEvent({
    userId: session.user.id,
    action: isApproval ? 'APPROVE_STUDY' : 'REJECT_STUDY',
    entityType: 'Study',
    entityId: study.id,
    previousState: { status: 'PENDING_APPROVAL' },
    newState: {
      status: newStatus,
      rejectionReason: parsed.data.rejectionReason,
    },
  });

  return { success: true, data: updated };
}

/**
 * Cierra un estudio activo (IP o Admin).
 *
 * @param studyId - ID del estudio
 */
export async function closeStudy(studyId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;

  const study = await prisma.study.findUnique({
    where: { id: studyId },
  });

  if (!study) {
    return { success: false, error: 'Estudio no encontrado' };
  }

  // Solo IP dueño o ADMIN puede cerrar
  const isOwner = study.principalInvestigatorId === session.user.id;
  const isAdmin = role === 'ADMIN';
  if (!isOwner && !isAdmin) {
    return { success: false, error: 'No tiene permiso para cerrar este estudio' };
  }

  if (study.status !== 'ACTIVE') {
    return { success: false, error: 'Solo se pueden cerrar estudios en estado ACTIVE' };
  }

  const updated = await prisma.study.update({
    where: { id: studyId },
    data: { status: 'CLOSED' },
  });

  await logAuditEvent({
    userId: session.user.id,
    action: 'CLOSE_STUDY',
    entityType: 'Study',
    entityId: studyId,
    previousState: { status: 'ACTIVE' },
    newState: { status: 'CLOSED' },
  });

  return { success: true, data: updated };
}
