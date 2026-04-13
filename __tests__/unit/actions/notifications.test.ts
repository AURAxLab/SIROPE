import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import prisma from '@/lib/prisma';
import {
  notifySignUp,
  notifyCancellation,
  notifyWaitlistPromotion,
  notifyStudyReview,
  notifyCreditsEarned,
  processReminders,
} from '@/app/actions/notifications';
import * as email from '@/lib/email';

// Mock dependencias
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
  sendNewSignUpNotification: vi.fn(),
  sendCancellationConfirmation: vi.fn(),
  sendWaitlistPromotion: vi.fn(),
  sendStudyApproved: vi.fn(),
  sendStudyRejected: vi.fn(),
  sendCreditsGranted: vi.fn(),
  sendReminder: vi.fn(),
}));

describe('Notificaciones Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('notifySignUp', () => {
    it('debe notificar al estudiante y al IP', async () => {
      const mockParticipation = {
        id: 'part-1',
        student: { name: 'Estudiante A', email: 'est@est.com' },
        study: {
          title: 'Estudio A',
          principalInvestigator: { name: 'Inv A', email: 'inv@inv.com' },
        },
        timeslot: {
          startTime: new Date('2024-01-01T10:00:00Z'),
          endTime: new Date('2024-01-01T11:00:00Z'),
          location: 'Lab 1',
        },
      };

      vi.mocked(prisma.participation.findUnique).mockResolvedValueOnce(mockParticipation as any);

      await notifySignUp('part-1');

      expect(prisma.participation.findUnique).toHaveBeenCalledWith({
        where: { id: 'part-1' },
        include: expect.any(Object),
      });

      expect(email.sendSignUpConfirmation).toHaveBeenCalledWith(
        'est@est.com',
        'Estudiante A',
        'Estudio A',
        expect.any(String),
        'Lab 1'
      );

      expect(email.sendNewSignUpNotification).toHaveBeenCalledWith(
        'inv@inv.com',
        'Inv A',
        'Estudiante A',
        'Estudio A',
        expect.any(String)
      );
    });

    it('debe manejar fallback de location', async () => {
      const mockParticipation = {
        id: 'part-1',
        student: { name: 'Estudiante A', email: 'est@est.com' },
        study: {
          title: 'Estudio A',
          principalInvestigator: { name: 'Inv A', email: 'inv@inv.com' },
        },
        timeslot: {
          startTime: new Date('2024-01-01T10:00:00Z'),
          endTime: new Date('2024-01-01T11:00:00Z'),
          location: null,
        },
      };

      vi.mocked(prisma.participation.findUnique).mockResolvedValueOnce(mockParticipation as any);

      await notifySignUp('part-1');

      expect(email.sendSignUpConfirmation).toHaveBeenCalledWith(
        'est@est.com',
        'Estudiante A',
        'Estudio A',
        expect.any(String),
        'Por confirmar'
      );
    });

    it('no debe hacer nada si la participación no existe', async () => {
      vi.mocked(prisma.participation.findUnique).mockResolvedValueOnce(null);

      await notifySignUp('part-1');

      expect(email.sendSignUpConfirmation).not.toHaveBeenCalled();
      expect(email.sendNewSignUpNotification).not.toHaveBeenCalled();
    });
  });

  describe('notifyCancellation', () => {
    it('debe notificar cancelación con penalización', async () => {
      const mockParticipation = {
        id: 'part-1',
        student: { name: 'Estudiante A', email: 'est@est.com' },
        study: { title: 'Estudio A' },
      };

      vi.mocked(prisma.participation.findUnique).mockResolvedValueOnce(mockParticipation as any);

      await notifyCancellation('part-1', true);

      expect(prisma.participation.findUnique).toHaveBeenCalledWith({
        where: { id: 'part-1' },
        include: expect.any(Object),
      });

      expect(email.sendCancellationConfirmation).toHaveBeenCalledWith(
        'est@est.com',
        'Estudiante A',
        'Estudio A',
        true
      );
    });

    it('debe notificar cancelación sin penalización', async () => {
      const mockParticipation = {
        id: 'part-1',
        student: { name: 'Estudiante A', email: 'est@est.com' },
        study: { title: 'Estudio A' },
      };

      vi.mocked(prisma.participation.findUnique).mockResolvedValueOnce(mockParticipation as any);

      await notifyCancellation('part-1', false);

      expect(email.sendCancellationConfirmation).toHaveBeenCalledWith(
        'est@est.com',
        'Estudiante A',
        'Estudio A',
        false
      );
    });

    it('no debe hacer nada si la participación no existe', async () => {
      vi.mocked(prisma.participation.findUnique).mockResolvedValueOnce(null);

      await notifyCancellation('part-1', false);

      expect(email.sendCancellationConfirmation).not.toHaveBeenCalled();
    });
  });

  describe('notifyWaitlistPromotion', () => {
    it('debe notificar promoción de lista de espera con expiración configurable', async () => {
      const mockEntry = {
        id: 'wl-1',
        student: { name: 'Estudiante B', email: 'estb@est.com' },
        timeslot: {
          startTime: new Date('2024-01-01T10:00:00Z'),
          study: { title: 'Estudio B' },
        },
      };

      vi.mocked(prisma.waitlistEntry.findUnique).mockResolvedValueOnce(mockEntry as any);
      vi.mocked(prisma.systemConfig.findUnique).mockResolvedValueOnce({ value: '24' } as any);

      await notifyWaitlistPromotion('wl-1');

      expect(prisma.waitlistEntry.findUnique).toHaveBeenCalledWith({
        where: { id: 'wl-1' },
        include: expect.any(Object),
      });
      expect(prisma.systemConfig.findUnique).toHaveBeenCalledWith({
        where: { key: 'WAITLIST_EXPIRATION_HOURS' },
      });

      expect(email.sendWaitlistPromotion).toHaveBeenCalledWith(
        'estb@est.com',
        'Estudiante B',
        'Estudio B',
        expect.any(String),
        24
      );
    });

    it('debe usar expiración de 12 horas por defecto', async () => {
      const mockEntry = {
        id: 'wl-1',
        student: { name: 'Estudiante B', email: 'estb@est.com' },
        timeslot: {
          startTime: new Date('2024-01-01T10:00:00Z'),
          study: { title: 'Estudio B' },
        },
      };

      vi.mocked(prisma.waitlistEntry.findUnique).mockResolvedValueOnce(mockEntry as any);
      vi.mocked(prisma.systemConfig.findUnique).mockResolvedValueOnce(null);

      await notifyWaitlistPromotion('wl-1');

      expect(email.sendWaitlistPromotion).toHaveBeenCalledWith(
        'estb@est.com',
        'Estudiante B',
        'Estudio B',
        expect.any(String),
        12
      );
    });

    it('no debe hacer nada si la entrada no existe', async () => {
      vi.mocked(prisma.waitlistEntry.findUnique).mockResolvedValueOnce(null);

      await notifyWaitlistPromotion('wl-1');

      expect(email.sendWaitlistPromotion).not.toHaveBeenCalled();
    });
  });

  describe('notifyStudyReview', () => {
    it('debe notificar estudio aprobado', async () => {
      const mockStudy = {
        id: 'study-1',
        title: 'Estudio Aprobado',
        principalInvestigator: { name: 'Inv A', email: 'inv@inv.com' },
      };

      vi.mocked(prisma.study.findUnique).mockResolvedValueOnce(mockStudy as any);

      await notifyStudyReview('study-1', true);

      expect(prisma.study.findUnique).toHaveBeenCalledWith({
        where: { id: 'study-1' },
        include: expect.any(Object),
      });

      expect(email.sendStudyApproved).toHaveBeenCalledWith(
        'inv@inv.com',
        'Inv A',
        'Estudio Aprobado'
      );
      expect(email.sendStudyRejected).not.toHaveBeenCalled();
    });

    it('debe notificar estudio rechazado con razón', async () => {
      const mockStudy = {
        id: 'study-1',
        title: 'Estudio Rechazado',
        principalInvestigator: { name: 'Inv A', email: 'inv@inv.com' },
      };

      vi.mocked(prisma.study.findUnique).mockResolvedValueOnce(mockStudy as any);

      await notifyStudyReview('study-1', false, 'Falta información');

      expect(email.sendStudyRejected).toHaveBeenCalledWith(
        'inv@inv.com',
        'Inv A',
        'Estudio Rechazado',
        'Falta información'
      );
      expect(email.sendStudyApproved).not.toHaveBeenCalled();
    });

    it('debe notificar estudio rechazado con razón por defecto', async () => {
      const mockStudy = {
        id: 'study-1',
        title: 'Estudio Rechazado',
        principalInvestigator: { name: 'Inv A', email: 'inv@inv.com' },
      };

      vi.mocked(prisma.study.findUnique).mockResolvedValueOnce(mockStudy as any);

      await notifyStudyReview('study-1', false);

      expect(email.sendStudyRejected).toHaveBeenCalledWith(
        'inv@inv.com',
        'Inv A',
        'Estudio Rechazado',
        'No se proporcionó una razón específica.'
      );
    });

    it('no debe hacer nada si el estudio no existe', async () => {
      vi.mocked(prisma.study.findUnique).mockResolvedValueOnce(null);

      await notifyStudyReview('study-1', true);

      expect(email.sendStudyApproved).not.toHaveBeenCalled();
      expect(email.sendStudyRejected).not.toHaveBeenCalled();
    });
  });

  describe('notifyCreditsEarned', () => {
    it('debe notificar créditos ganados', async () => {
      const mockParticipation = {
        id: 'part-1',
        student: { name: 'Estudiante C', email: 'estc@est.com' },
        study: { title: 'Estudio C', creditsWorth: 2.5 },
      };

      vi.mocked(prisma.participation.findUnique).mockResolvedValueOnce(mockParticipation as any);

      await notifyCreditsEarned('part-1');

      expect(prisma.participation.findUnique).toHaveBeenCalledWith({
        where: { id: 'part-1' },
        include: expect.any(Object),
      });

      expect(email.sendCreditsGranted).toHaveBeenCalledWith(
        'estc@est.com',
        'Estudiante C',
        'Estudio C',
        2.5
      );
    });

    it('no debe hacer nada si la participación no existe', async () => {
      vi.mocked(prisma.participation.findUnique).mockResolvedValueOnce(null);

      await notifyCreditsEarned('part-1');

      expect(email.sendCreditsGranted).not.toHaveBeenCalled();
    });
  });

  describe('processReminders', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('debe procesar recordatorios exitosamente', async () => {
      const mockParticipations = [
        {
          id: 'part-1',
          student: { name: 'Estudiante D', email: 'estd@est.com' },
          study: { title: 'Estudio D' },
          timeslot: { startTime: new Date('2024-01-01T12:00:00Z'), location: 'Lab 2' },
        },
      ];

      vi.mocked(prisma.participation.findMany).mockResolvedValueOnce(mockParticipations as any);
      vi.mocked(email.sendReminder).mockResolvedValueOnce({ success: true });

      const result = await processReminders();

      expect(prisma.participation.findMany).toHaveBeenCalledWith({
        where: {
          status: 'SIGNED_UP',
          timeslot: {
            startTime: {
              gte: new Date('2024-01-01T00:00:00.000Z'),
              lte: new Date('2024-01-02T00:00:00.000Z'),
            },
            status: { not: 'CANCELLED' },
          },
        },
        include: expect.any(Object),
      });

      expect(email.sendReminder).toHaveBeenCalledWith(
        'estd@est.com',
        'Estudiante D',
        'Estudio D',
        expect.any(String),
        'Lab 2'
      );

      expect(prisma.participation.update).toHaveBeenCalledWith({
        where: { id: 'part-1' },
        data: { status: 'REMINDED' },
      });

      expect(result).toEqual({ success: true, data: { sent: 1, errors: 0 } });
    });

    it('debe contar errores si falla el envío', async () => {
      const mockParticipations = [
        {
          id: 'part-1',
          student: { name: 'Estudiante E', email: 'este@est.com' },
          study: { title: 'Estudio E' },
          timeslot: { startTime: new Date('2024-01-01T12:00:00Z'), location: null },
        },
      ];

      vi.mocked(prisma.participation.findMany).mockResolvedValueOnce(mockParticipations as any);
      vi.mocked(email.sendReminder).mockResolvedValueOnce({ success: false, error: 'Error SMTP' });

      const result = await processReminders();

      expect(email.sendReminder).toHaveBeenCalledWith(
        'este@est.com',
        'Estudiante E',
        'Estudio E',
        expect.any(String),
        'Por confirmar'
      );

      expect(prisma.participation.update).not.toHaveBeenCalled();

      expect(result).toEqual({ success: true, data: { sent: 0, errors: 1 } });
    });

    it('debe retornar 0 y 0 si no hay participaciones', async () => {
      vi.mocked(prisma.participation.findMany).mockResolvedValueOnce([]);

      const result = await processReminders();

      expect(email.sendReminder).not.toHaveBeenCalled();
      expect(prisma.participation.update).not.toHaveBeenCalled();

      expect(result).toEqual({ success: true, data: { sent: 0, errors: 0 } });
    });
  });
});
