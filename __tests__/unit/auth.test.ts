import { describe, it, expect, vi } from 'vitest';

// Mock next-auth to avoid "Cannot find module 'next/server'" issues
vi.mock('next-auth', () => {
  return {
    default: vi.fn(() => ({
      handlers: {},
      auth: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    })),
  };
});
// Also mock next-auth/providers/credentials if needed
vi.mock('next-auth/providers/credentials', () => {
  return {
    default: vi.fn(),
  };
});

import { hashPassword, verifyPassword } from '@/lib/auth';

describe('Auth Helpers', () => {
  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const password = 'mySuperSecretPassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
      // bcrypt hashes typically start with $2a$, $2b$, or $2y$ and are 60 chars long
      expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
    });

    it('should generate different hashes for the same password (salting)', async () => {
      const password = 'mySuperSecretPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for a correct password', async () => {
      const password = 'mySuperSecretPassword123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should return false for an incorrect password', async () => {
      const password = 'mySuperSecretPassword123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword('wrongPassword!', hash);
      expect(isValid).toBe(false);
    });
  });
});
