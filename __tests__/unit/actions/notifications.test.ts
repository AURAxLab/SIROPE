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

// Mock prisma
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

// Mock email functions
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

describe('Notifications Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('notifySignUp', () => {
    it('should send notifications to student and PI when participation is found', async () => {
      const mockParticipation = {
        id: 'p1',
        student: { name: 'Student 1', email: 'student@example.com' },
        study: {
          title: 'Study 1',
          principalInvestigator: { name: 'PI 1', email: 'pi@example.com' },
        },
        timeslot: {
          startTime: new Date('2025-01-01T10:00:00Z'),
          endTime: new Date('2025-01-01T11:00:00Z'),
          location: 'Lab A',
        },
      };

      vi.mocked(prisma.participation.findUnique).mockResolvedValue(mockParticipation as any);

      await notifySignUp('p1');

      expect(prisma.participation.findUnique).toHaveBeenCalledWith({
        where: { id: 'p1' },
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

      expect(email.sendSignUpConfirmation).toHaveBeenCalledWith(
        'student@example.com',
        'Student 1',
        'Study 1',
        expect.any(String),
        'Lab A'
      );

      expect(email.sendNewSignUpNotification).toHaveBeenCalledWith(
        'pi@example.com',
        'PI 1',
        'Student 1',
        'Study 1',
        expect.any(String)
      );
    });

    it('should do nothing if participation is not found', async () => {
      vi.mocked(prisma.participation.findUnique).mockResolvedValue(null);

      await notifySignUp('p1');

      expect(email.sendSignUpConfirmation).not.toHaveBeenCalled();
      expect(email.sendNewSignUpNotification).not.toHaveBeenCalled();
    });
  });

  describe('notifyCancellation', () => {
    it('should send cancellation to student', async () => {
      const mockParticipation = {
        id: 'p1',
        student: { name: 'Student 1', email: 'student@example.com' },
        study: { title: 'Study 1' },
      };

      vi.mocked(prisma.participation.findUnique).mockResolvedValue(mockParticipation as any);

      await notifyCancellation('p1', true);

      expect(prisma.participation.findUnique).toHaveBeenCalledWith({
        where: { id: 'p1' },
        include: {
          student: { select: { name: true, email: true } },
          study: { select: { title: true } },
        },
      });

      expect(email.sendCancellationConfirmation).toHaveBeenCalledWith(
        'student@example.com',
        'Student 1',
        'Study 1',
        true
      );
    });

    it('should do nothing if participation is not found', async () => {
      vi.mocked(prisma.participation.findUnique).mockResolvedValue(null);

      await notifyCancellation('p1', false);

      expect(email.sendCancellationConfirmation).not.toHaveBeenCalled();
    });
  });

  describe('notifyWaitlistPromotion', () => {
    it('should send waitlist promotion email using default hours', async () => {
      const mockEntry = {
        id: 'w1',
        student: { name: 'Student 1', email: 'student@example.com' },
        timeslot: {
          startTime: new Date('2025-01-01T10:00:00Z'),
          study: { title: 'Study 1' },
        },
      };

      vi.mocked(prisma.waitlistEntry.findUnique).mockResolvedValue(mockEntry as any);
      vi.mocked(prisma.systemConfig.findUnique).mockResolvedValue(null);

      await notifyWaitlistPromotion('w1');

      expect(email.sendWaitlistPromotion).toHaveBeenCalledWith(
        'student@example.com',
        'Student 1',
        'Study 1',
        expect.any(String),
        12 // default
      );
    });

    it('should send waitlist promotion email using configured hours', async () => {
      const mockEntry = {
        id: 'w1',
        student: { name: 'Student 1', email: 'student@example.com' },
        timeslot: {
          startTime: new Date('2025-01-01T10:00:00Z'),
          study: { title: 'Study 1' },
        },
      };

      vi.mocked(prisma.waitlistEntry.findUnique).mockResolvedValue(mockEntry as any);
      vi.mocked(prisma.systemConfig.findUnique).mockResolvedValue({
        key: 'WAITLIST_EXPIRATION_HOURS',
        value: '24',
      } as any);

      await notifyWaitlistPromotion('w1');

      expect(email.sendWaitlistPromotion).toHaveBeenCalledWith(
        'student@example.com',
        'Student 1',
        'Study 1',
        expect.any(String),
        24
      );
    });

    it('should do nothing if entry is not found', async () => {
      vi.mocked(prisma.waitlistEntry.findUnique).mockResolvedValue(null);

      await notifyWaitlistPromotion('w1');

      expect(email.sendWaitlistPromotion).not.toHaveBeenCalled();
    });
  });

  describe('notifyStudyReview', () => {
    it('should send approval email', async () => {
      const mockStudy = {
        id: 's1',
        title: 'Study 1',
        principalInvestigator: { name: 'PI 1', email: 'pi@example.com' },
      };

      vi.mocked(prisma.study.findUnique).mockResolvedValue(mockStudy as any);

      await notifyStudyReview('s1', true);

      expect(email.sendStudyApproved).toHaveBeenCalledWith(
        'pi@example.com',
        'PI 1',
        'Study 1'
      );
      expect(email.sendStudyRejected).not.toHaveBeenCalled();
    });

    it('should send rejection email with reason', async () => {
      const mockStudy = {
        id: 's1',
        title: 'Study 1',
        principalInvestigator: { name: 'PI 1', email: 'pi@example.com' },
      };

      vi.mocked(prisma.study.findUnique).mockResolvedValue(mockStudy as any);

      await notifyStudyReview('s1', false, 'Missing docs');

      expect(email.sendStudyRejected).toHaveBeenCalledWith(
        'pi@example.com',
        'PI 1',
        'Study 1',
        'Missing docs'
      );
      expect(email.sendStudyApproved).not.toHaveBeenCalled();
    });

    it('should send rejection email with default reason', async () => {
      const mockStudy = {
        id: 's1',
        title: 'Study 1',
        principalInvestigator: { name: 'PI 1', email: 'pi@example.com' },
      };

      vi.mocked(prisma.study.findUnique).mockResolvedValue(mockStudy as any);

      await notifyStudyReview('s1', false);

      expect(email.sendStudyRejected).toHaveBeenCalledWith(
        'pi@example.com',
        'PI 1',
        'Study 1',
        'No se proporcionó una razón específica.'
      );
    });

    it('should do nothing if study is not found', async () => {
      vi.mocked(prisma.study.findUnique).mockResolvedValue(null);

      await notifyStudyReview('s1', true);

      expect(email.sendStudyApproved).not.toHaveBeenCalled();
      expect(email.sendStudyRejected).not.toHaveBeenCalled();
    });
  });

  describe('notifyCreditsEarned', () => {
    it('should send credits granted email', async () => {
      const mockParticipation = {
        id: 'p1',
        student: { name: 'Student 1', email: 'student@example.com' },
        study: { title: 'Study 1', creditsWorth: 2 },
      };

      vi.mocked(prisma.participation.findUnique).mockResolvedValue(mockParticipation as any);

      await notifyCreditsEarned('p1');

      expect(email.sendCreditsGranted).toHaveBeenCalledWith(
        'student@example.com',
        'Student 1',
        'Study 1',
        2
      );
    });

    it('should do nothing if participation is not found', async () => {
      vi.mocked(prisma.participation.findUnique).mockResolvedValue(null);

      await notifyCreditsEarned('p1');

      expect(email.sendCreditsGranted).not.toHaveBeenCalled();
    });
  });

  describe('processReminders', () => {
    it('should process reminders and update status', async () => {
      const mockParticipations = [
        {
          id: 'p1',
          student: { name: 'Student 1', email: 'student@example.com' },
          study: { title: 'Study 1' },
          timeslot: { startTime: new Date(), location: 'Lab A' },
        },
        {
          id: 'p2',
          student: { name: 'Student 2', email: 'student2@example.com' },
          study: { title: 'Study 2' },
          timeslot: { startTime: new Date(), location: null }, // no location
        },
      ];

      vi.mocked(prisma.participation.findMany).mockResolvedValue(mockParticipations as any);
      vi.mocked(email.sendReminder)
        .mockResolvedValueOnce({ success: true }) // First succeeds
        .mockResolvedValueOnce({ success: false, error: 'Failed' }); // Second fails

      const result = await processReminders();

      expect(prisma.participation.findMany).toHaveBeenCalled();

      expect(email.sendReminder).toHaveBeenCalledTimes(2);
      expect(email.sendReminder).toHaveBeenNthCalledWith(
        1,
        'student@example.com',
        'Student 1',
        'Study 1',
        expect.any(String),
        'Lab A'
      );
      expect(email.sendReminder).toHaveBeenNthCalledWith(
        2,
        'student2@example.com',
        'Student 2',
        'Study 2',
        expect.any(String),
        'Por confirmar'
      );

      // Only first participation should be updated
      expect(prisma.participation.update).toHaveBeenCalledTimes(1);
      expect(prisma.participation.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { status: 'REMINDED' },
      });

      expect(result).toEqual({ success: true, data: { sent: 1, errors: 1 } });
    });
  });
});
