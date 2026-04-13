/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 *
 * Tests — Configuración Institucional
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getInstitutionConfig,
  updateInstitutionConfig,
  isSetupComplete,
  invalidateInstitutionCache,
} from '@/lib/institution';
import prisma from '@/lib/prisma';

// Mock de prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    institutionConfig: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

describe('Institution Config', () => {
  const mockConfig = {
    id: 'singleton',
    setupComplete: true,
    institutionName: 'Test Institution',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    invalidateInstitutionCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getInstitutionConfig', () => {
    it('debe devolver la configuración existente de la base de datos', async () => {
      vi.mocked(prisma.institutionConfig.findUnique).mockResolvedValueOnce(mockConfig as any);

      const config = await getInstitutionConfig();

      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledWith({
        where: { id: 'singleton' },
      });
      expect(prisma.institutionConfig.create).not.toHaveBeenCalled();
      expect(config).toEqual(mockConfig);
    });

    it('debe crear una nueva configuración si no existe', async () => {
      const newConfig = { ...mockConfig, setupComplete: false };
      vi.mocked(prisma.institutionConfig.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.institutionConfig.create).mockResolvedValueOnce(newConfig as any);

      const config = await getInstitutionConfig();

      expect(prisma.institutionConfig.findUnique).toHaveBeenCalled();
      expect(prisma.institutionConfig.create).toHaveBeenCalledWith({
        data: { id: 'singleton' },
      });
      expect(config).toEqual(newConfig);
    });

    it('debe usar el caché en llamadas consecutivas', async () => {
      vi.mocked(prisma.institutionConfig.findUnique).mockResolvedValueOnce(mockConfig as any);

      const config1 = await getInstitutionConfig();
      const config2 = await getInstitutionConfig();

      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(1);
      expect(config1).toEqual(mockConfig);
      expect(config2).toEqual(mockConfig);
    });

    it('debe ignorar el caché si forceRefresh es true', async () => {
      vi.mocked(prisma.institutionConfig.findUnique).mockResolvedValue(mockConfig as any);

      await getInstitutionConfig(); // primera llamada carga el caché
      await getInstitutionConfig(true); // segunda llamada ignora el caché

      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(2);
    });

    it('debe invalidar el caché después del TTL', async () => {
      vi.useFakeTimers();

      vi.mocked(prisma.institutionConfig.findUnique).mockResolvedValue(mockConfig as any);

      await getInstitutionConfig(); // primera llamada carga el caché
      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(1);

      // Avanzar el tiempo más allá del TTL (5 minutos)
      vi.advanceTimersByTime(5 * 60 * 1000 + 1);

      await getInstitutionConfig(); // debería hacer una nueva consulta
      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateInstitutionConfig', () => {
    it('debe actualizar la configuración y actualizar el caché', async () => {
      const updateData = { institutionName: 'New Name' };
      const updatedConfig = { ...mockConfig, ...updateData };

      vi.mocked(prisma.institutionConfig.upsert).mockResolvedValueOnce(updatedConfig as any);

      const result = await updateInstitutionConfig(updateData);

      expect(prisma.institutionConfig.upsert).toHaveBeenCalledWith({
        where: { id: 'singleton' },
        update: updateData,
        create: { id: 'singleton', ...updateData },
      });
      expect(result).toEqual(updatedConfig);

      // Verificar que el caché fue actualizado simulando una llamada a getInstitutionConfig
      vi.mocked(prisma.institutionConfig.findUnique).mockClear();
      const cachedResult = await getInstitutionConfig();
      expect(prisma.institutionConfig.findUnique).not.toHaveBeenCalled();
      expect(cachedResult).toEqual(updatedConfig);
    });
  });

  describe('isSetupComplete', () => {
    it('debe devolver true si el setup está completado', async () => {
      vi.mocked(prisma.institutionConfig.findUnique).mockResolvedValueOnce(mockConfig as any);

      const result = await isSetupComplete();

      expect(result).toBe(true);
    });

    it('debe devolver false si el setup no está completado', async () => {
      vi.mocked(prisma.institutionConfig.findUnique).mockResolvedValueOnce({
        ...mockConfig,
        setupComplete: false,
      } as any);

      const result = await isSetupComplete();

      expect(result).toBe(false);
    });
  });

  describe('invalidateInstitutionCache', () => {
    it('debe limpiar el caché forzando una nueva consulta', async () => {
      vi.mocked(prisma.institutionConfig.findUnique).mockResolvedValue(mockConfig as any);

      await getInstitutionConfig(); // carga el caché
      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(1);

      invalidateInstitutionCache(); // limpia el caché

      await getInstitutionConfig(); // debería hacer una nueva consulta
      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(2);
    });
  });
});
