import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getTimeslots,
  getTimeslotWithParticipants,
  createTimeslot,
  updateTimeslot,
  cancelTimeslot,
  importTimeslots,
} from '@/app/actions/timeslots';
import * as authModule from '@/lib/auth';
import prisma from '@/lib/prisma';
import * as permissionsModule from '@/lib/permissions';
import * as auditModule from '@/lib/audit';

// Mock dependencias
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

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
    VIEW_ENROLLED_PARTICIPANTS: 'VIEW_ENROLLED_PARTICIPANTS',
    IMPORT_TIMESLOTS: 'IMPORT_TIMESLOTS',
  },
}));

vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  sendCancellationConfirmation: vi.fn(),
}));

// Validations mock para que funcione con importTimeslots
vi.mock('@/lib/validations', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/validations')>();
  return {
    ...actual,
    timeslotSchema: {
      safeParse: vi.fn((data) => {
        if (data.maxParticipants === 0) return { success: false, error: { issues: [{ message: 'Datos inválidos' }] } };
        return { success: true, data };
      }),
    },
    timeslotImportRowSchema: {
      safeParse: vi.fn((data) => {
         if (data.maxParticipantes === 0) return { success: false, error: { issues: [{ message: 'Datos inválidos' }] } };
         return { success: true, data };
      }),
    },
  };
});

