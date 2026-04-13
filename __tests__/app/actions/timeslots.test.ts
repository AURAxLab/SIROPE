import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTimeslot } from '@/app/actions/timeslots';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

// Mocks
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    timeslot: {
      create: vi.fn(),
    },
    study: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn(),
}));

describe('Timeslot Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTimeslot', () => {
    it('debe fallar si no hay sesion', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const result = await createTimeslot({
        studyId: 'study-1',
        startTime: '2025-01-01T10:00:00Z',
        endTime: '2025-01-01T11:00:00Z',
        maxParticipants: 5,
      });

      expect(result).toEqual({ success: false, error: 'No autenticado' });
    });

    it('debe fallar por datos invalidos', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-1', role: 'INV_PRINCIPAL' },
        expires: '9999',
      } as any);

      // endTime antes de startTime
      const result = await createTimeslot({
        studyId: 'study-1',
        startTime: '2025-01-01T11:00:00Z',
        endTime: '2025-01-01T10:00:00Z',
        maxParticipants: 5,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('debe fallar si el estudio no existe', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-1', role: 'INV_PRINCIPAL' },
        expires: '9999',
      } as any);

      vi.mocked(prisma.study.findUnique).mockResolvedValue(null);

      const result = await createTimeslot({
        studyId: 'missing-study',
        startTime: '2025-01-01T10:00:00Z',
        endTime: '2025-01-01T11:00:00Z',
        maxParticipants: 5,
      });

      expect(result).toEqual({ success: false, error: 'Estudio no encontrado' });
    });

    it('debe fallar si el estudio no esta ACTIVE', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-1', role: 'INV_PRINCIPAL' },
        expires: '9999',
      } as any);

      vi.mocked(prisma.study.findUnique).mockResolvedValue({
        id: 'study-1',
        status: 'DRAFT',
        principalInvestigatorId: 'user-1',
        collaborators: [],
      } as any);

      const result = await createTimeslot({
        studyId: 'study-1',
        startTime: '2025-01-01T10:00:00Z',
        endTime: '2025-01-01T11:00:00Z',
        maxParticipants: 5,
      });

      expect(result).toEqual({ success: false, error: 'Solo se pueden agregar timeslots a estudios activos' });
    });

    it('debe fallar si el usuario no tiene acceso al estudio', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-2', role: 'INV_PRINCIPAL' }, // Usuario distinto
        expires: '9999',
      } as any);

      vi.mocked(prisma.study.findUnique).mockResolvedValue({
        id: 'study-1',
        status: 'ACTIVE',
        principalInvestigatorId: 'user-1',
        collaborators: [],
      } as any);

      const result = await createTimeslot({
        studyId: 'study-1',
        startTime: '2025-01-01T10:00:00Z',
        endTime: '2025-01-01T11:00:00Z',
        maxParticipants: 5,
      });

      expect(result).toEqual({ success: false, error: 'No tiene acceso a este estudio' });
    });

    it('debe crear el timeslot exitosamente para un IP', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-1', role: 'INV_PRINCIPAL' },
        expires: '9999',
      } as any);

      vi.mocked(prisma.study.findUnique).mockResolvedValue({
        id: 'study-1',
        status: 'ACTIVE',
        principalInvestigatorId: 'user-1',
        collaborators: [],
        location: 'Lab 1',
      } as any);

      vi.mocked(prisma.timeslot.create).mockResolvedValue({
        id: 'ts-1',
        studyId: 'study-1',
        startTime: new Date('2025-01-01T10:00:00Z'),
        maxParticipants: 5,
      } as any);

      const result = await createTimeslot({
        studyId: 'study-1',
        startTime: '2025-01-01T10:00:00Z',
        endTime: '2025-01-01T11:00:00Z',
        maxParticipants: 5,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(prisma.timeslot.create).toHaveBeenCalled();
      expect(logAuditEvent).toHaveBeenCalled();
    });
  });
});
