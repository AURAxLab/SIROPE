/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * API Route — NextAuth Handlers
 * Expone los endpoints de autenticación de NextAuth (login, logout, session).
 */

import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
