/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Autenticación — Configuración NextAuth.js v5
 * Soporta dos modos de autenticación:
 * - CREDENTIALS: email/contraseña contra la base de datos local (bcrypt)
 * - LDAP: autenticación contra un servidor LDAP/Active Directory externo
 *
 * El modo se configura en Administración → Configuración → authMode.
 * Los admins locales siempre pueden autenticarse con credentials como fallback.
 */

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcryptjs from 'bcryptjs';
import prisma from './prisma';
import { loginSchema } from './validations';
import type { Role } from './validations';
import { parseLdapConfig, authenticateWithLDAP } from './ldap';

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
       * Valida las credenciales del usuario.
       * Si authMode es LDAP, primero intenta LDAP; si falla, intenta
       * login local para admins como fallback.
       * Si authMode es CREDENTIALS, usa bcrypt contra la BD.
       */
      async authorize(credentials) {
        // Validar formato de entrada con Zod
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;
        const normalizedEmail = email.toLowerCase();

        // Leer configuración de autenticación
        let authMode = 'CREDENTIALS';
        let ldapConfigJson: string | null = null;
        try {
          const config = await prisma.institutionConfig.findUnique({
            where: { id: 'singleton' },
            select: { authMode: true, ldapConfig: true },
          });
          if (config) {
            authMode = config.authMode;
            ldapConfigJson = config.ldapConfig;
          }
        } catch {
          // Si no hay config, usar credentials por defecto
        }

        // ============================================================
        // Modo LDAP
        // ============================================================
        if (authMode === 'LDAP') {
          const ldapConfig = parseLdapConfig(ldapConfigJson);

          if (ldapConfig) {
            const ldapUser = await authenticateWithLDAP(ldapConfig, normalizedEmail, password);

            if (ldapUser) {
              // Auto-provisioning: crear o actualizar usuario en la BD local
              let user = await prisma.user.findUnique({
                where: { email: normalizedEmail },
              });

              if (!user) {
                // Crear usuario con rol ESTUDIANTE por defecto
                user = await prisma.user.create({
                  data: {
                    email: normalizedEmail,
                    name: ldapUser.name,
                    passwordHash: '', // No se usa con LDAP
                    role: 'ESTUDIANTE',
                    studentId: ldapUser.studentId,
                    active: true,
                  },
                });
                console.log(`[AUTH] Auto-provisioned LDAP user: ${normalizedEmail}`);
              } else {
                // Actualizar nombre si cambió en LDAP
                if (user.name !== ldapUser.name) {
                  await prisma.user.update({
                    where: { id: user.id },
                    data: { name: ldapUser.name },
                  });
                }
              }

              if (!user.active) {
                return null; // Usuario desactivado por el admin
              }

              return {
                id: user.id,
                email: user.email,
                name: ldapUser.name || user.name,
                role: user.role as Role,
              };
            }
          }

          // Fallback: permitir login local para ADMIN (siempre)
          const adminUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
          });
          if (adminUser && adminUser.role === 'ADMIN' && adminUser.active && adminUser.passwordHash) {
            const valid = await bcryptjs.compare(password, adminUser.passwordHash);
            if (valid) {
              return {
                id: adminUser.id,
                email: adminUser.email,
                name: adminUser.name,
                role: adminUser.role as Role,
              };
            }
          }

          return null;
        }

        // ============================================================
        // Modo CREDENTIALS (por defecto)
        // ============================================================
        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!user || !user.active) {
          return null;
        }

        const isPasswordValid = await bcryptjs.compare(password, user.passwordHash);
        if (!isPasswordValid) {
          return null;
        }

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
 */
export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, BCRYPT_COST);
}

/**
 * Verifica una contraseña contra un hash bcrypt.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}
