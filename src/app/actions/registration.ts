/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Acciones de Servidor — Registro de Estudiantes
 * Gestiona el auto-registro de estudiantes en el sistema.
 */

'use server';

import prisma from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { registerStudentSchema } from '@/lib/validations';
import { hashPassword } from '@/lib/auth-utils';

// ============================================================
// Tipos
// ============================================================

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================
// Registro de estudiante
// ============================================================

/**
 * Registra un nuevo estudiante en el sistema.
 * Valida datos con Zod, verifica duplicados (email y carné),
 * hashea la contraseña y crea el usuario con rol ESTUDIANTE.
 *
 * @param formData - FormData con name, email, studentId, password, confirmPassword
 */
export async function registerStudent(formData: FormData): Promise<ActionResult> {
  const raw = {
    name: (formData.get('name') as string)?.trim(),
    email: (formData.get('email') as string)?.trim().toLowerCase(),
    studentId: (formData.get('studentId') as string)?.trim().toUpperCase(),
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  };

  // Validar con Zod
  const parsed = registerStudentSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || 'Datos inválidos';
    return { success: false, error: firstError };
  }

  // Verificar que el email no exista
  const existingEmail = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (existingEmail) {
    return { success: false, error: 'Ya existe un usuario con ese correo electrónico' };
  }

  // Verificar que el carné no exista
  const existingStudentId = await prisma.user.findFirst({
    where: { studentId: parsed.data.studentId },
    select: { id: true },
  });
  if (existingStudentId) {
    return { success: false, error: 'Ya existe un usuario con ese carné' };
  }

  // Hashear contraseña
  const passwordHash = await hashPassword(parsed.data.password);

  // Crear usuario como ESTUDIANTE
  const newUser = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      studentId: parsed.data.studentId,
      passwordHash,
      role: 'ESTUDIANTE',
      active: true,
    },
  });

  // Registrar auditoría (usa el ID del nuevo usuario)
  await logAuditEvent({
    userId: newUser.id,
    action: 'SELF_REGISTER',
    entityType: 'User',
    entityId: newUser.id,
    newState: {
      email: newUser.email,
      studentId: newUser.studentId,
      role: 'ESTUDIANTE',
    },
  });

  return { success: true, data: { id: newUser.id } };
}
