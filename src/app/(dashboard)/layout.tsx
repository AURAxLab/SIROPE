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
import { getDashboardPathForRole, ROLE_LABELS } from '@/lib/permissions';
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

  const role = session.user.role as Role;
  const roleLabel = ROLE_LABELS[role] || 'Usuario';

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
