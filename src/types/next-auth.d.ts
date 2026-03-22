/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Tipos extendidos de NextAuth
 * Extiende las interfaces de NextAuth para incluir el rol y el ID
 * del usuario en la sesión y el token JWT.
 */

import type { Role } from '@/lib/validations';

declare module 'next-auth' {
  interface User {
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
  }
}
