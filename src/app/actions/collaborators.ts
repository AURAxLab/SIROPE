/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Acciones de Servidor — Colaboradores de Estudio
 * Gestiona la asignación de Investigadores Ejecutores (IE) a estudios.
 * Solo el Investigador Principal (IP) puede agregar/remover colaboradores.
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
 * Obtiene los colaboradores de un estudio.
 *
 * @param studyId - ID del estudio
 * @returns Lista de colaboradores con datos del usuario
 */
export async function getCollaborators(studyId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const study = await prisma.study.findUnique({
    where: { id: studyId },
    select: { principalInvestigatorId: true },
  });

  if (!study) {
    return { success: false, error: 'Estudio no encontrado' };
  }

  const collaborators = await prisma.studyCollaborator.findMany({
    where: { studyId },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: { addedAt: 'asc' },
  });

  return { success: true, data: collaborators };
}

// ============================================================
// Escritura
// ============================================================

/**
 * Agrega un Investigador Ejecutor como colaborador de un estudio.
 * Solo el IP dueño del estudio puede agregar colaboradores.
 *
 * @param studyId - ID del estudio
 * @param userId - ID del usuario a agregar (debe ser INV_EJECUTOR)
 * @returns El colaborador creado
 */
export async function addCollaborator(
  studyId: string,
  userId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.MANAGE_COLLABORATORS);

  // Verificar que el estudio existe y pertenece al IP
  const study = await prisma.study.findUnique({
    where: { id: studyId },
  });

  if (!study) {
    return { success: false, error: 'Estudio no encontrado' };
  }

  if (study.principalInvestigatorId !== session.user.id) {
    return { success: false, error: 'Solo el investigador principal puede gestionar colaboradores' };
  }

  // Verificar que el usuario existe y es INV_EJECUTOR
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return { success: false, error: 'Usuario no encontrado' };
  }

  if (user.role !== 'INV_EJECUTOR') {
    return { success: false, error: 'Solo se pueden agregar Investigadores Ejecutores como colaboradores' };
  }

  // Verificar que no sea ya colaborador
  const existing = await prisma.studyCollaborator.findUnique({
    where: { studyId_userId: { studyId, userId } },
  });

  if (existing) {
    return { success: false, error: 'Este investigador ya es colaborador del estudio' };
  }

  const collaborator = await prisma.studyCollaborator.create({
    data: { studyId, userId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  await logAuditEvent({
    userId: session.user.id,
    action: 'ADD_COLLABORATOR',
    entityType: 'StudyCollaborator',
    entityId: collaborator.id,
    newState: {
      studyId,
      userId,
      userName: user.name,
    },
  });

  return { success: true, data: collaborator };
}

/**
 * Remueve un colaborador de un estudio.
 * Solo el IP dueño del estudio puede remover colaboradores.
 *
 * @param studyId - ID del estudio
 * @param userId - ID del usuario a remover
 */
export async function removeCollaborator(
  studyId: string,
  userId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.MANAGE_COLLABORATORS);

  // Verificar propiedad del estudio
  const study = await prisma.study.findUnique({
    where: { id: studyId },
  });

  if (!study) {
    return { success: false, error: 'Estudio no encontrado' };
  }

  if (study.principalInvestigatorId !== session.user.id) {
    return { success: false, error: 'Solo el investigador principal puede gestionar colaboradores' };
  }

  // Buscar y eliminar el colaborador
  const collaborator = await prisma.studyCollaborator.findUnique({
    where: { studyId_userId: { studyId, userId } },
    include: {
      user: { select: { name: true } },
    },
  });

  if (!collaborator) {
    return { success: false, error: 'Colaborador no encontrado' };
  }

  await prisma.studyCollaborator.delete({
    where: { id: collaborator.id },
  });

  await logAuditEvent({
    userId: session.user.id,
    action: 'REMOVE_COLLABORATOR',
    entityType: 'StudyCollaborator',
    entityId: collaborator.id,
    previousState: {
      studyId,
      userId,
      userName: collaborator.user.name,
    },
  });

  return { success: true };
}

/**
 * Busca Investigadores Ejecutores disponibles para agregar como colaboradores.
 * Excluye los que ya son colaboradores del estudio.
 *
 * @param studyId - ID del estudio
 * @param searchTerm - Nombre o email para buscar
 * @returns Lista de IE disponibles
 */
export async function searchAvailableCollaborators(
  studyId: string,
  searchTerm: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.MANAGE_COLLABORATORS);

  // Obtener IDs de colaboradores actuales
  const existingCollaborators = await prisma.studyCollaborator.findMany({
    where: { studyId },
    select: { userId: true },
  });
  const existingIds = existingCollaborators.map((c) => c.userId);

  // Buscar IE que no sean colaboradores actuales
  const users = await prisma.user.findMany({
    where: {
      role: 'INV_EJECUTOR',
      active: true,
      id: { notIn: existingIds },
      OR: [
        { name: { contains: searchTerm } },
        { email: { contains: searchTerm } },
      ],
    },
    select: { id: true, name: true, email: true },
    take: 10,
  });

  return { success: true, data: users };
}
