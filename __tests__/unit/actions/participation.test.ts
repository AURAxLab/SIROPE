import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  signUpForTimeslot,
  cancelSignUp,
  joinWaitlist,
  markCompletion,
  bulkMarkCompletion,
  getParticipationHistory,
} from '@/app/actions/participation';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';
import { logAuditEvent } from '@/lib/audit';

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    timeslot: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    participation: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    prescreenAnswer: {
      findMany: vi.fn(),
    },
    systemConfig: {
      findUnique: vi.fn(),
    },
    waitlistEntry: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/permissions', () => ({
  requirePermission: vi.fn(),
  ACTIONS: {
    SIGN_UP_TIMESLOT: 'SIGN_UP_TIMESLOT',
    CANCEL_SIGN_UP: 'CANCEL_SIGN_UP',
    JOIN_WAITLIST: 'JOIN_WAITLIST',
    MARK_COMPLETION: 'MARK_COMPLETION',
    BULK_MARK_COMPLETION: 'BULK_MARK_COMPLETION',
    VIEW_OWN_HISTORY: 'VIEW_OWN_HISTORY',
  },
}));

vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn(),
}));

describe('Acciones de Participación', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signUpForTimeslot', () => {
    const mockSession = { user: { id: 'student-1', role: 'ESTUDIANTE' } };
    const mockTimeslot = {
      id: 'timeslot-1',
      studyId: 'study-1',
      status: 'AVAILABLE',
      maxParticipants: 5,
      study: { status: 'ACTIVE', prescreenQuestions: [] },
      _count: { participations: 0 },
    };

    it('retorna error si no está autenticado', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null as any);
      const result = await signUpForTimeslot('timeslot-1');
      expect(result).toEqual({ success: false, error: 'No autenticado' });
    });

    it('retorna error si el timeslot no existe', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValueOnce(null);
      const result = await signUpForTimeslot('timeslot-1');
      expect(result).toEqual({ success: false, error: 'Timeslot no encontrado' });
    });

    it('retorna error si el timeslot no está disponible', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValueOnce({
        ...mockTimeslot,
        status: 'FULL',
      } as any);
      const result = await signUpForTimeslot('timeslot-1');
      expect(result).toEqual({ success: false, error: 'Este timeslot no está disponible' });
    });

    it('retorna error si el estudio no está activo', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValueOnce({
        ...mockTimeslot,
        study: { status: 'COMPLETED', prescreenQuestions: [] },
      } as any);
      const result = await signUpForTimeslot('timeslot-1');
      expect(result).toEqual({ success: false, error: 'El estudio no está activo' });
    });

    it('retorna error si ya está inscrito', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValueOnce(mockTimeslot as any);
      vi.mocked(prisma.participation.findFirst).mockResolvedValueOnce({ id: 'part-1' } as any);
      const result = await signUpForTimeslot('timeslot-1');
      expect(result).toEqual({ success: false, error: 'Ya está inscrito o completó este estudio' });
    });

    it('retorna error si no completó preselección', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValueOnce({
        ...mockTimeslot,
        study: { status: 'ACTIVE', prescreenQuestions: [{ id: 'q1', requiredAnswer: 'Si' }] },
      } as any);
      vi.mocked(prisma.participation.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.prescreenAnswer.findMany).mockResolvedValueOnce([]);
      const result = await signUpForTimeslot('timeslot-1');
      expect(result).toEqual({
        success: false,
        error: 'Debe completar el cuestionario de preselección antes de inscribirse',
      });
    });

    it('retorna error si no es elegible por preselección', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValueOnce({
        ...mockTimeslot,
        study: { status: 'ACTIVE', prescreenQuestions: [{ id: 'q1', requiredAnswer: 'Si' }] },
      } as any);
      vi.mocked(prisma.participation.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.prescreenAnswer.findMany).mockResolvedValueOnce([
        { answer: 'No', question: { requiredAnswer: 'Si' } },
      ] as any);
      const result = await signUpForTimeslot('timeslot-1');
      expect(result).toEqual({
        success: false,
        error: 'No cumple con los criterios de elegibilidad del estudio',
      });
    });

    it('retorna error si timeslot lleno por _count', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValueOnce({
        ...mockTimeslot,
        _count: { participations: 5 },
      } as any);
      vi.mocked(prisma.participation.findFirst).mockResolvedValueOnce(null);
      const result = await signUpForTimeslot('timeslot-1');
      expect(result).toEqual({
        success: false,
        error: 'Este timeslot está lleno. Puede unirse a la lista de espera.',
      });
    });

    it('inscribe correctamente', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValueOnce(mockTimeslot as any);
      vi.mocked(prisma.participation.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.participation.create).mockResolvedValueOnce({ id: 'part-1' } as any);

      const result = await signUpForTimeslot('timeslot-1');

      expect(result).toEqual({ success: true, data: { id: 'part-1' } });
      expect(prisma.participation.create).toHaveBeenCalledWith({
        data: {
          studentId: 'student-1',
          studyId: 'study-1',
          timeslotId: 'timeslot-1',
          status: 'SIGNED_UP',
        },
      });
      expect(prisma.timeslot.update).toHaveBeenCalledWith({
        where: { id: 'timeslot-1' },
        data: { currentParticipants: 1 },
      });
      expect(logAuditEvent).toHaveBeenCalled();
    });

    it('inscribe y marca como lleno', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValueOnce({
        ...mockTimeslot,
        maxParticipants: 1,
      } as any);
      vi.mocked(prisma.participation.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.participation.create).mockResolvedValueOnce({ id: 'part-1' } as any);

      const result = await signUpForTimeslot('timeslot-1');

      expect(result.success).toBe(true);
      expect(prisma.timeslot.update).toHaveBeenCalledWith({
        where: { id: 'timeslot-1' },
        data: { currentParticipants: 1, status: 'FULL' },
      });
    });
  });

  describe('cancelSignUp', () => {
    const mockSession = { user: { id: 'student-1', role: 'ESTUDIANTE' } };
    const mockParticipation = {
      id: 'part-1',
      studentId: 'student-1',
      status: 'SIGNED_UP',
      timeslotId: 'timeslot-1',
      timeslot: {
        id: 'timeslot-1',
        startTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 horas en el futuro
        currentParticipants: 1,
        maxParticipants: 5,
      },
    };

    it('retorna error si no está autenticado', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null as any);
      const result = await cancelSignUp('part-1');
      expect(result).toEqual({ success: false, error: 'No autenticado' });
    });

    it('retorna error si no encuentra la inscripción', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.participation.findUnique).mockResolvedValueOnce(null);
      const result = await cancelSignUp('part-1');
      expect(result).toEqual({ success: false, error: 'Inscripción no encontrada' });
    });

    it('retorna error si no es la inscripción del usuario', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.participation.findUnique).mockResolvedValueOnce({
        ...mockParticipation,
        studentId: 'other-student',
      } as any);
      const result = await cancelSignUp('part-1');
      expect(result).toEqual({ success: false, error: 'Solo puede cancelar su propia inscripción' });
    });

    it('retorna error si la inscripción no está SIGNED_UP o REMINDED', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.participation.findUnique).mockResolvedValueOnce({
        ...mockParticipation,
        status: 'COMPLETED',
      } as any);
      const result = await cancelSignUp('part-1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('No se puede cancelar una inscripción en estado "COMPLETED"');
    });

    it('cancela correctamente sin penalización (tiempo suficiente)', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.participation.findUnique).mockResolvedValueOnce(mockParticipation as any);
      vi.mocked(prisma.systemConfig.findUnique).mockResolvedValueOnce({ value: '24' } as any);
      vi.mocked(prisma.waitlistEntry.findFirst).mockResolvedValueOnce(null);

      const result = await cancelSignUp('part-1');

      expect(result).toEqual({ success: true, data: { penalized: false } });
      expect(prisma.participation.update).toHaveBeenCalledWith({
        where: { id: 'part-1' },
        data: {
          status: 'CANCELLED',
          cancellationReason: 'Cancelado por el estudiante',
        },
      });
      expect(prisma.timeslot.update).toHaveBeenCalledWith({
        where: { id: 'timeslot-1' },
        data: { currentParticipants: 0, status: 'AVAILABLE' },
      });
      expect(logAuditEvent).toHaveBeenCalled();
    });

    it('cancela con penalización (fuera de tiempo)', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.participation.findUnique).mockResolvedValueOnce({
        ...mockParticipation,
        timeslot: {
          ...mockParticipation.timeslot,
          startTime: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 horas (menor a 24)
        },
      } as any);
      vi.mocked(prisma.systemConfig.findUnique).mockResolvedValueOnce(null); // Usa default 24h
      vi.mocked(prisma.waitlistEntry.findFirst).mockResolvedValueOnce(null);

      const result = await cancelSignUp('part-1');

      expect(result).toEqual({ success: true, data: { penalized: true } });
      expect(prisma.participation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            status: 'CANCELLED',
            cancellationReason: 'Cancelación tardía (< 24h antes)',
          },
        })
      );
    });

    it('promueve al usuario de la lista de espera si existe', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.participation.findUnique).mockResolvedValueOnce(mockParticipation as any);
      vi.mocked(prisma.systemConfig.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.waitlistEntry.findFirst).mockResolvedValueOnce({ id: 'wait-1' } as any);

      const result = await cancelSignUp('part-1');

      expect(result.success).toBe(true);
      expect(prisma.waitlistEntry.update).toHaveBeenCalledWith({
        where: { id: 'wait-1' },
        data: { status: 'NOTIFIED' },
      });
    });
  });

  describe('joinWaitlist', () => {
    const mockSession = { user: { id: 'student-1', role: 'ESTUDIANTE' } };
    const mockTimeslot = { id: 'timeslot-1', status: 'FULL' };

    it('retorna error si no está autenticado', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null as any);
      const result = await joinWaitlist('timeslot-1');
      expect(result).toEqual({ success: false, error: 'No autenticado' });
    });

    it('retorna error si el timeslot no existe', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValueOnce(null);
      const result = await joinWaitlist('timeslot-1');
      expect(result).toEqual({ success: false, error: 'Timeslot no encontrado' });
    });

    it('retorna error si el timeslot no está lleno', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValueOnce({
        ...mockTimeslot,
        status: 'AVAILABLE',
      } as any);
      const result = await joinWaitlist('timeslot-1');
      expect(result).toEqual({
        success: false,
        error: 'Solo puede unirse a la lista de espera si el timeslot está lleno',
      });
    });

    it('retorna error si ya está en la lista de espera', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValueOnce(mockTimeslot as any);
      vi.mocked(prisma.waitlistEntry.findFirst).mockResolvedValueOnce({ id: 'wait-1' } as any);
      const result = await joinWaitlist('timeslot-1');
      expect(result).toEqual({
        success: false,
        error: 'Ya está en la lista de espera de este timeslot',
      });
    });

    it('agrega a la lista de espera correctamente', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValueOnce(mockTimeslot as any);
      // No existe en waitlist
      vi.mocked(prisma.waitlistEntry.findFirst).mockResolvedValueOnce(null);
      // Última posición es 3
      vi.mocked(prisma.waitlistEntry.findFirst).mockResolvedValueOnce({ position: 3 } as any);
      vi.mocked(prisma.waitlistEntry.create).mockResolvedValueOnce({ id: 'new-wait', position: 4 } as any);

      const result = await joinWaitlist('timeslot-1');

      expect(result).toEqual({ success: true, data: { id: 'new-wait', position: 4 } });
      expect(prisma.waitlistEntry.create).toHaveBeenCalledWith({
        data: {
          timeslotId: 'timeslot-1',
          studentId: 'student-1',
          position: 4,
          status: 'WAITING',
        },
      });
      expect(logAuditEvent).toHaveBeenCalled();
    });

    it('agrega como primera posición si la lista está vacía', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.timeslot.findUnique).mockResolvedValueOnce(mockTimeslot as any);
      // No existe en waitlist
      vi.mocked(prisma.waitlistEntry.findFirst).mockResolvedValueOnce(null);
      // Última posición (no hay ninguna)
      vi.mocked(prisma.waitlistEntry.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.waitlistEntry.create).mockResolvedValueOnce({ id: 'new-wait', position: 1 } as any);

      const result = await joinWaitlist('timeslot-1');

      expect(result.success).toBe(true);
      expect(prisma.waitlistEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ position: 1 }),
        })
      );
    });
  });

  describe('markCompletion', () => {
    const mockSession = { user: { id: 'pi-1', role: 'INV_PRINCIPAL' } };
    const mockParticipation = {
      id: 'part-1',
      status: 'SIGNED_UP',
      study: {
        principalInvestigatorId: 'pi-1',
        collaborators: [],
        creditsWorth: 2,
      },
    };

    it('retorna error si no está autenticado', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null as any);
      const result = await markCompletion({ participationId: 'part-1', status: 'COMPLETED' });
      expect(result).toEqual({ success: false, error: 'No autenticado' });
    });

    it('retorna error si hay datos inválidos', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      const result = await markCompletion({ participationId: '', status: 'COMPLETED' } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('retorna error si no encuentra la participación', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.participation.findUnique).mockResolvedValueOnce(null);
      const result = await markCompletion({ participationId: 'part-1', status: 'COMPLETED' });
      expect(result).toEqual({ success: false, error: 'Participación no encontrada' });
    });

    it('retorna error si no tiene acceso al estudio', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'other-user', role: 'INV_EJECUTOR' } } as any);
      vi.mocked(prisma.participation.findUnique).mockResolvedValueOnce(mockParticipation as any);
      const result = await markCompletion({ participationId: 'part-1', status: 'COMPLETED' });
      expect(result).toEqual({ success: false, error: 'No tiene acceso a este estudio' });
    });

    it('retorna error si la participación no está en SIGNED_UP o REMINDED', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.participation.findUnique).mockResolvedValueOnce({
        ...mockParticipation,
        status: 'CANCELLED',
      } as any);
      const result = await markCompletion({ participationId: 'part-1', status: 'COMPLETED' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('No se puede marcar una participación en estado "CANCELLED"');
    });

    it('marca como COMPLETED correctamente', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.participation.findUnique).mockResolvedValueOnce(mockParticipation as any);

      const result = await markCompletion({ participationId: 'part-1', status: 'COMPLETED' });

      expect(result).toEqual({ success: true });
      expect(prisma.participation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'part-1' },
          data: expect.objectContaining({
            status: 'COMPLETED',
            completedById: 'pi-1',
            creditsEarned: 2,
          }),
        })
      );
      expect(logAuditEvent).toHaveBeenCalled();
    });

    it('marca como NO_SHOW correctamente', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.participation.findUnique).mockResolvedValueOnce(mockParticipation as any);

      const result = await markCompletion({ participationId: 'part-1', status: 'NO_SHOW' });

      expect(result).toEqual({ success: true });
      expect(prisma.participation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'part-1' },
          data: expect.objectContaining({
            status: 'NO_SHOW',
            completedById: 'pi-1',
            creditsEarned: 0,
          }),
        })
      );
    });

    it('permite a un colaborador marcar completitud', async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'collab-1', role: 'INV_EJECUTOR' } } as any);
      vi.mocked(prisma.participation.findUnique).mockResolvedValueOnce({
        ...mockParticipation,
        study: {
          ...mockParticipation.study,
          collaborators: [{ userId: 'collab-1' }],
        },
      } as any);

      const result = await markCompletion({ participationId: 'part-1', status: 'COMPLETED' });

      expect(result.success).toBe(true);
    });
  });

  describe('bulkMarkCompletion', () => {
    const mockSession = { user: { id: 'pi-1', role: 'INV_PRINCIPAL' } };
    const mockParticipation = {
      status: 'SIGNED_UP',
      study: { principalInvestigatorId: 'pi-1', collaborators: [], creditsWorth: 2 },
    };

    it('retorna error si no está autenticado', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null as any);
      const result = await bulkMarkCompletion({ participationIds: ['p1'], status: 'COMPLETED' });
      expect(result).toEqual({ success: false, error: 'No autenticado' });
    });

    it('retorna error si hay datos inválidos', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      const result = await bulkMarkCompletion({ participationIds: [], status: 'COMPLETED' } as any);
      expect(result.success).toBe(false);
    });

    it('procesa múltiples participaciones y cuenta actualizados y saltados', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      // Simular 3 llamadas a markCompletion (vía findUnique de Prisma)
      // 1: exitoso
      vi.mocked(prisma.participation.findUnique).mockResolvedValueOnce({ ...mockParticipation, id: 'p1' } as any);
      // 2: falla (no encontrado)
      vi.mocked(prisma.participation.findUnique).mockResolvedValueOnce(null);
      // 3: exitoso
      vi.mocked(prisma.participation.findUnique).mockResolvedValueOnce({ ...mockParticipation, id: 'p3' } as any);

      const result = await bulkMarkCompletion({ participationIds: ['p1', 'p2', 'p3'], status: 'COMPLETED' });

      expect(result).toEqual({ success: true, data: { updated: 2, skipped: 1 } });
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'BULK_MARK_COMPLETION',
          newState: {
            status: 'COMPLETED',
            count: 3,
            updated: 2,
            skipped: 1,
          },
        })
      );
    });
  });

  describe('getParticipationHistory', () => {
    const mockSession = { user: { id: 'student-1', role: 'ESTUDIANTE' } };

    it('retorna error si no está autenticado', async () => {
      vi.mocked(auth).mockResolvedValueOnce(null as any);
      const result = await getParticipationHistory();
      expect(result).toEqual({ success: false, error: 'No autenticado' });
    });

    it('retorna el historial correctamente', async () => {
      vi.mocked(auth).mockResolvedValueOnce(mockSession as any);
      const mockHistory = [{ id: 'part-1', status: 'COMPLETED' }, { id: 'part-2', status: 'SIGNED_UP' }];
      vi.mocked(prisma.participation.findMany).mockResolvedValueOnce(mockHistory as any);

      const result = await getParticipationHistory();

      expect(result).toEqual({ success: true, data: mockHistory });
      expect(prisma.participation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { studentId: 'student-1' },
          orderBy: { signedUpAt: 'desc' },
        })
      );
    });
  });
});
