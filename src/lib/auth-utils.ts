/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Utilidades de Autenticación
 * Funciones auxiliares para hash y verificación de contraseñas.
 * Usa bcryptjs (compatible con Edge Runtime).
 */

import bcrypt from 'bcryptjs';

/** Número de rondas de salt para bcrypt. */
const SALT_ROUNDS = 12;

/**
 * Genera un hash seguro de una contraseña.
 *
 * @param password - Contraseña en texto plano
 * @returns Hash bcrypt de la contraseña
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifica si una contraseña coincide con su hash.
 *
 * @param password - Contraseña en texto plano
 * @param hash - Hash bcrypt almacenado
 * @returns true si coincide, false si no
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
