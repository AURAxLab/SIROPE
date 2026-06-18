/**
 * SIROPE — Perfil de Usuario
 * Muestra información del usuario y permite cambiar contraseña.
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { ROLE_LABELS } from '@/lib/permissions';
import type { Role } from '@/lib/validations';
import ChangePasswordForm from './ChangePasswordForm';

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ changePassword?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const params = await searchParams;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      studentId: true,
      createdAt: true,
      mustChangePassword: true,
    },
  });

  if (!user) {
    redirect('/login');
  }

  const role = user.role as Role;
  const roleLabel = ROLE_LABELS[role] || 'Usuario';
  const autoFocusPassword = params.changePassword === 'true' || user.mustChangePassword;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Mi Perfil 👤</h1>
      </div>

      {user.mustChangePassword && (
        <div className="alert alert-warning" style={{ marginBottom: 24 }}>
          ⚠️ Su contraseña fue restablecida por un administrador. Debe cambiarla antes de continuar.
        </div>
      )}

      {/* User info card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 20 }}>Información Personal</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          <div className="form-group">
            <span className="form-label">Nombre</span>
            <span style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{user.name}</span>
          </div>
          <div className="form-group">
            <span className="form-label">Correo electrónico</span>
            <span style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{user.email}</span>
          </div>
          <div className="form-group">
            <span className="form-label">Rol</span>
            <span className={`badge badge-primary`}>{roleLabel}</span>
          </div>
          {user.studentId && (
            <div className="form-group">
              <span className="form-label">Carné</span>
              <span style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{user.studentId}</span>
            </div>
          )}
          <div className="form-group">
            <span className="form-label">Miembro desde</span>
            <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
              {user.createdAt.toLocaleDateString('es-CR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Change password section */}
      <div className="card">
        <h2 style={{ marginBottom: 20 }}>Cambiar Contraseña 🔒</h2>
        <ChangePasswordForm autoFocus={autoFocusPassword} />
      </div>
    </div>
  );
}
