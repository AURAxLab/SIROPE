/**
 * SIROPE — Nuevo Semestre (Admin)
 * Página para crear un nuevo semestre.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import type { Role } from '@/lib/validations';
import NuevoSemestreForm from './NuevoSemestreForm';

export default async function NuevoSemestrePage() {
  const session = await auth();
  if (!session?.user || (session.user.role as Role) !== 'ADMIN') redirect('/login');

  return (
    <div className="animate-fade-in">
      <NuevoSemestreForm />
    </div>
  );
}
