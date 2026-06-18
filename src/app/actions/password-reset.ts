/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Acciones de Servidor — Recuperación de Contraseña
 * Gestiona la solicitud y ejecución del restablecimiento de contraseña
 * mediante token enviado por email.
 */

'use server';

import prisma from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { forgotPasswordSchema, resetPasswordSchema } from '@/lib/validations';
import { hashPassword } from '@/lib/auth-utils';
import { sendPasswordReset } from '@/lib/email';

// ============================================================
// Tipos
// ============================================================

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================
// Solicitud de recuperación
// ============================================================

/**
 * Solicita un enlace de recuperación de contraseña.
 * Siempre devuelve éxito para no revelar si el email existe.
 *
 * @param formData - FormData con email
 */
export async function requestPasswordReset(formData: FormData): Promise<ActionResult> {
  const raw = {
    email: (formData.get('email') as string)?.trim().toLowerCase(),
  };

  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    // Don't leak validation details — always return success
    return { success: true };
  }

  const email = parsed.data.email;

  // Always return success to not leak whether the email exists
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, active: true },
    });

    if (user && user.active) {
      // Invalidar tokens anteriores (marcar como usados)
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      // Generar token criptográficamente seguro
      const { randomBytes } = await import('crypto');
      const tokenValue = randomBytes(32).toString('hex');

      // Token expira en 1 hora
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.passwordResetToken.create({
        data: {
          token: tokenValue,
          userId: user.id,
          expiresAt,
        },
      });

      // Construir URL de restablecimiento
      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const resetUrl = `${baseUrl}/recuperar-password/reset?token=${tokenValue}`;

      // Enviar email
      await sendPasswordReset(user.email, user.name, resetUrl);

      // Registrar auditoría
      await logAuditEvent({
        userId: user.id,
        action: 'REQUEST_PASSWORD_RESET',
        entityType: 'User',
        entityId: user.id,
        newState: { email: user.email },
      });
    }
  } catch (error) {
    // Log error but don't expose it to the user
    console.error('[PASSWORD_RESET] Error processing request:', error);
  }

  return { success: true };
}

// ============================================================
// Restablecimiento con token
// ============================================================

/**
 * Restablece la contraseña usando un token de recuperación.
 * Valida el token, verifica que no haya expirado, actualiza la contraseña.
 *
 * @param formData - FormData con token, newPassword, confirmPassword
 */
export async function resetPasswordWithToken(formData: FormData): Promise<ActionResult> {
  const raw = {
    token: formData.get('token') as string,
    password: formData.get('newPassword') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  };

  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || 'Datos inválidos';
    return { success: false, error: firstError };
  }

  // Buscar token
  const tokenRecord = await prisma.passwordResetToken.findUnique({
    where: { token: parsed.data.token },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!tokenRecord) {
    return { success: false, error: 'El enlace de recuperación no es válido.' };
  }

  if (tokenRecord.usedAt) {
    return { success: false, error: 'Este enlace ya fue utilizado.' };
  }

  if (tokenRecord.expiresAt < new Date()) {
    return { success: false, error: 'El enlace de recuperación ha expirado. Solicite uno nuevo.' };
  }

  // Hashear nueva contraseña
  const newHash = await hashPassword(parsed.data.password);

  // Actualizar contraseña y marcar token como usado (transacción)
  await prisma.$transaction([
    prisma.user.update({
      where: { id: tokenRecord.userId },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() },
    }),
  ]);

  // Registrar auditoría
  await logAuditEvent({
    userId: tokenRecord.userId,
    action: 'RESET_PASSWORD_WITH_TOKEN',
    entityType: 'User',
    entityId: tokenRecord.userId,
    newState: { email: tokenRecord.user.email },
  });

  return { success: true };
}
