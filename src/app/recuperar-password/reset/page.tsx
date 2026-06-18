/**
 * SIROPE — Restablecer Contraseña con Token
 * Página pública para ingresar nueva contraseña después de recibir
 * el enlace de recuperación por email.
 */

import ResetPasswordForm from './ResetPasswordForm';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token || '';

  return <ResetPasswordForm token={token} />;
}
