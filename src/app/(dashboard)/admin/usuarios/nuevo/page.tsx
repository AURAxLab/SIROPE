/**
 * SIROPE — Nuevo Usuario (Admin)
 * Formulario para crear un nuevo usuario.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import type { Role } from '@/lib/validations';
import NuevoUsuarioForm from './NuevoUsuarioForm';

export default async function NuevoUsuarioPage() {
  const session = await auth();
  if (!session?.user || (session.user.role as Role) !== 'ADMIN') redirect('/login');

  return (
    <div className="animate-fade-in">
      <NuevoUsuarioForm />
    </div>
  );
}
