/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Página Raíz — Redireccionamiento
 * Redirige al dashboard correspondiente según el rol del usuario,
 * o a la página de login si no hay sesión.
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getDashboardPathForRole } from '@/lib/permissions';
import type { Role } from '@/lib/validations';

/**
 * Página raíz: redirige automáticamente según sesión y rol.
 */
export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const role = session.user.role as Role;
  const dashboardPath = getDashboardPathForRole(role);
  redirect(dashboardPath);
}
