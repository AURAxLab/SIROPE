import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createTimeslot,
  updateTimeslot,
  cancelTimeslot,
  importTimeslots,
} from '@/app/actions/timeslots';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';
import { logAuditEvent } from '@/lib/audit';

// Mocks
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    study: {
      findUnique: vi.fn(),
    },
    timeslot: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    participation: {
      findMany: vi.fn(),
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
  },
}));

vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  sendCancellationConfirmation: vi.fn(),
}));

describe('Timeslots Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('cancelTimeslot', () => {
    const mockTimeslotId = 'ts-123';
    const mockUserId = 'user-123';

    it('returns error if not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const result = await cancelTimeslot(mockTimeslotId);

      expect(result).toEqual({ success: false, error: 'No autenticado' });
      expect(prisma.timeslot.update).not.toHaveBeenCalled();
    });

    it('returns error if timeslot not found', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId, role: 'INV_PRINCIPAL' },
        expires: '123'
      });
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValue(null);

      const result = await cancelTimeslot(mockTimeslotId);

      expect(result).toEqual({ success: false, error: 'Timeslot no encontrado' });
      expect(requirePermission).toHaveBeenCalledWith('INV_PRINCIPAL', 'EDIT_TIMESLOT');
    });

    it('returns error if user does not have access to the study', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId, role: 'INV_PRINCIPAL' },
        expires: '123'
      });
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValue({
        id: mockTimeslotId,
        study: {
          principalInvestigatorId: 'other-user',
          collaborators: [],
        },
      } as any);

      const result = await cancelTimeslot(mockTimeslotId);

      expect(result).toEqual({ success: false, error: 'No tiene acceso a este timeslot' });
    });

    it('returns error if timeslot is already cancelled', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId, role: 'INV_PRINCIPAL' },
        expires: '123'
      });
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValue({
        id: mockTimeslotId,
        status: 'CANCELLED',
        study: {
          principalInvestigatorId: mockUserId,
          collaborators: [],
        },
      } as any);

      const result = await cancelTimeslot(mockTimeslotId);

      expect(result).toEqual({ success: false, error: 'El timeslot ya está cancelado' });
    });

    it('successfully cancels timeslot and related participations/waitlist entries', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId, role: 'INV_PRINCIPAL' },
        expires: '123'
      });
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValue({
        id: mockTimeslotId,
        status: 'AVAILABLE',
        study: {
          principalInvestigatorId: mockUserId,
          collaborators: [],
        },
      } as any);

      vi.mocked(prisma.participation.findMany).mockResolvedValue([]);
      vi.mocked(prisma.timeslot.update).mockResolvedValue({ id: mockTimeslotId, status: 'CANCELLED' } as any);

      const result = await cancelTimeslot(mockTimeslotId);

      expect(result).toEqual({ success: true, data: { id: mockTimeslotId, status: 'CANCELLED' } });

      // Check updates to related records
      expect(prisma.participation.updateMany).toHaveBeenCalledWith({
        where: {
          timeslotId: mockTimeslotId,
          status: { in: ['SIGNED_UP', 'REMINDED'] },
        },
        data: {
          status: 'CANCELLED',
          cancellationReason: 'Timeslot cancelado por el investigador',
        },
      });

      expect(prisma.waitlistEntry.updateMany).toHaveBeenCalledWith({
        where: { timeslotId: mockTimeslotId, status: 'WAITING' },
        data: { status: 'EXPIRED' },
      });

      // Check audit log
      expect(logAuditEvent).toHaveBeenCalledWith({
        userId: mockUserId,
        action: 'CANCEL_TIMESLOT',
        entityType: 'Timeslot',
        entityId: mockTimeslotId,
        previousState: { status: 'AVAILABLE' },
        newState: { status: 'CANCELLED' },
      });
    });
  });

  describe('createTimeslot', () => {
    const mockUserId = 'user-123';
    const mockStudyId = 'study-123';

    const validFormData = {
      studyId: mockStudyId,
      startTime: new Date(Date.now() + 86400000).toISOString(),
      endTime: new Date(Date.now() + 86400000 + 3600000).toISOString(),
      maxParticipants: 5,
      location: 'Lab 1',
    };

    it('returns error if not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const result = await createTimeslot(validFormData);

      expect(result).toEqual({ success: false, error: 'No autenticado' });
    });

    it('returns error if study not found', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId, role: 'INV_PRINCIPAL' },
        expires: '123'
      });
      vi.mocked(prisma.study.findUnique).mockResolvedValue(null);

      const result = await createTimeslot(validFormData);

      expect(result).toEqual({ success: false, error: 'Estudio no encontrado' });
    });

    it('returns error if study is not active', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId, role: 'INV_PRINCIPAL' },
        expires: '123'
      });
      vi.mocked(prisma.study.findUnique).mockResolvedValue({
        id: mockStudyId,
        status: 'DRAFT',
        collaborators: [],
      } as any);

      const result = await createTimeslot(validFormData);

      expect(result).toEqual({ success: false, error: 'Solo se pueden agregar timeslots a estudios activos' });
    });

    it('returns error if user does not have access to study', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId, role: 'INV_PRINCIPAL' },
        expires: '123'
      });
      vi.mocked(prisma.study.findUnique).mockResolvedValue({
        id: mockStudyId,
        status: 'ACTIVE',
        principalInvestigatorId: 'other-user',
        collaborators: [],
      } as any);

      const result = await createTimeslot(validFormData);

      expect(result).toEqual({ success: false, error: 'No tiene acceso a este estudio' });
    });

    it('successfully creates timeslot', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId, role: 'INV_PRINCIPAL' },
        expires: '123'
      });
      vi.mocked(prisma.study.findUnique).mockResolvedValue({
        id: mockStudyId,
        status: 'ACTIVE',
        principalInvestigatorId: mockUserId,
        collaborators: [],
        location: 'Default Lab',
      } as any);

      const mockCreatedTimeslot = { id: 'new-ts-123', studyId: mockStudyId, startTime: new Date(validFormData.startTime), maxParticipants: 5 };
      vi.mocked(prisma.timeslot.create).mockResolvedValue(mockCreatedTimeslot as any);

      const result = await createTimeslot(validFormData);

      expect(result).toEqual({ success: true, data: mockCreatedTimeslot });
      expect(prisma.timeslot.create).toHaveBeenCalled();
      expect(logAuditEvent).toHaveBeenCalled();
    });

    it('returns error if data is invalid (Zod validation)', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId, role: 'INV_PRINCIPAL' },
        expires: '123'
      });

      const result = await createTimeslot({ ...validFormData, maxParticipants: -1 });

      expect(result.success).toBe(false);
      expect(prisma.timeslot.create).not.toHaveBeenCalled();
    });
  });

  describe('updateTimeslot', () => {
    const mockUserId = 'user-123';
    const mockTimeslotId = 'ts-123';

    it('returns error if not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const result = await updateTimeslot(mockTimeslotId, { maxParticipants: 10 });

      expect(result).toEqual({ success: false, error: 'No autenticado' });
    });

    it('returns error if timeslot not found', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId, role: 'INV_PRINCIPAL' },
        expires: '123'
      });
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValue(null);

      const result = await updateTimeslot(mockTimeslotId, { maxParticipants: 10 });

      expect(result).toEqual({ success: false, error: 'Timeslot no encontrado' });
    });

    it('returns error if user does not have access to study', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId, role: 'INV_PRINCIPAL' },
        expires: '123'
      });
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValue({
        id: mockTimeslotId,
        study: {
          principalInvestigatorId: 'other-user',
          collaborators: [],
        },
        _count: { participations: 0 }
      } as any);

      const result = await updateTimeslot(mockTimeslotId, { maxParticipants: 10 });

      expect(result).toEqual({ success: false, error: 'No tiene acceso a este timeslot' });
    });

    it('returns error if trying to reduce maxParticipants below current participations', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId, role: 'INV_PRINCIPAL' },
        expires: '123'
      });
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValue({
        id: mockTimeslotId,
        study: {
          principalInvestigatorId: mockUserId,
          collaborators: [],
        },
        _count: { participations: 5 }
      } as any);

      const result = await updateTimeslot(mockTimeslotId, { maxParticipants: 3 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('ya hay 5 inscritos');
    });

    it('successfully updates timeslot', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId, role: 'INV_PRINCIPAL' },
        expires: '123'
      });
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValue({
        id: mockTimeslotId,
        startTime: new Date(),
        maxParticipants: 5,
        study: {
          principalInvestigatorId: mockUserId,
          collaborators: [],
        },
        _count: { participations: 2 }
      } as any);

      const updatedMock = { id: mockTimeslotId, startTime: new Date(), maxParticipants: 10 };
      vi.mocked(prisma.timeslot.update).mockResolvedValue(updatedMock as any);

      const result = await updateTimeslot(mockTimeslotId, { maxParticipants: 10 });

      expect(result.success).toBe(true);
      expect(prisma.timeslot.update).toHaveBeenCalled();
      expect(logAuditEvent).toHaveBeenCalled();
    });
  });

  describe('importTimeslots', () => {
    const mockUserId = 'user-123';
    const mockStudyId = 'study-123';

    it('returns error if not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const result = await importTimeslots(mockStudyId, []);

      expect(result).toEqual({ success: false, error: 'No autenticado' });
    });

    it('returns error if study not found', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId, role: 'INV_PRINCIPAL' },
        expires: '123'
      });
      vi.mocked(prisma.study.findUnique).mockResolvedValue(null);

      const result = await importTimeslots(mockStudyId, []);

      expect(result).toEqual({ success: false, error: 'Estudio no encontrado' });
    });

    it('returns error if study is not active', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId, role: 'INV_PRINCIPAL' },
        expires: '123'
      });
      vi.mocked(prisma.study.findUnique).mockResolvedValue({
        id: mockStudyId,
        status: 'DRAFT',
        collaborators: [],
      } as any);

      const result = await importTimeslots(mockStudyId, []);

      expect(result).toEqual({ success: false, error: 'Solo se pueden importar timeslots a estudios activos' });
    });

    it('returns error if user does not have access to study', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId, role: 'INV_PRINCIPAL' },
        expires: '123'
      });
      vi.mocked(prisma.study.findUnique).mockResolvedValue({
        id: mockStudyId,
        status: 'ACTIVE',
        principalInvestigatorId: 'other-user',
        collaborators: [],
      } as any);

      const result = await importTimeslots(mockStudyId, []);

      expect(result).toEqual({ success: false, error: 'No tiene acceso a este estudio' });
    });

    it('successfully imports valid timeslots and skips invalid ones', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUserId, role: 'INV_PRINCIPAL' },
        expires: '123'
      });
      vi.mocked(prisma.study.findUnique).mockResolvedValue({
        id: mockStudyId,
        status: 'ACTIVE',
        principalInvestigatorId: mockUserId,
        collaborators: [],
        location: 'Default Lab',
      } as any);

      const rows = [
        { fecha: '2026-05-01', horaInicio: '09:00', horaFin: '10:00', maxParticipantes: 5 }, // valid
        { fecha: '2026-05-01', horaInicio: '10:00', horaFin: '09:00', maxParticipantes: 5 }, // invalid end time
        { fecha: 'invalid-date', horaInicio: '09:00', horaFin: '10:00', maxParticipantes: 5 }, // invalid date
        { fecha: '2026-05-01', horaInicio: '11:00', horaFin: '12:00', maxParticipantes: -1 }, // invalid participants
      ];

      vi.mocked(prisma.timeslot.create).mockResolvedValue({} as any);

      const result = await importTimeslots(mockStudyId, rows);

      expect(result.success).toBe(true);
      expect((result as any).data.created).toBe(1);
      expect((result as any).data.errors.length).toBe(3);
      expect(prisma.timeslot.create).toHaveBeenCalledTimes(1);
      expect(logAuditEvent).toHaveBeenCalled();
    });
  });
});
