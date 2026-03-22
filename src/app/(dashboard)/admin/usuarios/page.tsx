/**
 * SIROPE — Gestión de Usuarios (Admin)
 * Lista, crear, activar/desactivar usuarios.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import type { Role } from '@/lib/validations';
import UserTable from './UserTable';

export default async function UsuariosPage() {
  const session = await auth();
  if (!session?.user || (session.user.role as Role) !== 'ADMIN') redirect('/login');

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, active: true, studentId: true, createdAt: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    take: 25,
  });

  const totalUsers = await prisma.user.count();

  // Serialize dates for client component
  const serializedUsers = users.map(u => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 className="page-title">Usuarios 👥</h1>
        <a href="/admin/usuarios/nuevo" className="btn btn-primary">+ Nuevo Usuario</a>
      </div>

      <UserTable
        currentUserId={session.user.id}
        initialUsers={serializedUsers}
        initialTotal={totalUsers}
      />
    </div>
  );
}
