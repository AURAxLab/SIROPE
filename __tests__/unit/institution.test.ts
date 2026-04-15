import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getInstitutionConfig,
  updateInstitutionConfig,
  isSetupComplete,
  invalidateInstitutionCache,
} from '@/lib/institution';
import prisma from '@/lib/prisma';

vi.mock('@/lib/prisma', () => {
  return {
    default: {
      institutionConfig: {
        findUnique: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn(),
      },
    },
  };
});

describe('Institution Config', () => {
  const mockConfig = {
    id: 'singleton',
    setupComplete: true,
    name: 'Test Institution',
    authMode: 'CREDENTIALS',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    invalidateInstitutionCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getInstitutionConfig', () => {
    it('fetches config from db when cache is empty', async () => {
      vi.mocked(prisma.institutionConfig.findUnique).mockResolvedValue(mockConfig as any);

      const result = await getInstitutionConfig();

      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockConfig);
    });

    it('creates default config when none exists', async () => {
      vi.mocked(prisma.institutionConfig.findUnique).mockResolvedValue(null);
      const createdConfig = { id: 'singleton', setupComplete: false };
      vi.mocked(prisma.institutionConfig.create).mockResolvedValue(createdConfig as any);

      const result = await getInstitutionConfig();

      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.institutionConfig.create).toHaveBeenCalledWith({
        data: { id: 'singleton' },
      });
      expect(result).toEqual(createdConfig);
    });

    it('uses cache on subsequent calls within TTL', async () => {
      vi.mocked(prisma.institutionConfig.findUnique).mockResolvedValue(mockConfig as any);

      await getInstitutionConfig(); // First call populates cache
      const result = await getInstitutionConfig(); // Second call should use cache

      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockConfig);
    });

    it('bypasses cache when forceRefresh is true', async () => {
      vi.mocked(prisma.institutionConfig.findUnique).mockResolvedValue(mockConfig as any);

      await getInstitutionConfig(); // Populate cache
      await getInstitutionConfig(true); // Force refresh

      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(2);
    });

    it('invalidates cache and queries db after TTL expires', async () => {
      vi.mocked(prisma.institutionConfig.findUnique).mockResolvedValue(mockConfig as any);

      await getInstitutionConfig(); // Populate cache
      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(1);

      // Advance time by 5 minutes + 1ms
      vi.advanceTimersByTime(5 * 60 * 1000 + 1);

      await getInstitutionConfig(); // TTL expired, should query DB again
      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateInstitutionConfig', () => {
    it('updates config and invalidates cache', async () => {
      const updateData = { name: 'New Name' };
      const updatedConfig = { ...mockConfig, ...updateData };
      vi.mocked(prisma.institutionConfig.upsert).mockResolvedValue(updatedConfig as any);

      const result = await updateInstitutionConfig(updateData);

      expect(prisma.institutionConfig.upsert).toHaveBeenCalledWith({
        where: { id: 'singleton' },
        update: updateData,
        create: { id: 'singleton', ...updateData },
      });
      expect(result).toEqual(updatedConfig);

      // Cache should be updated, next get should return the updated config without querying DB
      vi.mocked(prisma.institutionConfig.findUnique).mockClear();
      const cachedResult = await getInstitutionConfig();
      expect(cachedResult).toEqual(updatedConfig);
      expect(prisma.institutionConfig.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('isSetupComplete', () => {
    it('returns true when setup is complete', async () => {
      vi.mocked(prisma.institutionConfig.findUnique).mockResolvedValue(mockConfig as any);

      const result = await isSetupComplete();

      expect(result).toBe(true);
    });

    it('returns false when setup is incomplete', async () => {
      vi.mocked(prisma.institutionConfig.findUnique).mockResolvedValue({
        ...mockConfig,
        setupComplete: false,
      } as any);

      const result = await isSetupComplete();

      expect(result).toBe(false);
    });
  });

  describe('invalidateInstitutionCache', () => {
    it('clears the cache so next get calls db', async () => {
      vi.mocked(prisma.institutionConfig.findUnique).mockResolvedValue(mockConfig as any);

      await getInstitutionConfig(); // Populate
      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(1);

      invalidateInstitutionCache();

      await getInstitutionConfig(); // Should hit DB again
      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(2);
    });
  });
});
