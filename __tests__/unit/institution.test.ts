import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import prisma from '@/lib/prisma';
import {
  getInstitutionConfig,
  updateInstitutionConfig,
  isSetupComplete,
  invalidateInstitutionCache,
} from '@/lib/institution';
import type { InstitutionConfig } from '@/generated/prisma/client';

// Mock del cliente Prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    institutionConfig: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

// Configuración base de prueba
const mockConfig: InstitutionConfig = {
  id: 'singleton',
  name: 'Universidad de Prueba',
  abbreviation: 'UPrueba',
  domain: 'uprueba.edu',
  authMode: 'LOCAL',
  setupComplete: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  primaryColor: '#000000',
  logoUrl: null,
};

describe('Institution Config', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    invalidateInstitutionCache(); // Resetea el caché antes de cada test
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getInstitutionConfig', () => {
    it('retorna la configuración desde la BD si no hay caché', async () => {
      (prisma.institutionConfig.findUnique as Mock).mockResolvedValue(mockConfig);

      const config = await getInstitutionConfig();

      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(1);
      expect(config).toEqual(mockConfig);
    });

    it('crea una nueva configuración por defecto si no existe en la BD', async () => {
      (prisma.institutionConfig.findUnique as Mock).mockResolvedValue(null);
      (prisma.institutionConfig.create as Mock).mockResolvedValue(mockConfig);

      const config = await getInstitutionConfig();

      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.institutionConfig.create).toHaveBeenCalledTimes(1);
      expect(prisma.institutionConfig.create).toHaveBeenCalledWith({
        data: { id: 'singleton' },
      });
      expect(config).toEqual(mockConfig);
    });

    it('usa el caché para llamadas subsecuentes dentro del TTL', async () => {
      (prisma.institutionConfig.findUnique as Mock).mockResolvedValue(mockConfig);

      // Primera llamada - va a la BD
      await getInstitutionConfig();
      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(1);

      // Avanza el tiempo 1 minuto
      vi.advanceTimersByTime(60 * 1000);

      // Segunda llamada - debe usar caché
      await getInstitutionConfig();
      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(1); // No incrementa
    });

    it('ignora el caché y consulta la BD si el TTL expiró', async () => {
      (prisma.institutionConfig.findUnique as Mock).mockResolvedValue(mockConfig);

      // Primera llamada - va a la BD
      await getInstitutionConfig();
      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(1);

      // Avanza el tiempo 6 minutos (TTL es 5 minutos)
      vi.advanceTimersByTime(6 * 60 * 1000);

      // Segunda llamada - debe ir a la BD de nuevo
      await getInstitutionConfig();
      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(2);
    });

    it('ignora el caché si forceRefresh es true', async () => {
      (prisma.institutionConfig.findUnique as Mock).mockResolvedValue(mockConfig);

      // Primera llamada - va a la BD
      await getInstitutionConfig();
      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(1);

      // Segunda llamada forzada - debe ir a la BD incluso sin avanzar el tiempo
      await getInstitutionConfig(true);
      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateInstitutionConfig', () => {
    it('actualiza la configuración en la BD y el caché', async () => {
      const updateData = { name: 'Nueva Universidad' };
      const updatedConfig = { ...mockConfig, ...updateData };

      (prisma.institutionConfig.upsert as Mock).mockResolvedValue(updatedConfig);

      const result = await updateInstitutionConfig(updateData);

      expect(prisma.institutionConfig.upsert).toHaveBeenCalledTimes(1);
      expect(prisma.institutionConfig.upsert).toHaveBeenCalledWith({
        where: { id: 'singleton' },
        update: updateData,
        create: { id: 'singleton', ...updateData },
      });
      expect(result).toEqual(updatedConfig);

      // Verifica que el caché se actualizó (la siguiente llamada a get no debe ir a BD)
      (prisma.institutionConfig.findUnique as Mock).mockResolvedValue(mockConfig); // BD tiene lo viejo
      const cachedResult = await getInstitutionConfig();
      expect(prisma.institutionConfig.findUnique).not.toHaveBeenCalled();
      expect(cachedResult).toEqual(updatedConfig); // Pero obtenemos lo nuevo del caché
    });
  });

  describe('isSetupComplete', () => {
    it('retorna true si setupComplete es true en la configuración', async () => {
      (prisma.institutionConfig.findUnique as Mock).mockResolvedValue({
        ...mockConfig,
        setupComplete: true,
      });

      const result = await isSetupComplete();
      expect(result).toBe(true);
    });

    it('retorna false si setupComplete es false en la configuración', async () => {
      (prisma.institutionConfig.findUnique as Mock).mockResolvedValue({
        ...mockConfig,
        setupComplete: false,
      });

      const result = await isSetupComplete();
      expect(result).toBe(false);
    });
  });

  describe('invalidateInstitutionCache', () => {
    it('fuerza a la siguiente llamada a consultar la BD', async () => {
      (prisma.institutionConfig.findUnique as Mock).mockResolvedValue(mockConfig);

      // Primera llamada - va a la BD y llena caché
      await getInstitutionConfig();
      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(1);

      // Invalidar caché explícitamente
      invalidateInstitutionCache();

      // Segunda llamada - debe ir a la BD de nuevo
      await getInstitutionConfig();
      expect(prisma.institutionConfig.findUnique).toHaveBeenCalledTimes(2);
    });
  });
});
