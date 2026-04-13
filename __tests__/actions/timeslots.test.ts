import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getTimeslots,
  getTimeslotWithParticipants,
  createTimeslot,
  updateTimeslot,
  cancelTimeslot,
  importTimeslots,
} from '@/app/actions/timeslots';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';
import { logAuditEvent } from '@/lib/audit';

// Mock dependencies
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  default: {
    timeslot: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    study: {
      findUnique: vi.fn(),
    },
    participation: {
      updateMany: vi.fn(),
    },
    waitlistEntry: {
      updateMany: vi.fn(),
    },
  },
}));
vi.mock('@/lib/permissions', () => ({
  requirePermission: vi.fn(),
  ACTIONS: {
    CREATE_TIMESLOT: 'CREATE_TIMESLOT',
    EDIT_TIMESLOT: 'EDIT_TIMESLOT',
    IMPORT_TIMESLOTS: 'IMPORT_TIMESLOTS',
    VIEW_ENROLLED_PARTICIPANTS: 'VIEW_ENROLLED_PARTICIPANTS',
  },
}));
vi.mock('@/lib/audit', () => ({ logAuditEvent: vi.fn() }));

describe('Timeslots Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTimeslots', () => {
    it('returns error if unauthenticated', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);
      const result = await getTimeslots('study-1');
      expect(result).toEqual({ success: false, error: 'No autenticado' });
    });

    it('returns available timeslots for ESTUDIANTE role', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1', role: 'ESTUDIANTE' } } as any);
      vi.mocked(prisma.timeslot.findMany).mockResolvedValueOnce([]);

      const result = await getTimeslots('study-1');

      expect(prisma.timeslot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { studyId: 'study-1', status: 'AVAILABLE' },
        })
      );
      expect(result.success).toBe(true);
    });

    it('returns all timeslots for other roles without status filter', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-2', role: 'INV_PRINCIPAL' } } as any);
      vi.mocked(prisma.timeslot.findMany).mockResolvedValueOnce([]);

      const result = await getTimeslots('study-1');

      expect(prisma.timeslot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { studyId: 'study-1' },
        })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('getTimeslotWithParticipants', () => {
    it('returns error if unauthenticated', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);
      const result = await getTimeslotWithParticipants('timeslot-1');
      expect(result).toEqual({ success: false, error: 'No autenticado' });
    });

    it('requires VIEW_ENROLLED_PARTICIPANTS permission', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1', role: 'ESTUDIANTE' } } as any);
      vi.mocked(requirePermission).mockImplementationOnce(() => {
        throw new Error('Access denied');
      });

      await expect(getTimeslotWithParticipants('timeslot-1')).rejects.toThrow('Access denied');
      expect(requirePermission).toHaveBeenCalledWith('ESTUDIANTE', 'VIEW_ENROLLED_PARTICIPANTS');
    });

    it('returns error if timeslot not found', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-2', role: 'INV_PRINCIPAL' } } as any);
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValueOnce(null);

      const result = await getTimeslotWithParticipants('timeslot-1');
      expect(result).toEqual({ success: false, error: 'Timeslot no encontrado' });
    });
  });

  describe('createTimeslot', () => {
    const validData = {
      studyId: 'study-1',
      startTime: '2025-01-01T10:00:00Z',
      endTime: '2025-01-01T11:00:00Z',
      maxParticipants: 5,
    };

    it('returns error if unauthenticated', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null);
      const result = await createTimeslot(validData);
      expect(result).toEqual({ success: false, error: 'No autenticado' });
    });

    it('returns error if study not found', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1', role: 'INV_PRINCIPAL' } } as any);
      vi.mocked(prisma.study.findUnique).mockResolvedValueOnce(null);

      const result = await createTimeslot(validData);
      expect(result).toEqual({ success: false, error: 'Estudio no encontrado' });
    });

    it('returns error if study is not active', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1', role: 'INV_PRINCIPAL' } } as any);
      vi.mocked(prisma.study.findUnique).mockResolvedValueOnce({
        status: 'COMPLETED',
        principalInvestigatorId: 'user-1',
        collaborators: [],
      } as any);

      const result = await createTimeslot(validData);
      expect(result).toEqual({ success: false, error: 'Solo se pueden agregar timeslots a estudios activos' });
    });

    it('creates timeslot and logs audit event', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1', role: 'INV_PRINCIPAL' } } as any);
      vi.mocked(prisma.study.findUnique).mockResolvedValueOnce({
        id: 'study-1',
        status: 'ACTIVE',
        principalInvestigatorId: 'user-1',
        collaborators: [],
      } as any);
      vi.mocked(prisma.timeslot.create).mockResolvedValueOnce({
        id: 'timeslot-1',
        studyId: 'study-1',
        startTime: new Date(validData.startTime),
        maxParticipants: validData.maxParticipants,
      } as any);

      const result = await createTimeslot(validData);

      expect(prisma.timeslot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ studyId: 'study-1', maxParticipants: 5 }),
        })
      );
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE_TIMESLOT', entityId: 'timeslot-1' })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('updateTimeslot', () => {
    it('returns error if timeslot not found', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1', role: 'INV_PRINCIPAL' } } as any);
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValueOnce(null);

      const result = await updateTimeslot('timeslot-1', { maxParticipants: 10 });
      expect(result).toEqual({ success: false, error: 'Timeslot no encontrado' });
    });

    it('updates timeslot and logs audit event', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1', role: 'INV_PRINCIPAL' } } as any);
      const mockTimeslot = {
        id: 'timeslot-1',
        startTime: new Date('2025-01-01T10:00:00Z'),
        maxParticipants: 5,
        study: { principalInvestigatorId: 'user-1', collaborators: [] },
        _count: { participations: 2 },
      };
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValueOnce(mockTimeslot as any);
      vi.mocked(prisma.timeslot.update).mockResolvedValueOnce({
        ...mockTimeslot,
        maxParticipants: 10,
      } as any);

      const result = await updateTimeslot('timeslot-1', { maxParticipants: 10 });

      expect(prisma.timeslot.update).toHaveBeenCalledWith({
        where: { id: 'timeslot-1' },
        data: expect.objectContaining({ maxParticipants: 10 }),
      });
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE_TIMESLOT', entityId: 'timeslot-1' })
      );
      expect(result.success).toBe(true);
    });

    it('prevents reducing max participants below enrolled count', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1', role: 'INV_PRINCIPAL' } } as any);
      const mockTimeslot = {
        id: 'timeslot-1',
        startTime: new Date('2025-01-01T10:00:00Z'),
        maxParticipants: 5,
        study: { principalInvestigatorId: 'user-1', collaborators: [] },
        _count: { participations: 3 },
      };
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValueOnce(mockTimeslot as any);

      const result = await updateTimeslot('timeslot-1', { maxParticipants: 2 });
      expect(result).toEqual({ success: false, error: 'No se puede reducir a 2: ya hay 3 inscritos' });
    });
  });

  describe('cancelTimeslot', () => {
    it('returns error if already cancelled', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1', role: 'INV_PRINCIPAL' } } as any);
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValueOnce({
        id: 'timeslot-1',
        status: 'CANCELLED',
        study: { principalInvestigatorId: 'user-1', collaborators: [] },
      } as any);

      const result = await cancelTimeslot('timeslot-1');
      expect(result).toEqual({ success: false, error: 'El timeslot ya está cancelado' });
    });

    it('cancels timeslot, participations and waitlist', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1', role: 'INV_PRINCIPAL' } } as any);
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValueOnce({
        id: 'timeslot-1',
        status: 'AVAILABLE',
        study: { principalInvestigatorId: 'user-1', collaborators: [] },
      } as any);
      vi.mocked(prisma.timeslot.update).mockResolvedValueOnce({ id: 'timeslot-1', status: 'CANCELLED' } as any);

      const result = await cancelTimeslot('timeslot-1');

      expect(prisma.participation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ timeslotId: 'timeslot-1' }) })
      );
      expect(prisma.waitlistEntry.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ timeslotId: 'timeslot-1' }) })
      );
      expect(prisma.timeslot.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CANCELLED' } })
      );
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CANCEL_TIMESLOT', entityId: 'timeslot-1' })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('importTimeslots', () => {
    it('returns error if study is not active', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1', role: 'INV_PRINCIPAL' } } as any);
      vi.mocked(prisma.study.findUnique).mockResolvedValueOnce({
        id: 'study-1',
        status: 'COMPLETED',
        collaborators: [],
      } as any);

      const result = await importTimeslots('study-1', []);
      expect(result).toEqual({ success: false, error: 'Solo se pueden importar timeslots a estudios activos' });
    });

    it('imports timeslots successfully', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1', role: 'INV_PRINCIPAL' } } as any);
      vi.mocked(prisma.study.findUnique).mockResolvedValueOnce({
        id: 'study-1',
        status: 'ACTIVE',
        principalInvestigatorId: 'user-1',
        collaborators: [],
      } as any);

      const rows = [
        { fecha: '2025-01-01', horaInicio: '10:00', horaFin: '11:00', maxParticipantes: 5 },
      ];

      const result = await importTimeslots('study-1', rows);

      expect(prisma.timeslot.create).toHaveBeenCalledTimes(1);
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'IMPORT_TIMESLOTS', entityId: 'study-1' })
      );
      expect(result).toEqual({ success: true, data: { created: 1, errors: [] } });
    });
  });

});
