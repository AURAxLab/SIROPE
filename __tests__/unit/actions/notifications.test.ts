/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 *
 * Tests — Notificaciones
 * Verifica el comportamiento de los envíos de emails y recordatorios.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  notifySignUp,
  notifyCancellation,
  notifyWaitlistPromotion,
  notifyStudyReview,
  notifyCreditsEarned,
  processReminders,
} from '@/app/actions/notifications';
import prisma from '@/lib/prisma';
import * as email from '@/lib/email';

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

describe('Notifications Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('notifySignUp', () => {
    it('debe enviar notificaciones de inscripción correctamente', async () => {
      const mockParticipation = {
        id: 'part-1',
        student: { name: 'Juan', email: 'juan@test.com' },
        study: {
          title: 'Estudio 1',
          principalInvestigator: { name: 'IP', email: 'ip@test.com' },
        },
        timeslot: { startTime: new Date('2023-01-01T10:00:00Z'), endTime: new Date('2023-01-01T11:00:00Z'), location: 'Lab 1' },
      };

      (prisma.participation.findUnique as any).mockResolvedValue(mockParticipation);

      await notifySignUp('part-1');

      expect(prisma.participation.findUnique).toHaveBeenCalledWith({
        where: { id: 'part-1' },
        include: expect.any(Object),
      });
      expect(email.sendSignUpConfirmation).toHaveBeenCalledWith(
        'juan@test.com',
        'Juan',
        'Estudio 1',
        expect.any(String),
        'Lab 1'
      );
      expect(email.sendNewSignUpNotification).toHaveBeenCalledWith(
        'ip@test.com',
        'IP',
        'Juan',
        'Estudio 1',
        expect.any(String)
      );
    });

    it('no debe hacer nada si no se encuentra la participación', async () => {
      (prisma.participation.findUnique as any).mockResolvedValue(null);

      await notifySignUp('invalid-id');

      expect(email.sendSignUpConfirmation).not.toHaveBeenCalled();
      expect(email.sendNewSignUpNotification).not.toHaveBeenCalled();
    });
  });

  describe('notifyCancellation', () => {
    it('debe enviar notificación de cancelación correctamente', async () => {
      const mockParticipation = {
        id: 'part-1',
        student: { name: 'Juan', email: 'juan@test.com' },
        study: { title: 'Estudio 1' },
      };

      (prisma.participation.findUnique as any).mockResolvedValue(mockParticipation);

      await notifyCancellation('part-1', true);

      expect(email.sendCancellationConfirmation).toHaveBeenCalledWith(
        'juan@test.com',
        'Juan',
        'Estudio 1',
        true
      );
    });

    it('no debe hacer nada si no se encuentra la participación', async () => {
      (prisma.participation.findUnique as any).mockResolvedValue(null);

      await notifyCancellation('invalid-id', false);

      expect(email.sendCancellationConfirmation).not.toHaveBeenCalled();
    });
  });

  describe('notifyWaitlistPromotion', () => {
    it('debe enviar notificación de lista de espera correctamente', async () => {
      const mockEntry = {
        id: 'wl-1',
        student: { name: 'Juan', email: 'juan@test.com' },
        timeslot: {
          startTime: new Date('2023-01-01T10:00:00Z'),
          study: { title: 'Estudio 1' },
        },
      };

      (prisma.waitlistEntry.findUnique as any).mockResolvedValue(mockEntry);
      (prisma.systemConfig.findUnique as any).mockResolvedValue({ value: '24' });

      await notifyWaitlistPromotion('wl-1');

      expect(email.sendWaitlistPromotion).toHaveBeenCalledWith(
        'juan@test.com',
        'Juan',
        'Estudio 1',
        expect.any(String),
        24
      );
    });

    it('no debe hacer nada si no se encuentra la entrada', async () => {
      (prisma.waitlistEntry.findUnique as any).mockResolvedValue(null);

      await notifyWaitlistPromotion('invalid-id');

      expect(email.sendWaitlistPromotion).not.toHaveBeenCalled();
    });
  });

  describe('notifyStudyReview', () => {
    it('debe enviar notificación de aprobación correctamente', async () => {
      const mockStudy = {
        id: 'study-1',
        title: 'Estudio 1',
        principalInvestigator: { name: 'IP', email: 'ip@test.com' },
      };

      (prisma.study.findUnique as any).mockResolvedValue(mockStudy);

      await notifyStudyReview('study-1', true);

      expect(email.sendStudyApproved).toHaveBeenCalledWith(
        'ip@test.com',
        'IP',
        'Estudio 1'
      );
      expect(email.sendStudyRejected).not.toHaveBeenCalled();
    });

    it('debe enviar notificación de rechazo correctamente', async () => {
      const mockStudy = {
        id: 'study-1',
        title: 'Estudio 1',
        principalInvestigator: { name: 'IP', email: 'ip@test.com' },
      };

      (prisma.study.findUnique as any).mockResolvedValue(mockStudy);

      await notifyStudyReview('study-1', false, 'Faltan detalles');

      expect(email.sendStudyRejected).toHaveBeenCalledWith(
        'ip@test.com',
        'IP',
        'Estudio 1',
        'Faltan detalles'
      );
      expect(email.sendStudyApproved).not.toHaveBeenCalled();
    });

    it('no debe hacer nada si no se encuentra el estudio', async () => {
      (prisma.study.findUnique as any).mockResolvedValue(null);

      await notifyStudyReview('invalid-id', true);

      expect(email.sendStudyApproved).not.toHaveBeenCalled();
      expect(email.sendStudyRejected).not.toHaveBeenCalled();
    });
  });

  describe('notifyCreditsEarned', () => {
    it('debe enviar notificación de créditos obtenidos correctamente', async () => {
      const mockParticipation = {
        id: 'part-1',
        student: { name: 'Juan', email: 'juan@test.com' },
        study: { title: 'Estudio 1', creditsWorth: 1.5 },
      };

      (prisma.participation.findUnique as any).mockResolvedValue(mockParticipation);

      await notifyCreditsEarned('part-1');

      expect(email.sendCreditsGranted).toHaveBeenCalledWith(
        'juan@test.com',
        'Juan',
        'Estudio 1',
        1.5
      );
    });

    it('no debe hacer nada si no se encuentra la participación', async () => {
      (prisma.participation.findUnique as any).mockResolvedValue(null);

      await notifyCreditsEarned('invalid-id');

      expect(email.sendCreditsGranted).not.toHaveBeenCalled();
    });
  });

  describe('processReminders', () => {
    it('debe procesar y enviar recordatorios correctamente', async () => {
      // Mock de participaciones
      const mockParticipations = [
        {
          id: 'part-1',
          student: { name: 'Juan', email: 'juan@test.com' },
          study: { title: 'Estudio 1' },
          timeslot: { startTime: new Date('2023-01-01T10:00:00Z'), location: 'Lab 1' },
        },
        {
          id: 'part-2',
          student: { name: 'Ana', email: 'ana@test.com' },
          study: { title: 'Estudio 2' },
          timeslot: { startTime: new Date('2023-01-01T11:00:00Z'), location: null },
        },
      ];

      (prisma.participation.findMany as any).mockResolvedValue(mockParticipations);
      (email.sendReminder as any).mockResolvedValue({ success: true });
      (prisma.participation.update as any).mockResolvedValue({});

      const result = await processReminders();

      expect(prisma.participation.findMany).toHaveBeenCalled();
      expect(email.sendReminder).toHaveBeenCalledTimes(2);
      expect(prisma.participation.update).toHaveBeenCalledTimes(2);
      expect(prisma.participation.update).toHaveBeenCalledWith({
        where: { id: 'part-1' },
        data: { status: 'REMINDED' },
      });
      expect(result).toEqual({ success: true, data: { sent: 2, errors: 0 } });
    });

    it('debe manejar errores al enviar recordatorios', async () => {
      const mockParticipations = [
        {
          id: 'part-1',
          student: { name: 'Juan', email: 'juan@test.com' },
          study: { title: 'Estudio 1' },
          timeslot: { startTime: new Date('2023-01-01T10:00:00Z'), location: 'Lab 1' },
        },
      ];

      (prisma.participation.findMany as any).mockResolvedValue(mockParticipations);
      // Simular fallo en el envío
      (email.sendReminder as any).mockResolvedValue({ success: false });

      const result = await processReminders();

      expect(email.sendReminder).toHaveBeenCalledTimes(1);
      // No debería actualizar el estado si falla
      expect(prisma.participation.update).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, data: { sent: 0, errors: 1 } });
    });

    it('debe manejar el caso sin participaciones', async () => {
      (prisma.participation.findMany as any).mockResolvedValue([]);

      const result = await processReminders();

      expect(email.sendReminder).not.toHaveBeenCalled();
      expect(prisma.participation.update).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, data: { sent: 0, errors: 0 } });
    });
  });
});
