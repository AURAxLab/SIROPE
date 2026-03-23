/**
 * SIROPE — Tests: Rate Limiting
 * Verifica el limitador de tasa para login.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, recordFailedAttempt, clearAttempts } from '@/lib/rate-limit';
import type { RateLimitResult } from '@/lib/rate-limit';

// Config rápida para tests (sin esperas largas)
const TEST_CONFIG = {
  maxAttempts: 3,
  windowMs: 10000, // 10 segundos
  blockDurationMs: 5000, // 5 segundos
};

describe('Rate Limiter', () => {
  beforeEach(() => {
    clearAttempts('test@user.cr');
    clearAttempts('other@user.cr');
  });

  it('Permite el primer intento', () => {
    const result = checkRateLimit('test@user.cr', TEST_CONFIG);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(3);
    expect(result.retryAfterSeconds).toBe(0);
  });

  it('Permite hasta maxAttempts intentos', () => {
    let result: RateLimitResult;
    for (let i = 0; i < 3; i++) {
      result = checkRateLimit('test@user.cr', TEST_CONFIG);
      expect(result.allowed).toBe(true);
      recordFailedAttempt('test@user.cr');
    }
  });

  it('Bloquea después de maxAttempts intentos fallidos', () => {
    for (let i = 0; i < 3; i++) {
      recordFailedAttempt('test@user.cr');
    }
    const result = checkRateLimit('test@user.cr', TEST_CONFIG);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('clearAttempts desbloquea al usuario', () => {
    for (let i = 0; i < 3; i++) {
      recordFailedAttempt('test@user.cr');
    }
    checkRateLimit('test@user.cr', TEST_CONFIG); // Triggers block
    clearAttempts('test@user.cr');
    const result = checkRateLimit('test@user.cr', TEST_CONFIG);
    expect(result.allowed).toBe(true);
  });

  it('Usuarios diferentes son independientes', () => {
    for (let i = 0; i < 3; i++) {
      recordFailedAttempt('test@user.cr');
    }
    const blocked = checkRateLimit('test@user.cr', TEST_CONFIG);
    const free = checkRateLimit('other@user.cr', TEST_CONFIG);
    expect(blocked.allowed).toBe(false);
    expect(free.allowed).toBe(true);
  });

  it('Remaining decrementa con cada intento', () => {
    const r1 = checkRateLimit('test@user.cr', TEST_CONFIG);
    expect(r1.remaining).toBe(3);

    recordFailedAttempt('test@user.cr');
    const r2 = checkRateLimit('test@user.cr', TEST_CONFIG);
    expect(r2.remaining).toBe(2);

    recordFailedAttempt('test@user.cr');
    const r3 = checkRateLimit('test@user.cr', TEST_CONFIG);
    expect(r3.remaining).toBe(1);
  });

  it('retryAfterSeconds es positivo cuando bloqueado', () => {
    for (let i = 0; i < 3; i++) {
      recordFailedAttempt('test@user.cr');
    }
    const result = checkRateLimit('test@user.cr', TEST_CONFIG);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(5);
  });
});
