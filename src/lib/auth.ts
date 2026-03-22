/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Autenticación — Configuración NextAuth.js v5
 * Implementa autenticación con email/contraseña usando bcrypt.
 * La arquitectura está preparada para integrar LDAP/SSO en el futuro
 * mediante el módulo auth-adapter.ts.
 */

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcryptjs from 'bcryptjs';
import prisma from './prisma';
import { loginSchema } from './validations';
import type { Role } from './validations';

/**
 * Configuración principal de NextAuth.
 * Exporta los handlers, funciones de auth, signIn y signOut.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'Credenciales',
      credentials: {
        email: { label: 'Correo electrónico', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },

      /**
       * Valida las credenciales del usuario contra la base de datos.
       * Retorna el usuario si las credenciales son válidas, null si no.
       */
      async authorize(credentials) {
        // Validar formato de entrada con Zod
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;

        // Buscar usuario por email
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user) {
          return null;
        }

        // Verificar que el usuario esté activo
        if (!user.active) {
          return null;
        }

        // Verificar contraseña con bcrypt
        const isPasswordValid = await bcryptjs.compare(password, user.passwordHash);
        if (!isPasswordValid) {
          return null;
        }

        // Retornar datos del usuario (sin passwordHash)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as Role,
        };
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 horas
  },

  pages: {
    signIn: '/login',
  },

  callbacks: {
    /**
     * Agrega el rol y el ID del usuario al token JWT.
     * Esto permite verificar permisos sin consultar la BD en cada request.
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: Role }).role;
      }
      return token;
    },

    /**
     * Expone el rol y el ID del usuario en la sesión del cliente.
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role: Role }).role = token.role as Role;
      }
      return session;
    },
  },
});

// ============================================================
// Funciones auxiliares de autenticación
// ============================================================

/** Costo del hashing bcrypt. 12 es un buen balance seguridad/rendimiento. */
const BCRYPT_COST = 12;

/**
 * Hashea una contraseña usando bcrypt con costo 12.
 *
 * @param password - Contraseña en texto plano
 * @returns Hash bcrypt de la contraseña
 */
export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, BCRYPT_COST);
}

/**
 * Verifica una contraseña contra un hash bcrypt.
 *
 * @param password - Contraseña en texto plano
 * @param hash - Hash bcrypt almacenado
 * @returns true si la contraseña coincide
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}
