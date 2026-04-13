import { describe, it, expect, vi, beforeEach } from 'vitest';
import prisma from '@/lib/prisma';
import * as email from '@/lib/email';
import {
  notifySignUp,
  notifyCancellation,
  notifyWaitlistPromotion,
  notifyStudyReview,
  notifyCreditsEarned,
  processReminders
} from '@/app/actions/notifications';

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
    systemConfig: {
      findUnique: vi.fn(),
    },
    study: {
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

describe('Notificaciones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('notifySignUp', () => {
    it('debe enviar notificaciones de inscripción si la participación existe', async () => {
      const mockParticipation = {
        id: 'part-123',
        student: { name: 'Estudiante Test', email: 'estudiante@test.com' },
        study: {
          title: 'Estudio Test',
          principalInvestigator: { name: 'IP Test', email: 'ip@test.com' },
        },
        timeslot: {
          startTime: new Date('2024-01-01T10:00:00Z'),
          endTime: new Date('2024-01-01T11:00:00Z'),
          location: 'Lab 1',
        },
      };

      vi.mocked(prisma.participation.findUnique).mockResolvedValueOnce(mockParticipation as any);

      await notifySignUp('part-123');

      expect(prisma.participation.findUnique).toHaveBeenCalledWith({
        where: { id: 'part-123' },
        include: expect.any(Object),
      });

      expect(email.sendSignUpConfirmation).toHaveBeenCalledWith(
        'estudiante@test.com',
        'Estudiante Test',
        'Estudio Test',
        expect.any(String),
        'Lab 1'
      );

      expect(email.sendNewSignUpNotification).toHaveBeenCalledWith(
        'ip@test.com',
        'IP Test',
        'Estudiante Test',
        'Estudio Test',
        expect.any(String)
      );
    });

    it('no debe hacer nada si la participación no existe', async () => {
      vi.mocked(prisma.participation.findUnique).mockResolvedValueOnce(null);

      await notifySignUp('part-123');

      expect(email.sendSignUpConfirmation).not.toHaveBeenCalled();
      expect(email.sendNewSignUpNotification).not.toHaveBeenCalled();
    });
  });

  describe('notifyCancellation', () => {
    it('debe enviar confirmación de cancelación si existe la participación', async () => {
      const mockParticipation = {
        id: 'part-123',
        student: { name: 'Estudiante Test', email: 'estudiante@test.com' },
        study: { title: 'Estudio Test' },
      };

      vi.mocked(prisma.participation.findUnique).mockResolvedValueOnce(mockParticipation as any);

      await notifyCancellation('part-123', true);

      expect(prisma.participation.findUnique).toHaveBeenCalledWith({
        where: { id: 'part-123' },
        include: expect.any(Object),
      });

      expect(email.sendCancellationConfirmation).toHaveBeenCalledWith(
        'estudiante@test.com',
        'Estudiante Test',
        'Estudio Test',
        true
      );
    });

    it('no debe hacer nada si no existe la participación', async () => {
      vi.mocked(prisma.participation.findUnique).mockResolvedValueOnce(null);

      await notifyCancellation('part-123', false);

      expect(email.sendCancellationConfirmation).not.toHaveBeenCalled();
    });
  });

  describe('notifyWaitlistPromotion', () => {
    it('debe enviar notificación de waitlist promotion con horas por defecto si no hay config', async () => {
      const mockEntry = {
        id: 'wl-123',
        student: { name: 'Estudiante Test', email: 'estudiante@test.com' },
        timeslot: {
          startTime: new Date('2024-01-01T10:00:00Z'),
          study: { title: 'Estudio Test' },
        },
      };

      vi.mocked(prisma.waitlistEntry.findUnique).mockResolvedValueOnce(mockEntry as any);
      vi.mocked(prisma.systemConfig.findUnique).mockResolvedValueOnce(null);

      await notifyWaitlistPromotion('wl-123');

      expect(prisma.waitlistEntry.findUnique).toHaveBeenCalledWith({
        where: { id: 'wl-123' },
        include: expect.any(Object),
      });

      expect(prisma.systemConfig.findUnique).toHaveBeenCalledWith({
        where: { key: 'WAITLIST_EXPIRATION_HOURS' },
      });

      expect(email.sendWaitlistPromotion).toHaveBeenCalledWith(
        'estudiante@test.com',
        'Estudiante Test',
        'Estudio Test',
        expect.any(String),
        12 // Por defecto
      );
    });

    it('debe enviar notificación de waitlist promotion usando la config de horas', async () => {
      const mockEntry = {
        id: 'wl-123',
        student: { name: 'Estudiante Test', email: 'estudiante@test.com' },
        timeslot: {
          startTime: new Date('2024-01-01T10:00:00Z'),
          study: { title: 'Estudio Test' },
        },
      };

      vi.mocked(prisma.waitlistEntry.findUnique).mockResolvedValueOnce(mockEntry as any);
      vi.mocked(prisma.systemConfig.findUnique).mockResolvedValueOnce({ value: '24' } as any);

      await notifyWaitlistPromotion('wl-123');

      expect(email.sendWaitlistPromotion).toHaveBeenCalledWith(
        'estudiante@test.com',
        'Estudiante Test',
        'Estudio Test',
        expect.any(String),
        24
      );
    });

    it('no debe hacer nada si no existe el waitlist entry', async () => {
      vi.mocked(prisma.waitlistEntry.findUnique).mockResolvedValueOnce(null);

      await notifyWaitlistPromotion('wl-123');

      expect(email.sendWaitlistPromotion).not.toHaveBeenCalled();
    });
  });

  describe('notifyStudyReview', () => {
    it('debe enviar notificación de aprobación cuando approved es true', async () => {
      const mockStudy = {
        id: 'study-123',
        title: 'Estudio Test',
        principalInvestigator: { name: 'IP Test', email: 'ip@test.com' },
      };

      vi.mocked(prisma.study.findUnique).mockResolvedValueOnce(mockStudy as any);

      await notifyStudyReview('study-123', true);

      expect(prisma.study.findUnique).toHaveBeenCalledWith({
        where: { id: 'study-123' },
        include: expect.any(Object),
      });

      expect(email.sendStudyApproved).toHaveBeenCalledWith(
        'ip@test.com',
        'IP Test',
        'Estudio Test'
      );
      expect(email.sendStudyRejected).not.toHaveBeenCalled();
    });

    it('debe enviar notificación de rechazo cuando approved es false', async () => {
      const mockStudy = {
        id: 'study-123',
        title: 'Estudio Test',
        principalInvestigator: { name: 'IP Test', email: 'ip@test.com' },
      };

      vi.mocked(prisma.study.findUnique).mockResolvedValueOnce(mockStudy as any);

      await notifyStudyReview('study-123', false, 'Faltan detalles');

      expect(email.sendStudyRejected).toHaveBeenCalledWith(
        'ip@test.com',
        'IP Test',
        'Estudio Test',
        'Faltan detalles'
      );
      expect(email.sendStudyApproved).not.toHaveBeenCalled();
    });

    it('debe enviar notificación de rechazo con razón por defecto si no se proporciona', async () => {
      const mockStudy = {
        id: 'study-123',
        title: 'Estudio Test',
        principalInvestigator: { name: 'IP Test', email: 'ip@test.com' },
      };

      vi.mocked(prisma.study.findUnique).mockResolvedValueOnce(mockStudy as any);

      await notifyStudyReview('study-123', false);

      expect(email.sendStudyRejected).toHaveBeenCalledWith(
        'ip@test.com',
        'IP Test',
        'Estudio Test',
        'No se proporcionó una razón específica.'
      );
    });

    it('no debe hacer nada si el estudio no existe', async () => {
      vi.mocked(prisma.study.findUnique).mockResolvedValueOnce(null);

      await notifyStudyReview('study-123', true);

      expect(email.sendStudyApproved).not.toHaveBeenCalled();
      expect(email.sendStudyRejected).not.toHaveBeenCalled();
    });
  });

  describe('notifyCreditsEarned', () => {
    it('debe enviar notificación de créditos cuando existe la participación', async () => {
      const mockParticipation = {
        id: 'part-123',
        student: { name: 'Estudiante Test', email: 'estudiante@test.com' },
        study: { title: 'Estudio Test', creditsWorth: 1.5 },
      };

      vi.mocked(prisma.participation.findUnique).mockResolvedValueOnce(mockParticipation as any);

      await notifyCreditsEarned('part-123');

      expect(prisma.participation.findUnique).toHaveBeenCalledWith({
        where: { id: 'part-123' },
        include: expect.any(Object),
      });

      expect(email.sendCreditsGranted).toHaveBeenCalledWith(
        'estudiante@test.com',
        'Estudiante Test',
        'Estudio Test',
        1.5
      );
    });

    it('no debe hacer nada si la participación no existe', async () => {
      vi.mocked(prisma.participation.findUnique).mockResolvedValueOnce(null);

      await notifyCreditsEarned('part-123');

      expect(email.sendCreditsGranted).not.toHaveBeenCalled();
    });
  });

  describe('processReminders', () => {
    it('debe procesar recordatorios y actualizar el estado si es exitoso', async () => {
      const mockParticipations = [
        {
          id: 'part-1',
          student: { name: 'Estudiante 1', email: 'est1@test.com' },
          study: { title: 'Estudio 1' },
          timeslot: { startTime: new Date('2024-01-01T10:00:00Z'), location: 'Lab 1' },
        },
        {
          id: 'part-2',
          student: { name: 'Estudiante 2', email: 'est2@test.com' },
          study: { title: 'Estudio 2' },
          timeslot: { startTime: new Date('2024-01-01T12:00:00Z'), location: null },
        },
      ];

      vi.mocked(prisma.participation.findMany).mockResolvedValueOnce(mockParticipations as any);

      // Simular que el primer email es exitoso y el segundo falla
      vi.mocked(email.sendReminder).mockResolvedValueOnce({ success: true });
      vi.mocked(email.sendReminder).mockResolvedValueOnce({ success: false, error: 'Failed' });

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
        include: expect.any(Object),
      });

      expect(email.sendReminder).toHaveBeenCalledTimes(2);
      expect(email.sendReminder).toHaveBeenNthCalledWith(
        1,
        'est1@test.com',
        'Estudiante 1',
        'Estudio 1',
        expect.any(String),
        'Lab 1'
      );
      expect(email.sendReminder).toHaveBeenNthCalledWith(
        2,
        'est2@test.com',
        'Estudiante 2',
        'Estudio 2',
        expect.any(String),
        'Por confirmar'
      );

      // Solo debe actualizar la participación que tuvo envío exitoso
      expect(prisma.participation.update).toHaveBeenCalledTimes(1);
      expect(prisma.participation.update).toHaveBeenCalledWith({
        where: { id: 'part-1' },
        data: { status: 'REMINDED' },
      });

      expect(result).toEqual({ success: true, data: { sent: 1, errors: 1 } });
    });

    it('debe devolver sent 0 si no hay participaciones para recordar', async () => {
      vi.mocked(prisma.participation.findMany).mockResolvedValueOnce([]);

      const result = await processReminders();

      expect(email.sendReminder).not.toHaveBeenCalled();
      expect(prisma.participation.update).not.toHaveBeenCalled();

      expect(result).toEqual({ success: true, data: { sent: 0, errors: 0 } });
    });
  });
});
