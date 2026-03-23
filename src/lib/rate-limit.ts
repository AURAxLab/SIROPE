/**
 * SIROPE — Rate Limiter
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Limitador de tasa en memoria para proteger endpoints sensibles.
 * Implementa ventana deslizante con bloqueo temporal.
 *
 * Uso principal: login (5 intentos en 15 minutos).
 */

// ============================================================
// Tipos
// ============================================================

interface RateLimitEntry {
  /** Timestamps de los intentos dentro de la ventana. */
  attempts: number[];
  /** Timestamp de cuándo se levanta el bloqueo (0 = no bloqueado). */
  blockedUntil: number;
}

interface RateLimitConfig {
  /** Máximo de intentos permitidos en la ventana. */
  maxAttempts: number;
  /** Tamaño de la ventana en milisegundos. */
  windowMs: number;
  /** Duración del bloqueo en milisegundos tras exceder el límite. */
  blockDurationMs: number;
}

// ============================================================
// Store en memoria
// ============================================================

const store = new Map<string, RateLimitEntry>();

// Limpieza periódica cada 10 minutos para evitar memory leaks
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      // Eliminar si el bloqueo ya pasó y no hay intentos recientes
      if (entry.blockedUntil < now && entry.attempts.length === 0) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
}

// ============================================================
// Configuraciones predefinidas
// ============================================================

/** Rate limit para login: 5 intentos en 15 minutos → bloqueo de 15 minutos. */
export const LOGIN_RATE_LIMIT: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,     // 15 minutos
  blockDurationMs: 15 * 60 * 1000, // 15 minutos
};

// ============================================================
// Funciones
// ============================================================

/**
 * Resultado de una verificación de rate limit.
 */
export interface RateLimitResult {
  /** Si se permite el intento. */
  allowed: boolean;
  /** Intentos restantes antes del bloqueo. */
  remaining: number;
  /** Segundos hasta que se levante el bloqueo (0 si no está bloqueado). */
  retryAfterSeconds: number;
}

/**
 * Verifica si una clave (email, IP) tiene permitido realizar un intento.
 * Si no, retorna el tiempo restante de bloqueo.
 *
 * @param key - Identificador único (email, IP, o combinación)
 * @param config - Configuración del rate limit
 * @returns Resultado con allowed, remaining, y retryAfterSeconds
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  let entry = store.get(key);

  // Crear entrada si no existe
  if (!entry) {
    entry = { attempts: [], blockedUntil: 0 };
    store.set(key, entry);
  }

  // ¿Está bloqueado?
  if (entry.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil((entry.blockedUntil - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  // Limpiar intentos fuera de la ventana
  const windowStart = now - config.windowMs;
  entry.attempts = entry.attempts.filter((t) => t > windowStart);

  // ¿Excedió el límite?
  if (entry.attempts.length >= config.maxAttempts) {
    entry.blockedUntil = now + config.blockDurationMs;
    entry.attempts = [];
    const retryAfterSeconds = Math.ceil(config.blockDurationMs / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  // Permitido
  return {
    allowed: true,
    remaining: config.maxAttempts - entry.attempts.length,
    retryAfterSeconds: 0,
  };
}

/**
 * Registra un intento fallido para una clave.
 * Debe llamarse después de un login fallido.
 *
 * @param key - Identificador único
 */
export function recordFailedAttempt(key: string): void {
  let entry = store.get(key);
  if (!entry) {
    entry = { attempts: [], blockedUntil: 0 };
    store.set(key, entry);
  }
  entry.attempts.push(Date.now());
}

/**
 * Limpia los intentos de una clave (después de un login exitoso).
 *
 * @param key - Identificador único
 */
export function clearAttempts(key: string): void {
  store.delete(key);
}
