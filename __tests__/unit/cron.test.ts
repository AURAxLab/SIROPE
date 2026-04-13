import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/cron/reminders/route';
import { processReminders } from '@/app/actions/notifications';
import { NextResponse } from 'next/server';

vi.mock('@/app/actions/notifications', () => ({
  processReminders: vi.fn().mockResolvedValue({ success: true, data: 'test' }),
}));

// Provide a stable timestamp and json fn
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn().mockImplementation((data, opts) => ({
      data,
      ...opts,
    })),
  },
}));

describe('Cron Reminders API', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, CRON_SECRET: 'super-secret' };
  });

  it('should return 500 if CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET;
    const req = new Request('http://localhost', {
      headers: new Headers({ authorization: 'Bearer some-token' }),
    });

    const res = await POST(req) as any;
    expect(res.data).toEqual({ error: 'CRON_SECRET no configurado' });
    expect(res.status).toBe(500);
  });

  it('should return 401 if authorization header is missing', async () => {
    const req = new Request('http://localhost');
    const res = await POST(req) as any;

    expect(res.data).toEqual({ error: 'No autorizado' });
    expect(res.status).toBe(401);
  });

  it('should return 401 if authorization header does not match CRON_SECRET', async () => {
    const req = new Request('http://localhost', {
      headers: new Headers({ authorization: 'Bearer wrong-secret' }),
    });

    const res = await POST(req) as any;
    expect(res.data).toEqual({ error: 'No autorizado' });
    expect(res.status).toBe(401);
  });

  it('should process reminders if authorization header matches CRON_SECRET', async () => {
    const req = new Request('http://localhost', {
      headers: new Headers({ authorization: 'Bearer super-secret' }),
    });

    const res = await POST(req) as any;
    expect(processReminders).toHaveBeenCalledTimes(1);
    expect(res.data.success).toBe(true);
    expect(res.data.data).toBe('test');
    expect(res.data.timestamp).toBeDefined();
  });
});
