import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importTimeslots } from '@/app/actions/timeslots';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { requirePermission } from '@/lib/permissions';
import { logAuditEvent } from '@/lib/audit';

// Mocks
vi.mock('@/lib/prisma', () => {
  return {
    default: {
      study: {
        findUnique: vi.fn(),
      },
      timeslot: {
        create: vi.fn(),
      },
    },
  };
});

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/permissions', () => ({
  requirePermission: vi.fn(),
  ACTIONS: {
    IMPORT_TIMESLOTS: 'IMPORT_TIMESLOTS',
  },
}));

vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn(),
}));

describe('importTimeslots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validRow = {
    fecha: '2026-04-01',
    horaInicio: '09:00',
    horaFin: '10:00',
    maxParticipantes: 3,
  };

  it('debería fallar si no hay usuario autenticado', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const result = await importTimeslots('study-1', [validRow]);

    expect(result.success).toBe(false);
    expect(result.error).toBe('No autenticado');
  });

  it('debería requerir permisos de IMPORT_TIMESLOTS', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'user-1', role: 'ESTUDIANTE' },
      expires: '2026-01-01',
    });
    vi.mocked(requirePermission).mockImplementationOnce(() => {
      throw new Error('No autorizado');
    });

    await expect(importTimeslots('study-1', [validRow])).rejects.toThrow('No autorizado');
    expect(requirePermission).toHaveBeenCalledWith('ESTUDIANTE', 'IMPORT_TIMESLOTS');
  });

  it('debería fallar si el estudio no se encuentra', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'user-1', role: 'INV_PRINCIPAL' },
      expires: '2026-01-01',
    });
    vi.mocked(requirePermission).mockImplementationOnce(() => {});
    vi.mocked(prisma.study.findUnique).mockResolvedValueOnce(null);

    const result = await importTimeslots('study-1', [validRow]);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Estudio no encontrado');
  });

  it('debería fallar si el estudio no está activo', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'user-1', role: 'INV_PRINCIPAL' },
      expires: '2026-01-01',
    });
    vi.mocked(requirePermission).mockImplementationOnce(() => {});
    vi.mocked(prisma.study.findUnique).mockResolvedValueOnce({
      id: 'study-1',
      status: 'DRAFT',
      collaborators: [],
    } as any);

    const result = await importTimeslots('study-1', [validRow]);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Solo se pueden importar timeslots a estudios activos');
  });

  it('debería fallar si el usuario no es PI ni colaborador', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'user-other', role: 'INV_PRINCIPAL' },
      expires: '2026-01-01',
    });
    vi.mocked(requirePermission).mockImplementationOnce(() => {});
    vi.mocked(prisma.study.findUnique).mockResolvedValueOnce({
      id: 'study-1',
      status: 'ACTIVE',
      principalInvestigatorId: 'user-1',
      collaborators: [{ userId: 'user-2' }],
    } as any);

    const result = await importTimeslots('study-1', [validRow]);

    expect(result.success).toBe(false);
    expect(result.error).toBe('No tiene acceso a este estudio');
  });

  it('debería validar y acumular errores por cada fila inválida', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'user-1', role: 'INV_PRINCIPAL' },
      expires: '2026-01-01',
    });
    vi.mocked(requirePermission).mockImplementationOnce(() => {});
    vi.mocked(prisma.study.findUnique).mockResolvedValueOnce({
      id: 'study-1',
      status: 'ACTIVE',
      principalInvestigatorId: 'user-1',
      collaborators: [],
      location: 'Lab',
    } as any);

    const rows = [
      { ...validRow, maxParticipantes: -1 }, // Inválido por schema
      { ...validRow, horaInicio: '11:00', horaFin: '10:00' }, // Inválido, fin antes que inicio
      { ...validRow, fecha: 'invalid-date' }, // Fecha inválida (NaN getTime)
    ];

    const result = await importTimeslots('study-1', rows);

    expect(result.success).toBe(true);
    expect(result.data?.created).toBe(0);
    expect(result.data?.errors).toHaveLength(3);
    expect(result.data?.errors[0]).toContain('Fila 1:');
    expect(result.data?.errors[1]).toContain('Fila 2: La hora de fin debe ser posterior a la de inicio');
    expect(result.data?.errors[2]).toContain('Fila 3: Fecha/hora inválida');
    expect(prisma.timeslot.create).not.toHaveBeenCalled();
    expect(logAuditEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'IMPORT_TIMESLOTS',
      entityType: 'Study',
      entityId: 'study-1',
      newState: { created: 0, errors: 3 },
    });
  });

  it('debería crear timeslots válidos y reportar errores si prisma falla', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'user-1', role: 'INV_PRINCIPAL' },
      expires: '2026-01-01',
    });
    vi.mocked(requirePermission).mockImplementationOnce(() => {});
    vi.mocked(prisma.study.findUnique).mockResolvedValueOnce({
      id: 'study-1',
      status: 'ACTIVE',
      principalInvestigatorId: 'user-1',
      collaborators: [],
      location: 'Lab Defecto',
    } as any);

    vi.mocked(prisma.timeslot.create)
      .mockResolvedValueOnce({} as any) // Éxito en fila 1
      .mockRejectedValueOnce(new Error('DB Error')); // Falla en fila 2

    const rows = [
      validRow,
      { ...validRow, ubicacion: 'Lab Específico' },
    ];

    const result = await importTimeslots('study-1', rows);

    expect(result.success).toBe(true);
    expect(result.data?.created).toBe(1);
    expect(result.data?.errors).toHaveLength(1);
    expect(result.data?.errors[0]).toBe('Fila 2: Error al crear timeslot');

    // Verificar las llamadas a create
    expect(prisma.timeslot.create).toHaveBeenCalledTimes(2);

    // El primero usa ubicación por defecto o ninguna, la fila no tiene ubicación
    expect(prisma.timeslot.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        location: 'Lab Defecto',
      }),
    });

    // El segundo usa ubicación específica
    expect(prisma.timeslot.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        location: 'Lab Específico',
      }),
    });

    expect(logAuditEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'IMPORT_TIMESLOTS',
      entityType: 'Study',
      entityId: 'study-1',
      newState: { created: 1, errors: 1 },
    });
  });

  it('debería ser exitoso si el usuario es colaborador', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: 'user-2', role: 'INV_EJECUTOR' },
      expires: '2026-01-01',
    });
    vi.mocked(requirePermission).mockImplementationOnce(() => {});
    vi.mocked(prisma.study.findUnique).mockResolvedValueOnce({
      id: 'study-1',
      status: 'ACTIVE',
      principalInvestigatorId: 'user-1',
      collaborators: [{ userId: 'user-2' }],
      location: 'Lab Defecto',
    } as any);

    vi.mocked(prisma.timeslot.create).mockResolvedValueOnce({} as any);

    const result = await importTimeslots('study-1', [validRow]);

    expect(result.success).toBe(true);
    expect(result.data?.created).toBe(1);
    expect(result.data?.errors).toHaveLength(0);
    expect(prisma.timeslot.create).toHaveBeenCalledTimes(1);
  });
});
