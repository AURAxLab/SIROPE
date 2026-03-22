/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Tests — Timeslots, Inscripción y Completitud
 * Verifica los permisos de timeslots, validaciones de inscripción,
 * reglas de cancelación, y lógica de marcado de completitud.
 */

import { describe, it, expect } from 'vitest';
import { hasPermission, ACTIONS } from '@/lib/permissions';
import {
  timeslotSchema,
  timeslotImportRowSchema,
  markCompletionSchema,
  bulkCompletionSchema,
} from '@/lib/validations';
import type { Role } from '@/lib/validations';

const ALL_ROLES: Role[] = [
  'ADMIN',
  'PROFESOR',
  'INV_PRINCIPAL',
  'INV_EJECUTOR',
  'ESTUDIANTE',
];

// ============================================================
// Tests: Permisos de Timeslots
// ============================================================

describe('Permisos de timeslots', () => {
  const timeslotActions = [
    ACTIONS.CREATE_TIMESLOT,
    ACTIONS.EDIT_TIMESLOT,
    ACTIONS.IMPORT_TIMESLOTS,
  ];

  for (const action of timeslotActions) {
    it(`${action}: IP tiene acceso`, () => {
      expect(hasPermission('INV_PRINCIPAL', action)).toBe(true);
    });

    it(`${action}: IE tiene acceso`, () => {
      expect(hasPermission('INV_EJECUTOR', action)).toBe(true);
    });

    it(`${action}: ADMIN no tiene acceso`, () => {
      expect(hasPermission('ADMIN', action)).toBe(false);
    });

    it(`${action}: PROFESOR no tiene acceso`, () => {
      expect(hasPermission('PROFESOR', action)).toBe(false);
    });

    it(`${action}: ESTUDIANTE no tiene acceso`, () => {
      expect(hasPermission('ESTUDIANTE', action)).toBe(false);
    });
  }
});

describe('Permisos de ver inscritos y completitud', () => {
  it('IP puede ver inscritos', () => {
    expect(hasPermission('INV_PRINCIPAL', ACTIONS.VIEW_ENROLLED_PARTICIPANTS)).toBe(true);
  });

  it('IE puede ver inscritos', () => {
    expect(hasPermission('INV_EJECUTOR', ACTIONS.VIEW_ENROLLED_PARTICIPANTS)).toBe(true);
  });

  it('Estudiante NO puede ver inscritos', () => {
    expect(hasPermission('ESTUDIANTE', ACTIONS.VIEW_ENROLLED_PARTICIPANTS)).toBe(false);
  });

  it('IP puede marcar completitud', () => {
    expect(hasPermission('INV_PRINCIPAL', ACTIONS.MARK_COMPLETION)).toBe(true);
  });

  it('IE puede marcar completitud', () => {
    expect(hasPermission('INV_EJECUTOR', ACTIONS.MARK_COMPLETION)).toBe(true);
  });

  it('IP puede marcar completitud masiva', () => {
    expect(hasPermission('INV_PRINCIPAL', ACTIONS.BULK_MARK_COMPLETION)).toBe(true);
  });

  it('IE puede marcar completitud masiva', () => {
    expect(hasPermission('INV_EJECUTOR', ACTIONS.BULK_MARK_COMPLETION)).toBe(true);
  });

  it('Estudiante NO puede marcar completitud', () => {
    expect(hasPermission('ESTUDIANTE', ACTIONS.MARK_COMPLETION)).toBe(false);
    expect(hasPermission('ESTUDIANTE', ACTIONS.BULK_MARK_COMPLETION)).toBe(false);
  });
});

// ============================================================
// Tests: Permisos de Inscripción
// ============================================================

