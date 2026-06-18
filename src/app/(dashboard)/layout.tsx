/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Layout (dashboard) — Wrapper autenticado con sidebar
 * Este layout envuelve todas las páginas protegidas.
 * Verifica la sesión y muestra el sidebar con el contenido principal.
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/permissions';
import Sidebar from '@/components/Sidebar';
import type { Role } from '@/lib/validations';
import prisma from '@/lib/prisma';
import styles from './dashboard.module.css';

/**
 * Layout del dashboard autenticado.
 * Redirige a /login si no hay sesión.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Forzar cambio de contraseña si fue reseteada por admin
  const mustChangePassword = (session.user as { mustChangePassword?: boolean }).mustChangePassword;
  if (mustChangePassword) {
    const { headers: getHeaders } = await import('next/headers');
    const headersList = await getHeaders();
    const pathname = headersList.get('x-next-url') || headersList.get('x-invoke-path') || '';
    // Only allow the profile page; redirect everything else
    if (!pathname.startsWith('/perfil')) {
      redirect('/perfil?changePassword=true');
    }
  }

  const role = session.user.role as Role;
  const _roleLabel = ROLE_LABELS[role] || 'Usuario';

  const logoConfig = await prisma.systemConfig.findUnique({ where: { key: 'INSTITUTION_LOGOURL' } });
  const logoUrl = logoConfig?.value || '/logo-institucion.svg';

  return (
    <div className={styles.layout}>
      <Sidebar
        userName={session.user.name || 'Usuario'}
        userRole={role}
        userEmail={session.user.email || ''}
        logoUrl={logoUrl}
      />
      <main className={styles.content}>
        <div className={styles.contentInner}>
          {children}
        </div>
      </main>
    </div>
  );
}
