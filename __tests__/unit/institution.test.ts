/**
 * SIROPE — Tests: Configuración Institucional
 * Verifica el manejo del singleton de configuración y su caché.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getInstitutionConfig,
  updateInstitutionConfig,
  isSetupComplete,
  invalidateInstitutionCache,
} from '@/lib/institution';
import prisma from '@/lib/prisma';
import type { InstitutionConfig } from '@/generated/prisma/client';

// Mock de Prisma
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
  const mockConfig: InstitutionConfig = {
    id: 'singleton',
    name: 'Universidad de Prueba',
    domain: 'prueba.cr',
    authMode: 'CREDENTIALS',
    setupComplete: true,
    academicTermName: 'I Ciclo 2024',
    maxCreditsEstudiante: 5,
    maxCreditsCurso: 15,
    maxCreditsInvestigador: 50,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    invalidateInstitutionCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getInstitutionConfig', () => {
    it('Crea la configuración por defecto si no existe en BD', async () => {
      vi.mocked(prisma.institutionConfig.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.institutionConfig.create).mockResolvedValueOnce(mockConfig);

      const config = await getInstitutionConfig();

      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.institutionConfig.create).toHaveBeenCalledTimes(1);
      expect(prisma.institutionConfig.create).toHaveBeenCalledWith({
        data: { id: 'singleton' },
      });
      expect(config).toEqual(mockConfig);
    });

    it('Obtiene la configuración de BD si no está en caché', async () => {
      vi.mocked(prisma.institutionConfig.findUnique).mockResolvedValueOnce(mockConfig);

      const config = await getInstitutionConfig();

      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.institutionConfig.create).not.toHaveBeenCalled();
      expect(config).toEqual(mockConfig);
    });

    it('Usa el caché para solicitudes repetidas', async () => {
      vi.mocked(prisma.institutionConfig.findUnique).mockResolvedValueOnce(mockConfig);

      // Primera llamada - va a la BD
      await getInstitutionConfig();
      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(1);

      // Segunda llamada - debe usar caché
      const config2 = await getInstitutionConfig();
      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(1); // No incrementa
      expect(config2).toEqual(mockConfig);
    });

    it('Ignora el caché si forceRefresh es true', async () => {
      vi.mocked(prisma.institutionConfig.findUnique)
        .mockResolvedValueOnce(mockConfig)
        .mockResolvedValueOnce({ ...mockConfig, name: 'Refresh' });

      // Primera llamada - va a la BD
      await getInstitutionConfig();

      // Segunda llamada con forceRefresh=true - va a la BD otra vez
      const config2 = await getInstitutionConfig(true);
      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(2);
      expect(config2.name).toBe('Refresh');
    });

    it('Invalida el caché después de 5 minutos (TTL)', async () => {
      vi.mocked(prisma.institutionConfig.findUnique).mockResolvedValue(mockConfig);

      // Primera llamada
      await getInstitutionConfig();
      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(1);

      // Avanza el tiempo 4 minutos
      vi.advanceTimersByTime(4 * 60 * 1000);
      await getInstitutionConfig();
      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(1); // Sigue en caché

      // Avanza 2 minutos más (total 6 > TTL de 5)
      vi.advanceTimersByTime(2 * 60 * 1000);
      await getInstitutionConfig();
      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(2); // Vuelve a BD
    });
  });

  describe('updateInstitutionConfig', () => {
    it('Actualiza la configuración usando upsert y actualiza el caché', async () => {
      const updateData = { name: 'Nueva Universidad' };
      const updatedConfig = { ...mockConfig, ...updateData };

      vi.mocked(prisma.institutionConfig.upsert).mockResolvedValueOnce(updatedConfig);
      // Mock findUnique para la posterior comprobación del caché
      vi.mocked(prisma.institutionConfig.findUnique).mockResolvedValueOnce(updatedConfig);

      const result = await updateInstitutionConfig(updateData);

      // Verifica el llamado a upsert
      expect(prisma.institutionConfig.upsert).toHaveBeenCalledTimes(1);
      expect(prisma.institutionConfig.upsert).toHaveBeenCalledWith({
        where: { id: 'singleton' },
        update: updateData,
        create: { id: 'singleton', ...updateData },
      });
      expect(result).toEqual(updatedConfig);

      // Verifica que el caché fue actualizado sin llamar a BD en el get
      vi.mocked(prisma.institutionConfig.findUnique).mockClear();
      const cachedResult = await getInstitutionConfig();
      expect(prisma.institutionConfig.findUnique).not.toHaveBeenCalled();
      expect(cachedResult).toEqual(updatedConfig);
    });
  });

  describe('isSetupComplete', () => {
    it('Devuelve true si setupComplete es true', async () => {
      vi.mocked(prisma.institutionConfig.findUnique).mockResolvedValueOnce(mockConfig);
      const isComplete = await isSetupComplete();
      expect(isComplete).toBe(true);
    });

    it('Devuelve false si setupComplete es false', async () => {
      vi.mocked(prisma.institutionConfig.findUnique).mockResolvedValueOnce({
        ...mockConfig,
        setupComplete: false,
      });
      const isComplete = await isSetupComplete();
      expect(isComplete).toBe(false);
    });
  });

  describe('invalidateInstitutionCache', () => {
    it('Limpia el caché forzando una nueva consulta a BD', async () => {
      vi.mocked(prisma.institutionConfig.findUnique).mockResolvedValue(mockConfig);

      // Llena el caché
      await getInstitutionConfig();
      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(1);

      // Invalida explícitamente
      invalidateInstitutionCache();

      // Debe consultar BD de nuevo
      await getInstitutionConfig();
      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(2);
    });
  });
});
