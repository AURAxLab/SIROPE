import { describe, it, expect, vi } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth';

// Mock next/server and NextAuth to prevent module resolution errors
vi.mock('next/server', () => ({}));
vi.mock('next-auth', () => ({
  default: () => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));
vi.mock('next-auth/providers/credentials', () => ({
  default: vi.fn(),
}));

describe('Authentication Utilities', () => {
  describe('hashPassword', () => {
    it('should generate a valid bcrypt hash', async () => {
      const password = 'mySecretPassword123!';
      const hash = await hashPassword(password);

      // bcrypt hashes should be 60 characters long and typically start with $2a$, $2b$, or $2y$
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(60);
      expect(hash).toMatch(/^\$2[aby]\$/); // Match typical bcrypt prefixes
    });

    it('should generate different hashes for the same password due to salting', async () => {
      const password = 'mySecretPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for a valid password and hash combination', async () => {
      const password = 'mySecretPassword123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should return false for an invalid password', async () => {
      const password = 'mySecretPassword123!';
      const wrongPassword = 'wrongPassword123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });
});