describe('Timeslots Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTimeslots', () => {
    it('retorna error si no está autenticado', async () => {
      vi.mocked(authModule.auth).mockResolvedValue(null);
      const res = await getTimeslots('study-1');
      expect(res).toEqual({ success: false, error: 'No autenticado' });
    });

    it('ESTUDIANTE solo ve timeslots AVAILABLE', async () => {
      vi.mocked(authModule.auth).mockResolvedValue({ user: { id: 'user-1', role: 'ESTUDIANTE' }, expires: '2025' });
      vi.mocked(prisma.timeslot.findMany).mockResolvedValue([] as any);

      await getTimeslots('study-1');

      expect(prisma.timeslot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { studyId: 'study-1', status: 'AVAILABLE' },
        })
      );
    });

    it('INV_PRINCIPAL ve todos los timeslots (sin statusFilter)', async () => {
      vi.mocked(authModule.auth).mockResolvedValue({ user: { id: 'user-2', role: 'INV_PRINCIPAL' }, expires: '2025' });
      vi.mocked(prisma.timeslot.findMany).mockResolvedValue([] as any);

      await getTimeslots('study-1');

      expect(prisma.timeslot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { studyId: 'study-1' },
        })
      );
    });
  });

  describe('getTimeslotWithParticipants', () => {
    it('retorna error si no hay sesión', async () => {
      vi.mocked(authModule.auth).mockResolvedValue(null);
      const res = await getTimeslotWithParticipants('ts-1');
      expect(res).toEqual({ success: false, error: 'No autenticado' });
    });

    it('lanza error si no tiene permisos', async () => {
      vi.mocked(authModule.auth).mockResolvedValue({ user: { id: 'u1', role: 'ESTUDIANTE' }, expires: '2025' });
      vi.mocked(permissionsModule.requirePermission).mockImplementation(() => { throw new Error('No autorizado'); });

      await expect(getTimeslotWithParticipants('ts-1')).rejects.toThrow('No autorizado');
    });
  });

  describe('createTimeslot', () => {
    const validFormData = {
      studyId: 'study-1',
      startTime: '2025-01-01T10:00:00Z',
      endTime: '2025-01-01T11:00:00Z',
      maxParticipants: 5,
    };

    it('retorna error si no hay sesión', async () => {
      vi.mocked(authModule.auth).mockResolvedValue(null);
      const res = await createTimeslot(validFormData);
      expect(res).toEqual({ success: false, error: 'No autenticado' });
    });

    it('falla si estudio no existe', async () => {
      vi.mocked(authModule.auth).mockResolvedValue({ user: { id: 'u1', role: 'INV_PRINCIPAL' }, expires: '2025' });
      vi.mocked(permissionsModule.requirePermission).mockReturnValue();
      vi.mocked(prisma.study.findUnique).mockResolvedValue(null);

      const res = await createTimeslot(validFormData);
      expect(res).toEqual({ success: false, error: 'Estudio no encontrado' });
    });

    it('falla si estudio no está activo', async () => {
      vi.mocked(authModule.auth).mockResolvedValue({ user: { id: 'u1', role: 'INV_PRINCIPAL' }, expires: '2025' });
      vi.mocked(permissionsModule.requirePermission).mockReturnValue();
      vi.mocked(prisma.study.findUnique).mockResolvedValue({ id: 'study-1', status: 'DRAFT', collaborators: [] } as any);

      const res = await createTimeslot(validFormData);
      expect(res).toEqual({ success: false, error: 'Solo se pueden agregar timeslots a estudios activos' });
    });

    it('crea timeslot exitosamente', async () => {
      vi.mocked(authModule.auth).mockResolvedValue({ user: { id: 'u1', role: 'INV_PRINCIPAL' }, expires: '2025' });
      vi.mocked(permissionsModule.requirePermission).mockReturnValue();
      vi.mocked(prisma.study.findUnique).mockResolvedValue({ id: 'study-1', status: 'ACTIVE', principalInvestigatorId: 'u1', collaborators: [] } as any);
      const createdTimeslot = { id: 'ts-1', startTime: new Date(), maxParticipants: 5, studyId: 'study-1' };
      vi.mocked(prisma.timeslot.create).mockResolvedValue(createdTimeslot as any);

      const res = await createTimeslot(validFormData);

      expect(res).toEqual({ success: true, data: createdTimeslot });
      expect(prisma.timeslot.create).toHaveBeenCalled();
      expect(auditModule.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'CREATE_TIMESLOT' }));
    });
  });

  describe('updateTimeslot', () => {
    it('retorna error si no hay sesión', async () => {
      vi.mocked(authModule.auth).mockResolvedValue(null);
      const res = await updateTimeslot('ts-1', {});
      expect(res).toEqual({ success: false, error: 'No autenticado' });
    });

    it('falla si timeslot no encontrado', async () => {
      vi.mocked(authModule.auth).mockResolvedValue({ user: { id: 'u1', role: 'INV_PRINCIPAL' }, expires: '2025' });
      vi.mocked(permissionsModule.requirePermission).mockReturnValue();
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValue(null);

      const res = await updateTimeslot('ts-1', {});
      expect(res).toEqual({ success: false, error: 'Timeslot no encontrado' });
    });

    it('falla si se intenta reducir maxParticipants por debajo de inscritos', async () => {
      vi.mocked(authModule.auth).mockResolvedValue({ user: { id: 'u1', role: 'INV_PRINCIPAL' }, expires: '2025' });
      vi.mocked(permissionsModule.requirePermission).mockReturnValue();
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValue({
        id: 'ts-1',
        study: { principalInvestigatorId: 'u1', collaborators: [] },
        _count: { participations: 5 },
      } as any);

      const res = await updateTimeslot('ts-1', { maxParticipants: 3 });
      expect(res).toEqual({ success: false, error: 'No se puede reducir a 3: ya hay 5 inscritos' });
    });

    it('actualiza exitosamente', async () => {
      vi.mocked(authModule.auth).mockResolvedValue({ user: { id: 'u1', role: 'INV_PRINCIPAL' }, expires: '2025' });
      vi.mocked(permissionsModule.requirePermission).mockReturnValue();
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValue({
        id: 'ts-1',
        startTime: new Date(),
        maxParticipants: 10,
        study: { principalInvestigatorId: 'u1', collaborators: [] },
        _count: { participations: 5 },
      } as any);

      const updatedTs = { id: 'ts-1', startTime: new Date(), maxParticipants: 15 };
      vi.mocked(prisma.timeslot.update).mockResolvedValue(updatedTs as any);

      const res = await updateTimeslot('ts-1', { maxParticipants: 15 });
      expect(res).toEqual({ success: true, data: updatedTs });
      expect(prisma.timeslot.update).toHaveBeenCalled();
      expect(auditModule.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'UPDATE_TIMESLOT' }));
    });
  });

  describe('cancelTimeslot', () => {
    it('retorna error si no hay sesión', async () => {
      vi.mocked(authModule.auth).mockResolvedValue(null);
      const res = await cancelTimeslot('ts-1');
      expect(res).toEqual({ success: false, error: 'No autenticado' });
    });

    it('falla si ya está cancelado', async () => {
      vi.mocked(authModule.auth).mockResolvedValue({ user: { id: 'u1', role: 'INV_PRINCIPAL' }, expires: '2025' });
      vi.mocked(permissionsModule.requirePermission).mockReturnValue();
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValue({
        id: 'ts-1',
        status: 'CANCELLED',
        study: { principalInvestigatorId: 'u1', collaborators: [] },
      } as any);

      const res = await cancelTimeslot('ts-1');
      expect(res).toEqual({ success: false, error: 'El timeslot ya está cancelado' });
    });

    it('cancela exitosamente y actualiza participaciones/waitlist', async () => {
      vi.mocked(authModule.auth).mockResolvedValue({ user: { id: 'u1', role: 'INV_PRINCIPAL' }, expires: '2025' });
      vi.mocked(permissionsModule.requirePermission).mockReturnValue();
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValue({
        id: 'ts-1',
        status: 'AVAILABLE',
        study: { principalInvestigatorId: 'u1', collaborators: [] },
      } as any);
      const cancelledTs = { id: 'ts-1', status: 'CANCELLED' };
      vi.mocked(prisma.participation.findMany).mockResolvedValue([]);
      vi.mocked(prisma.timeslot.update).mockResolvedValue(cancelledTs as any);

      const res = await cancelTimeslot('ts-1');
      expect(res).toEqual({ success: true, data: cancelledTs });
      expect(prisma.participation.updateMany).toHaveBeenCalled();
      expect(prisma.waitlistEntry.updateMany).toHaveBeenCalled();
      expect(prisma.timeslot.update).toHaveBeenCalled();
      expect(auditModule.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'CANCEL_TIMESLOT' }));
    });
  });

  describe('importTimeslots', () => {
    const validRows = [
      { fecha: '2025-01-01', horaInicio: '10:00', horaFin: '11:00', maxParticipantes: 5 },
      { fecha: '2025-01-01', horaInicio: '11:00', horaFin: '12:00', maxParticipantes: 0 }, // inválido mocked
    ];

    it('retorna error si no hay sesión', async () => {
      vi.mocked(authModule.auth).mockResolvedValue(null);
      const res = await importTimeslots('s-1', validRows);
      expect(res).toEqual({ success: false, error: 'No autenticado' });
    });

    it('falla si estudio no existe', async () => {
      vi.mocked(authModule.auth).mockResolvedValue({ user: { id: 'u1', role: 'INV_PRINCIPAL' }, expires: '2025' });
      vi.mocked(permissionsModule.requirePermission).mockReturnValue();
      vi.mocked(prisma.study.findUnique).mockResolvedValue(null);

      const res = await importTimeslots('s-1', validRows);
      expect(res).toEqual({ success: false, error: 'Estudio no encontrado' });
    });

    it('importa y retorna resumen exitoso', async () => {
      vi.mocked(authModule.auth).mockResolvedValue({ user: { id: 'u1', role: 'INV_PRINCIPAL' }, expires: '2025' });
      vi.mocked(permissionsModule.requirePermission).mockReturnValue();
      vi.mocked(prisma.study.findUnique).mockResolvedValue({
        id: 's-1',
        status: 'ACTIVE',
        principalInvestigatorId: 'u1',
        collaborators: [],
      } as any);

      const res = await importTimeslots('s-1', validRows);

      expect(res.success).toBe(true);
      expect((res.data as any).created).toBe(1); // One valid, one invalid based on our mock
      expect((res.data as any).errors.length).toBe(1);
      expect(auditModule.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'IMPORT_TIMESLOTS' }));
    });
  });
});
