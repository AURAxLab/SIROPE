import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import prisma from '@/lib/prisma';
import * as email from '@/lib/email';
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
    it('should do nothing if participation is not found', async () => {
      vi.mocked(prisma.participation.findUnique).mockResolvedValue(null);

      await notifySignUp('part-1');

      expect(prisma.participation.findUnique).toHaveBeenCalledWith({
        where: { id: 'part-1' },
        include: expect.any(Object),
      });
      expect(email.sendSignUpConfirmation).not.toHaveBeenCalled();
      expect(email.sendNewSignUpNotification).not.toHaveBeenCalled();
    });

    it('should send notifications if participation is found', async () => {
      const mockDate = new Date('2023-10-10T10:00:00Z');
      const mockParticipation = {
        id: 'part-1',
        student: { name: 'Student Name', email: 'student@example.com' },
        study: {
          title: 'Study Title',
          principalInvestigator: { name: 'PI Name', email: 'pi@example.com' },
        },
        timeslot: { startTime: mockDate, endTime: mockDate, location: 'Room 101' },
      };

      vi.mocked(prisma.participation.findUnique).mockResolvedValue(mockParticipation as any);

      await notifySignUp('part-1');

      expect(email.sendSignUpConfirmation).toHaveBeenCalledWith(
        'student@example.com',
        'Student Name',
        'Study Title',
        expect.any(String),
        'Room 101'
      );

      expect(email.sendNewSignUpNotification).toHaveBeenCalledWith(
        'pi@example.com',
        'PI Name',
        'Student Name',
        'Study Title',
        expect.any(String)
      );
    });
  });

  describe('notifyCancellation', () => {
    it('should do nothing if participation is not found', async () => {
      vi.mocked(prisma.participation.findUnique).mockResolvedValue(null);

      await notifyCancellation('part-1', true);

      expect(email.sendCancellationConfirmation).not.toHaveBeenCalled();
    });

    it('should send cancellation confirmation', async () => {
      const mockParticipation = {
        id: 'part-1',
        student: { name: 'Student Name', email: 'student@example.com' },
        study: { title: 'Study Title' },
      };

      vi.mocked(prisma.participation.findUnique).mockResolvedValue(mockParticipation as any);

      await notifyCancellation('part-1', true);

      expect(email.sendCancellationConfirmation).toHaveBeenCalledWith(
        'student@example.com',
        'Student Name',
        'Study Title',
        true
      );
    });
  });

  describe('notifyWaitlistPromotion', () => {
    it('should do nothing if waitlist entry is not found', async () => {
      vi.mocked(prisma.waitlistEntry.findUnique).mockResolvedValue(null);

      await notifyWaitlistPromotion('entry-1');

      expect(email.sendWaitlistPromotion).not.toHaveBeenCalled();
    });

    it('should use default expiration hours if config not found', async () => {
      const mockDate = new Date('2023-10-10T10:00:00Z');
      const mockEntry = {
        id: 'entry-1',
        student: { name: 'Student Name', email: 'student@example.com' },
        timeslot: {
          startTime: mockDate,
          study: { title: 'Study Title' },
        },
      };

      vi.mocked(prisma.waitlistEntry.findUnique).mockResolvedValue(mockEntry as any);
      vi.mocked(prisma.systemConfig.findUnique).mockResolvedValue(null);

      await notifyWaitlistPromotion('entry-1');

      expect(email.sendWaitlistPromotion).toHaveBeenCalledWith(
        'student@example.com',
        'Student Name',
        'Study Title',
        expect.any(String),
        12 // default
      );
    });

    it('should use configured expiration hours', async () => {
      const mockDate = new Date('2023-10-10T10:00:00Z');
      const mockEntry = {
        id: 'entry-1',
        student: { name: 'Student Name', email: 'student@example.com' },
        timeslot: {
          startTime: mockDate,
          study: { title: 'Study Title' },
        },
      };

      vi.mocked(prisma.waitlistEntry.findUnique).mockResolvedValue(mockEntry as any);
      vi.mocked(prisma.systemConfig.findUnique).mockResolvedValue({ key: 'WAITLIST_EXPIRATION_HOURS', value: '24' } as any);

      await notifyWaitlistPromotion('entry-1');

      expect(email.sendWaitlistPromotion).toHaveBeenCalledWith(
        'student@example.com',
        'Student Name',
        'Study Title',
        expect.any(String),
        24 // configured
      );
    });
  });

  describe('notifyStudyReview', () => {
    it('should do nothing if study is not found', async () => {
      vi.mocked(prisma.study.findUnique).mockResolvedValue(null);

      await notifyStudyReview('study-1', true);

      expect(email.sendStudyApproved).not.toHaveBeenCalled();
      expect(email.sendStudyRejected).not.toHaveBeenCalled();
    });

    it('should send approval notification', async () => {
      const mockStudy = {
        id: 'study-1',
        title: 'Study Title',
        principalInvestigator: { name: 'PI Name', email: 'pi@example.com' },
      };

      vi.mocked(prisma.study.findUnique).mockResolvedValue(mockStudy as any);

      await notifyStudyReview('study-1', true);

      expect(email.sendStudyApproved).toHaveBeenCalledWith(
        'pi@example.com',
        'PI Name',
        'Study Title'
      );
      expect(email.sendStudyRejected).not.toHaveBeenCalled();
    });

    it('should send rejection notification with default reason', async () => {
      const mockStudy = {
        id: 'study-1',
        title: 'Study Title',
        principalInvestigator: { name: 'PI Name', email: 'pi@example.com' },
      };

      vi.mocked(prisma.study.findUnique).mockResolvedValue(mockStudy as any);

      await notifyStudyReview('study-1', false);

      expect(email.sendStudyRejected).toHaveBeenCalledWith(
        'pi@example.com',
        'PI Name',
        'Study Title',
        'No se proporcionó una razón específica.'
      );
      expect(email.sendStudyApproved).not.toHaveBeenCalled();
    });

    it('should send rejection notification with provided reason', async () => {
      const mockStudy = {
        id: 'study-1',
        title: 'Study Title',
        principalInvestigator: { name: 'PI Name', email: 'pi@example.com' },
      };

      vi.mocked(prisma.study.findUnique).mockResolvedValue(mockStudy as any);

      await notifyStudyReview('study-1', false, 'Missing abstract');

      expect(email.sendStudyRejected).toHaveBeenCalledWith(
        'pi@example.com',
        'PI Name',
        'Study Title',
        'Missing abstract'
      );
    });
  });

  describe('notifyCreditsEarned', () => {
    it('should do nothing if participation is not found', async () => {
      vi.mocked(prisma.participation.findUnique).mockResolvedValue(null);

      await notifyCreditsEarned('part-1');

      expect(email.sendCreditsGranted).not.toHaveBeenCalled();
    });

    it('should send credits granted notification', async () => {
      const mockParticipation = {
        id: 'part-1',
        student: { name: 'Student Name', email: 'student@example.com' },
        study: { title: 'Study Title', creditsWorth: 2 },
      };

      vi.mocked(prisma.participation.findUnique).mockResolvedValue(mockParticipation as any);

      await notifyCreditsEarned('part-1');

      expect(email.sendCreditsGranted).toHaveBeenCalledWith(
        'student@example.com',
        'Student Name',
        'Study Title',
        2
      );
    });
  });

  describe('processReminders', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2023-10-10T10:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should process reminders and update status on success', async () => {
      const mockDate = new Date('2023-10-11T09:00:00Z');
      const mockParticipations = [
        {
          id: 'part-1',
          student: { name: 'Student 1', email: 'student1@example.com' },
          study: { title: 'Study 1' },
          timeslot: { startTime: mockDate, location: 'Room 1' },
        },
      ];

      vi.mocked(prisma.participation.findMany).mockResolvedValue(mockParticipations as any);
      vi.mocked(email.sendReminder).mockResolvedValue({ success: true } as any);

      const result = await processReminders();

      expect(prisma.participation.findMany).toHaveBeenCalled();
      expect(email.sendReminder).toHaveBeenCalledWith(
        'student1@example.com',
        'Student 1',
        'Study 1',
        expect.any(String),
        'Room 1'
      );
      expect(prisma.participation.update).toHaveBeenCalledWith({
        where: { id: 'part-1' },
        data: { status: 'REMINDED' },
      });
      expect(result).toEqual({ success: true, data: { sent: 1, errors: 0 } });
    });

    it('should count errors if sendReminder fails', async () => {
      const mockDate = new Date('2023-10-11T09:00:00Z');
      const mockParticipations = [
        {
          id: 'part-1',
          student: { name: 'Student 1', email: 'student1@example.com' },
          study: { title: 'Study 1' },
          timeslot: { startTime: mockDate, location: 'Room 1' },
        },
      ];

      vi.mocked(prisma.participation.findMany).mockResolvedValue(mockParticipations as any);
      vi.mocked(email.sendReminder).mockResolvedValue({ success: false, error: 'Failed' } as any);

      const result = await processReminders();

      expect(email.sendReminder).toHaveBeenCalled();
      expect(prisma.participation.update).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, data: { sent: 0, errors: 1 } });
    });

    it('should use default location if timeslot location is null', async () => {
      const mockDate = new Date('2023-10-11T09:00:00Z');
      const mockParticipations = [
        {
          id: 'part-1',
          student: { name: 'Student 1', email: 'student1@example.com' },
          study: { title: 'Study 1' },
          timeslot: { startTime: mockDate, location: null },
        },
      ];

      vi.mocked(prisma.participation.findMany).mockResolvedValue(mockParticipations as any);
      vi.mocked(email.sendReminder).mockResolvedValue({ success: true } as any);

      await processReminders();

      expect(email.sendReminder).toHaveBeenCalledWith(
        'student1@example.com',
        'Student 1',
        'Study 1',
        expect.any(String),
        'Por confirmar'
      );
    });
  });
});
