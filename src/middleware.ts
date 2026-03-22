/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Middleware — Protección de rutas y control de acceso
 * Ejecuta en Edge Runtime (sin acceso a Node.js APIs ni Prisma).
 * Usa solo el token JWT de la cookie de sesión para verificar autenticación.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/** Rutas que no requieren autenticación. */
const PUBLIC_ROUTES = ['/login', '/registro', '/recuperar-password', '/setup'];

/** Prefijos de ruta que siempre se permiten. */
const ALWAYS_ALLOWED_PREFIXES = ['/api/auth', '/_next', '/favicon'];

/** Mapeo de roles a sus rutas de dashboard permitidas. */
const ROLE_ROUTES: Record<string, string> = {
  ADMIN: '/admin',
  PROFESOR: '/profesor',
  INV_PRINCIPAL: '/investigador',
  INV_EJECUTOR: '/investigador',
  ESTUDIANTE: '/estudiante',
};

/**
 * Middleware principal de SIROPE.
 * Protege rutas por autenticación y rol sin importar Prisma.
 * Lee el token JWT directamente de la cookie.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir archivos estáticos y prefijos siempre permitidos
  const isAlwaysAllowed = ALWAYS_ALLOWED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  if (isAlwaysAllowed || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Permitir rutas públicas
  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Obtener token JWT de la cookie (Edge-compatible, sin Prisma)
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Redirigir a login si no hay sesión
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const userRole = token.role as string;
  const allowedPath = ROLE_ROUTES[userRole];

  // Redirigir raíz al dashboard del rol
  if (pathname === '/') {
    if (allowedPath) {
      return NextResponse.redirect(new URL(allowedPath, request.url));
    }
  }

  // Verificar que el usuario accede solo a su dashboard
  const dashboardPaths = Object.values(ROLE_ROUTES);
  const isAccessingDashboard = dashboardPaths.some((path) =>
    pathname.startsWith(path)
  );

  if (isAccessingDashboard && allowedPath && !pathname.startsWith(allowedPath)) {
    return NextResponse.redirect(new URL(allowedPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
