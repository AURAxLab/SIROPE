import { describe, it, expect, vi, beforeEach } from 'vitest';
import prisma from '@/lib/prisma';
import * as emailLib from '@/lib/email';
import {
  notifySignUp,
  notifyCancellation,
  notifyWaitlistPromotion,
  notifyStudyReview,
  notifyCreditsEarned,
  processReminders,
} from '@/app/actions/notifications';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  default: {
    participation: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    waitlistEntry: {
      findUnique: vi.fn(),
    },
    study: {
      findUnique: vi.fn(),
    },
    systemConfig: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/email', () => ({
  sendSignUpConfirmation: vi.fn(),
  sendReminder: vi.fn(),
  sendCreditsGranted: vi.fn(),
  sendNewSignUpNotification: vi.fn(),
  sendCancellationConfirmation: vi.fn(),
  sendWaitlistPromotion: vi.fn(),
  sendStudyApproved: vi.fn(),
  sendStudyRejected: vi.fn(),
}));

describe('Notifications Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('notifySignUp', () => {
    it('debería enviar notificaciones al estudiante y al IP si la participación existe', async () => {
      // Setup mock data
      const mockParticipation = {
        id: 'part-1',
        student: { name: 'Juan Perez', email: 'juan@example.com' },
        study: {
          title: 'Estudio de Memoria',
          principalInvestigator: { name: 'Dra. Silva', email: 'silva@example.com' },
        },
        timeslot: {
          startTime: new Date('2024-06-01T10:00:00Z'),
          endTime: new Date('2024-06-01T11:00:00Z'),
          location: 'Lab 1',
        },
      };

      vi.mocked(prisma.participation.findUnique).mockResolvedValue(mockParticipation as any);

      // Call action
      await notifySignUp('part-1');

      // Verify Prisma call
      expect(prisma.participation.findUnique).toHaveBeenCalledWith({
        where: { id: 'part-1' },
        include: {
          student: { select: { name: true, email: true } },
          study: {
            select: {
              title: true,
              principalInvestigator: { select: { name: true, email: true } },
            },
          },
          timeslot: { select: { startTime: true, endTime: true, location: true } },
        },
      });

      // Verify Email calls
      expect(emailLib.sendSignUpConfirmation).toHaveBeenCalledWith(
        'juan@example.com',
        'Juan Perez',
        'Estudio de Memoria',
        expect.any(String), // Date format depends on locale
        'Lab 1'
      );

      expect(emailLib.sendNewSignUpNotification).toHaveBeenCalledWith(
        'silva@example.com',
        'Dra. Silva',
        'Juan Perez',
        'Estudio de Memoria',
        expect.any(String)
      );
    });

    it('no debería enviar notificaciones si la participación no existe', async () => {
      vi.mocked(prisma.participation.findUnique).mockResolvedValue(null);

      await notifySignUp('non-existent');

      expect(emailLib.sendSignUpConfirmation).not.toHaveBeenCalled();
      expect(emailLib.sendNewSignUpNotification).not.toHaveBeenCalled();
    });
  });

  describe('notifyCancellation', () => {
    const mockParticipation = {
      id: 'part-2',
      student: { name: 'Maria Gomez', email: 'maria@example.com' },
      study: { title: 'Estudio Visual' },
    };

    it('debería enviar notificación de cancelación sin penalización', async () => {
      vi.mocked(prisma.participation.findUnique).mockResolvedValue(mockParticipation as any);

      await notifyCancellation('part-2', false);

      expect(prisma.participation.findUnique).toHaveBeenCalledWith({
        where: { id: 'part-2' },
        include: {
          student: { select: { name: true, email: true } },
          study: { select: { title: true } },
        },
      });

      expect(emailLib.sendCancellationConfirmation).toHaveBeenCalledWith(
        'maria@example.com',
        'Maria Gomez',
        'Estudio Visual',
        false
      );
    });

    it('debería enviar notificación de cancelación con penalización', async () => {
      vi.mocked(prisma.participation.findUnique).mockResolvedValue(mockParticipation as any);

      await notifyCancellation('part-2', true);

      expect(emailLib.sendCancellationConfirmation).toHaveBeenCalledWith(
        'maria@example.com',
        'Maria Gomez',
        'Estudio Visual',
        true
      );
    });

    it('no debería enviar notificación si la participación no existe', async () => {
      vi.mocked(prisma.participation.findUnique).mockResolvedValue(null);

      await notifyCancellation('non-existent', false);

      expect(emailLib.sendCancellationConfirmation).not.toHaveBeenCalled();
    });
  });

  describe('notifyWaitlistPromotion', () => {
    const mockWaitlistEntry = {
      id: 'wl-1',
      student: { name: 'Carlos Ruiz', email: 'carlos@example.com' },
      timeslot: {
        startTime: new Date('2024-06-02T14:00:00Z'),
        study: { title: 'Estudio Cognitivo' },
      },
    };

    it('debería enviar notificación usando las horas de expiración configuradas', async () => {
      vi.mocked(prisma.waitlistEntry.findUnique).mockResolvedValue(mockWaitlistEntry as any);
      vi.mocked(prisma.systemConfig.findUnique).mockResolvedValue({
        key: 'WAITLIST_EXPIRATION_HOURS',
        value: '24',
      } as any);

      await notifyWaitlistPromotion('wl-1');

      expect(prisma.waitlistEntry.findUnique).toHaveBeenCalledWith({
        where: { id: 'wl-1' },
        include: {
          student: { select: { name: true, email: true } },
          timeslot: {
            select: {
              startTime: true,
              study: { select: { title: true } },
            },
          },
        },
      });

      expect(emailLib.sendWaitlistPromotion).toHaveBeenCalledWith(
        'carlos@example.com',
        'Carlos Ruiz',
        'Estudio Cognitivo',
        expect.any(String),
        24
      );
    });

    it('debería enviar notificación usando 12 horas por defecto si no hay configuración', async () => {
      vi.mocked(prisma.waitlistEntry.findUnique).mockResolvedValue(mockWaitlistEntry as any);
      vi.mocked(prisma.systemConfig.findUnique).mockResolvedValue(null);

      await notifyWaitlistPromotion('wl-1');

      expect(emailLib.sendWaitlistPromotion).toHaveBeenCalledWith(
        'carlos@example.com',
        'Carlos Ruiz',
        'Estudio Cognitivo',
        expect.any(String),
        12
      );
    });

    it('no debería enviar notificación si la entrada de lista de espera no existe', async () => {
      vi.mocked(prisma.waitlistEntry.findUnique).mockResolvedValue(null);

      await notifyWaitlistPromotion('non-existent');

      expect(emailLib.sendWaitlistPromotion).not.toHaveBeenCalled();
    });
  });

  describe('notifyStudyReview', () => {
    const mockStudy = {
      id: 'study-1',
      title: 'Estudio de Comportamiento',
      principalInvestigator: { name: 'Dr. Lopez', email: 'lopez@example.com' },
    };

    it('debería enviar notificación de aprobación cuando approved es true', async () => {
      vi.mocked(prisma.study.findUnique).mockResolvedValue(mockStudy as any);

      await notifyStudyReview('study-1', true);

      expect(prisma.study.findUnique).toHaveBeenCalledWith({
        where: { id: 'study-1' },
        include: {
          principalInvestigator: { select: { name: true, email: true } },
        },
      });

      expect(emailLib.sendStudyApproved).toHaveBeenCalledWith(
        'lopez@example.com',
        'Dr. Lopez',
        'Estudio de Comportamiento'
      );
      expect(emailLib.sendStudyRejected).not.toHaveBeenCalled();
    });

    it('debería enviar notificación de rechazo con razón cuando approved es false', async () => {
      vi.mocked(prisma.study.findUnique).mockResolvedValue(mockStudy as any);

      await notifyStudyReview('study-1', false, 'Falta información ética');

      expect(emailLib.sendStudyRejected).toHaveBeenCalledWith(
        'lopez@example.com',
        'Dr. Lopez',
        'Estudio de Comportamiento',
        'Falta información ética'
      );
      expect(emailLib.sendStudyApproved).not.toHaveBeenCalled();
    });

    it('debería enviar notificación de rechazo con razón por defecto cuando no se provee', async () => {
      vi.mocked(prisma.study.findUnique).mockResolvedValue(mockStudy as any);

      await notifyStudyReview('study-1', false);

      expect(emailLib.sendStudyRejected).toHaveBeenCalledWith(
        'lopez@example.com',
        'Dr. Lopez',
        'Estudio de Comportamiento',
        'No se proporcionó una razón específica.'
      );
    });

    it('no debería enviar notificación si el estudio no existe', async () => {
      vi.mocked(prisma.study.findUnique).mockResolvedValue(null);

      await notifyStudyReview('non-existent', true);

      expect(emailLib.sendStudyApproved).not.toHaveBeenCalled();
      expect(emailLib.sendStudyRejected).not.toHaveBeenCalled();
    });
  });

  describe('notifyCreditsEarned', () => {
    const mockParticipation = {
      id: 'part-3',
      student: { name: 'Luis Vargas', email: 'luis@example.com' },
      study: { title: 'Estudio Físico', creditsWorth: 2 },
    };

    it('debería enviar notificación de créditos otorgados', async () => {
      vi.mocked(prisma.participation.findUnique).mockResolvedValue(mockParticipation as any);

      await notifyCreditsEarned('part-3');

      expect(prisma.participation.findUnique).toHaveBeenCalledWith({
        where: { id: 'part-3' },
        include: {
          student: { select: { name: true, email: true } },
          study: { select: { title: true, creditsWorth: true } },
        },
      });

      expect(emailLib.sendCreditsGranted).toHaveBeenCalledWith(
        'luis@example.com',
        'Luis Vargas',
        'Estudio Físico',
        2
      );
    });

    it('no debería enviar notificación si la participación no existe', async () => {
      vi.mocked(prisma.participation.findUnique).mockResolvedValue(null);

      await notifyCreditsEarned('non-existent');

      expect(emailLib.sendCreditsGranted).not.toHaveBeenCalled();
    });
  });

  describe('processReminders', () => {
    it('debería procesar los recordatorios y retornar el resumen', async () => {
      const mockParticipations = [
        {
          id: 'part-1',
          student: { name: 'Estudiante 1', email: 'est1@example.com' },
          study: { title: 'Estudio 1' },
          timeslot: { startTime: new Date(), location: 'Lab A' },
        },
        {
          id: 'part-2',
          student: { name: 'Estudiante 2', email: 'est2@example.com' },
          study: { title: 'Estudio 2' },
          timeslot: { startTime: new Date(), location: 'Lab B' },
        },
      ];

      vi.mocked(prisma.participation.findMany).mockResolvedValue(mockParticipations as any);

      // El primero tiene éxito, el segundo falla
      vi.mocked(emailLib.sendReminder)
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: 'Network error' });

      const result = await processReminders();

      expect(prisma.participation.findMany).toHaveBeenCalledWith({
        where: {
          status: 'SIGNED_UP',
          timeslot: {
            startTime: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
            status: { not: 'CANCELLED' },
          },
        },
        include: {
          student: { select: { name: true, email: true } },
          study: { select: { title: true } },
          timeslot: { select: { startTime: true, location: true } },
        },
      });

      expect(emailLib.sendReminder).toHaveBeenCalledTimes(2);

      // Solo actualiza la participación que tuvo éxito
      expect(prisma.participation.update).toHaveBeenCalledTimes(1);
      expect(prisma.participation.update).toHaveBeenCalledWith({
        where: { id: 'part-1' },
        data: { status: 'REMINDED' },
      });

      expect(result).toEqual({
        success: true,
        data: { sent: 1, errors: 1 },
      });
    });

    it('debería retornar 0 enviados si no hay participaciones', async () => {
      vi.mocked(prisma.participation.findMany).mockResolvedValue([]);

      const result = await processReminders();

      expect(emailLib.sendReminder).not.toHaveBeenCalled();
      expect(prisma.participation.update).not.toHaveBeenCalled();

      expect(result).toEqual({
        success: true,
        data: { sent: 0, errors: 0 },
      });
    });
  });
});