describe('Permisos de inscripción de estudiante', () => {
  it('Solo ESTUDIANTE puede inscribirse en timeslots', () => {
    for (const role of ALL_ROLES) {
      const expected = role === 'ESTUDIANTE';
      expect(hasPermission(role, ACTIONS.SIGN_UP_TIMESLOT)).toBe(expected);
    }
  });

  it('Solo ESTUDIANTE puede cancelar inscripción', () => {
    for (const role of ALL_ROLES) {
      const expected = role === 'ESTUDIANTE';
      expect(hasPermission(role, ACTIONS.CANCEL_SIGN_UP)).toBe(expected);
    }
  });

  it('Solo ESTUDIANTE puede unirse a waitlist', () => {
    for (const role of ALL_ROLES) {
      const expected = role === 'ESTUDIANTE';
      expect(hasPermission(role, ACTIONS.JOIN_WAITLIST)).toBe(expected);
    }
  });
});

// ============================================================
// Tests: Validación de Timeslot
// ============================================================

describe('Validación de timeslot (timeslotSchema)', () => {
  const futureStart = new Date(Date.now() + 86400000).toISOString();
  const futureEnd = new Date(Date.now() + 86400000 + 3600000).toISOString();

  const validTimeslot = {
    studyId: 'study-123',
    startTime: futureStart,
    endTime: futureEnd,
    maxParticipants: 5,
  };

  it('Timeslot válido', () => {
    expect(timeslotSchema.safeParse(validTimeslot).success).toBe(true);
  });

  it('Con location', () => {
    const result = timeslotSchema.safeParse({
      ...validTimeslot,
      location: 'Lab ECCI-204',
    });
    expect(result.success).toBe(true);
  });

  it('1 participante (mínimo) OK', () => {
    const result = timeslotSchema.safeParse({
      ...validTimeslot,
      maxParticipants: 1,
    });
    expect(result.success).toBe(true);
  });

  it('500 participantes (máximo) OK', () => {
    const result = timeslotSchema.safeParse({
      ...validTimeslot,
      maxParticipants: 500,
    });
    expect(result.success).toBe(true);
  });

  it('0 participantes rechazado', () => {
    const result = timeslotSchema.safeParse({
      ...validTimeslot,
      maxParticipants: 0,
    });
    expect(result.success).toBe(false);
  });

  it('501 participantes rechazado', () => {
    const result = timeslotSchema.safeParse({
      ...validTimeslot,
      maxParticipants: 501,
    });
    expect(result.success).toBe(false);
  });

  it('Participantes decimales rechazado', () => {
    const result = timeslotSchema.safeParse({
      ...validTimeslot,
      maxParticipants: 3.5,
    });
    expect(result.success).toBe(false);
  });

  it('endTime antes de startTime rechazado', () => {
    const result = timeslotSchema.safeParse({
      ...validTimeslot,
      startTime: futureEnd,
      endTime: futureStart,
    });
    expect(result.success).toBe(false);
  });

  it('studyId vacío rechazado', () => {
    const result = timeslotSchema.safeParse({
      ...validTimeslot,
      studyId: '',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// Tests: Validación de importación Excel
// ============================================================

describe('Validación de importación Excel (timeslotImportRowSchema)', () => {
  const validRow = {
    fecha: '2026-04-01',
    horaInicio: '09:00',
    horaFin: '10:00',
    maxParticipantes: 3,
  };

  it('Fila válida sin ubicación', () => {
    expect(timeslotImportRowSchema.safeParse(validRow).success).toBe(true);
  });

  it('Fila válida con ubicación', () => {
    const result = timeslotImportRowSchema.safeParse({
      ...validRow,
      ubicacion: 'Lab 204',
    });
    expect(result.success).toBe(true);
  });

  it('Fecha vacía rechazada', () => {
    const result = timeslotImportRowSchema.safeParse({
      ...validRow,
      fecha: '',
    });
    expect(result.success).toBe(false);
  });

  it('Hora inicio vacía rechazada', () => {
    const result = timeslotImportRowSchema.safeParse({
      ...validRow,
      horaInicio: '',
    });
    expect(result.success).toBe(false);
  });

  it('Hora fin vacía rechazada', () => {
    const result = timeslotImportRowSchema.safeParse({
      ...validRow,
      horaFin: '',
    });
    expect(result.success).toBe(false);
  });

  it('Max participantes 0 rechazado', () => {
    const result = timeslotImportRowSchema.safeParse({
      ...validRow,
      maxParticipantes: 0,
    });
    expect(result.success).toBe(false);
  });

  it('Max participantes negativo rechazado', () => {
    const result = timeslotImportRowSchema.safeParse({
      ...validRow,
      maxParticipantes: -1,
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// Tests: Validación de completitud
// ============================================================

describe('Validación de markCompletionSchema', () => {
  it('COMPLETED válido', () => {
    const result = markCompletionSchema.safeParse({
      participationId: 'part-1',
      status: 'COMPLETED',
    });
    expect(result.success).toBe(true);
  });

  it('NO_SHOW válido', () => {
    const result = markCompletionSchema.safeParse({
      participationId: 'part-1',
      status: 'NO_SHOW',
    });
    expect(result.success).toBe(true);
  });

  it('CANCELLED rechazado como status de completitud', () => {
    const result = markCompletionSchema.safeParse({
      participationId: 'part-1',
      status: 'CANCELLED',
    });
    expect(result.success).toBe(false);
  });

  it('SIGNED_UP rechazado como status de completitud', () => {
    const result = markCompletionSchema.safeParse({
      participationId: 'part-1',
      status: 'SIGNED_UP',
    });
    expect(result.success).toBe(false);
  });

  it('participationId vacío rechazado', () => {
    const result = markCompletionSchema.safeParse({
      participationId: '',
      status: 'COMPLETED',
    });
    expect(result.success).toBe(false);
  });
});

describe('Validación de bulkCompletionSchema', () => {
  it('Lote válido con múltiples IDs', () => {
    const result = bulkCompletionSchema.safeParse({
      participationIds: ['p1', 'p2', 'p3'],
      status: 'COMPLETED',
    });
    expect(result.success).toBe(true);
  });

  it('Lote con un solo ID válido', () => {
    const result = bulkCompletionSchema.safeParse({
      participationIds: ['p1'],
      status: 'NO_SHOW',
    });
    expect(result.success).toBe(true);
  });

  it('Array vacío rechazado', () => {
    const result = bulkCompletionSchema.safeParse({
      participationIds: [],
      status: 'COMPLETED',
    });
    expect(result.success).toBe(false);
  });

  it('Status inválido rechazado', () => {
    const result = bulkCompletionSchema.safeParse({
      participationIds: ['p1'],
      status: 'PENDING',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// Tests: Reglas de negocio de inscripción
// ============================================================

describe('Reglas de negocio de inscripción', () => {
  it('Un estudiante no debería poder inscribirse si no es elegible (por diseño)', () => {
    // La verificación de prescreen ocurre server-side en signUpForTimeslot
    // Verificamos que SOLO el estudiante tiene permisos de inscripción
    expect(hasPermission('ESTUDIANTE', ACTIONS.SIGN_UP_TIMESLOT)).toBe(true);
    expect(hasPermission('ESTUDIANTE', ACTIONS.ANSWER_PRESCREEN)).toBe(true);
    expect(hasPermission('INV_PRINCIPAL', ACTIONS.SIGN_UP_TIMESLOT)).toBe(false);
  });

  it('IP/IE pueden ver inscritos pero no inscribirse ellos mismos', () => {
    expect(hasPermission('INV_PRINCIPAL', ACTIONS.VIEW_ENROLLED_PARTICIPANTS)).toBe(true);
    expect(hasPermission('INV_PRINCIPAL', ACTIONS.SIGN_UP_TIMESLOT)).toBe(false);
    expect(hasPermission('INV_EJECUTOR', ACTIONS.VIEW_ENROLLED_PARTICIPANTS)).toBe(true);
    expect(hasPermission('INV_EJECUTOR', ACTIONS.SIGN_UP_TIMESLOT)).toBe(false);
  });

  it('Solo IP/IE pueden marcar completitud, no estudiantes', () => {
    expect(hasPermission('ESTUDIANTE', ACTIONS.MARK_COMPLETION)).toBe(false);
    expect(hasPermission('INV_PRINCIPAL', ACTIONS.MARK_COMPLETION)).toBe(true);
    expect(hasPermission('INV_EJECUTOR', ACTIONS.MARK_COMPLETION)).toBe(true);
  });
});
