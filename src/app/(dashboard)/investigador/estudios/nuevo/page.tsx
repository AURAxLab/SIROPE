/**
 * SIROPE — Nuevo Estudio (Wrapper)
 * Server component que obtiene el semestre activo y renderiza el formulario.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import type { Role } from '@/lib/validations';
import NuevoEstudioForm from './NuevoEstudioForm';

export default async function NuevoEstudioPage() {
  const session = await auth();
  if (!session?.user || (session.user.role as Role) !== 'INV_PRINCIPAL') {
    redirect('/login');
  }

  const activeSemester = await prisma.semester.findFirst({
    where: { active: true },
    select: { id: true, name: true },
  });

  if (!activeSemester) {
    return (
      <div className="animate-fade-in">
        <nav style={{ marginBottom: 20 }}>
          <a href="/investigador/estudios" style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none' }}>
            ← Volver a mis estudios
          </a>
        </nav>
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <p className="empty-state-text">No hay un semestre activo. Solicite al administrador que active uno.</p>
        </div>
      </div>
    );
  }

  return <NuevoEstudioForm semesterId={activeSemester.id} semesterName={activeSemester.name} />;
}
