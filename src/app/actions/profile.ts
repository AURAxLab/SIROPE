/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Acciones de Servidor — Perfil de Usuario
 * Gestiona el cambio de contraseña y actualización de perfil propio.
 */

'use server';

import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { changePasswordSchema } from '@/lib/validations';
import { hashPassword, verifyPassword } from '@/lib/auth-utils';

// ============================================================
// Tipos
// ============================================================

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================
// Cambio de contraseña
// ============================================================

/**
 * Cambia la contraseña del usuario autenticado.
 * Verifica la contraseña actual, valida la nueva con Zod,
 * hashea y actualiza. También limpia el flag mustChangePassword.
 *
 * @param formData - FormData con currentPassword, newPassword, confirmPassword
 */
export async function changeOwnPassword(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'No autenticado' };
  }

  const raw = {
    currentPassword: formData.get('currentPassword') as string,
    newPassword: formData.get('newPassword') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  };

  // Validar con Zod
  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || 'Datos inválidos';
    return { success: false, error: firstError };
  }

  // Obtener usuario actual
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, passwordHash: true, email: true },
  });

  if (!user) {
    return { success: false, error: 'Usuario no encontrado' };
  }

  // Verificar contraseña actual
  const isCurrentValid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!isCurrentValid) {
    return { success: false, error: 'La contraseña actual es incorrecta' };
  }

  // No permitir reusar la misma contraseña
  const isSamePassword = await verifyPassword(parsed.data.newPassword, user.passwordHash);
  if (isSamePassword) {
    return { success: false, error: 'La nueva contraseña debe ser diferente a la actual' };
  }

  // Hashear y actualizar
  const newHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHash,
      mustChangePassword: false,
    },
  });

  // Registrar auditoría
  await logAuditEvent({
    userId: session.user.id,
    action: 'CHANGE_OWN_PASSWORD',
    entityType: 'User',
    entityId: user.id,
    newState: { email: user.email },
  });

  return { success: true };
}

// ============================================================
// Actualización de perfil
// ============================================================

/**
 * Actualiza el perfil del usuario autenticado.
 * Solo permite cambiar el nombre. Cambios de email requieren admin.
 *
 * @param formData - FormData con name
 */
export async function updateOwnProfile(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'No autenticado' };
  }

  const name = (formData.get('name') as string)?.trim();
  if (!name || name.length < 2) {
    return { success: false, error: 'El nombre debe tener al menos 2 caracteres' };
  }
  if (name.length > 100) {
    return { success: false, error: 'El nombre no puede exceder 100 caracteres' };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    return { success: false, error: 'Usuario no encontrado' };
  }

  const previousName = user.name;

  await prisma.user.update({
    where: { id: user.id },
    data: { name },
  });

  await logAuditEvent({
    userId: session.user.id,
    action: 'UPDATE_OWN_PROFILE',
    entityType: 'User',
    entityId: user.id,
    previousState: { name: previousName },
    newState: { name },
  });

  return { success: true };
}
