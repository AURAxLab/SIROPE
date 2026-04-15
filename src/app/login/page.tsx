/**
 * SIROPE Login Page (Server Component)
 * Obtiene configuraciones dinámicas de logo y universidad y envuelve al LoginForm cliente.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import LoginForm from './LoginForm';

export default async function LoginPage() {
  const session = await auth();

  // Redirect if already logged in
  if (session?.user) {
    redirect('/');
  }

  // Cargar nombre de institución y logo dinámicamente
  const configs = await prisma.systemConfig.findMany({
    where: {
      key: {
        in: ['INSTITUTION_LOGOURL', 'INSTITUTION_UNIVERSITYNAME'],
      },
    },
  });

  const logoUrl = configs.find((c) => c.key === 'INSTITUTION_LOGOURL')?.value || '/logo-institucion.svg';
  const universityName = configs.find((c) => c.key === 'INSTITUTION_UNIVERSITYNAME')?.value || 'Universidad de Costa Rica';

  return <LoginForm logoUrl={logoUrl} universityName={universityName} />;
}
