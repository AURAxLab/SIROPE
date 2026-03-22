/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Tests — Créditos y Validaciones de Límites
 * Verifica permisos de asignación de créditos, validación de schemas,
 * y reglas de negocio de los 3 niveles de límite.
 */

import { describe, it, expect } from 'vitest';
import { hasPermission, ACTIONS } from '@/lib/permissions';
import { creditAssignmentSchema } from '@/lib/validations';
import type { Role } from '@/lib/validations';

const ALL_ROLES: Role[] = [
  'ADMIN',
  'PROFESOR',
  'INV_PRINCIPAL',
  'INV_EJECUTOR',
  'ESTUDIANTE',
];

// ============================================================
// Tests: Permisos de asignación de créditos
// ============================================================

describe('Permisos de asignación de créditos', () => {
  it('Solo ESTUDIANTE puede asignar créditos', () => {
    for (const role of ALL_ROLES) {
      const expected = role === 'ESTUDIANTE';
      expect(hasPermission(role, ACTIONS.ASSIGN_CREDITS)).toBe(expected);
    }
  });

  it('Solo ESTUDIANTE puede ver su propio historial', () => {
    for (const role of ALL_ROLES) {
      const expected = role === 'ESTUDIANTE';
      expect(hasPermission(role, ACTIONS.VIEW_OWN_HISTORY)).toBe(expected);
    }
  });

  it('ADMIN puede ver créditos del curso', () => {
    expect(hasPermission('ADMIN', ACTIONS.VIEW_COURSE_CREDITS)).toBe(true);
  });

  it('PROFESOR puede ver créditos del curso', () => {
    expect(hasPermission('PROFESOR', ACTIONS.VIEW_COURSE_CREDITS)).toBe(true);
  });

  it('Estudiante NO puede ver créditos del curso (vista de profesor)', () => {
    expect(hasPermission('ESTUDIANTE', ACTIONS.VIEW_COURSE_CREDITS)).toBe(false);
  });

  it('Investigadores NO pueden ver créditos del curso', () => {
    expect(hasPermission('INV_PRINCIPAL', ACTIONS.VIEW_COURSE_CREDITS)).toBe(false);
    expect(hasPermission('INV_EJECUTOR', ACTIONS.VIEW_COURSE_CREDITS)).toBe(false);
  });
});

// ============================================================
// Tests: Validación de creditAssignmentSchema
// ============================================================

describe('Validación de creditAssignmentSchema', () => {
  const validAssignment = {
    participationId: 'part-123',
    courseId: 'course-456',
    credits: 1.0,
  };

  it('Asignación válida', () => {
    expect(creditAssignmentSchema.safeParse(validAssignment).success).toBe(true);
  });

  it('Créditos = 0.5 (mínimo) OK', () => {
    const result = creditAssignmentSchema.safeParse({
      ...validAssignment,
      credits: 0.5,
    });
    expect(result.success).toBe(true);
  });

  it('Créditos = 5.0 (máximo) OK', () => {
    const result = creditAssignmentSchema.safeParse({
      ...validAssignment,
      credits: 5.0,
    });
    expect(result.success).toBe(true);
  });

  it('Créditos = 0.4 rechazado (< mínimo)', () => {
    const result = creditAssignmentSchema.safeParse({
      ...validAssignment,
      credits: 0.4,
    });
    expect(result.success).toBe(false);
  });

  it('Créditos = 5.1 rechazado (> máximo)', () => {
    const result = creditAssignmentSchema.safeParse({
      ...validAssignment,
      credits: 5.1,
    });
    expect(result.success).toBe(false);
  });

  it('Créditos = 0 rechazado', () => {
    const result = creditAssignmentSchema.safeParse({
      ...validAssignment,
      credits: 0,
    });
    expect(result.success).toBe(false);
  });

  it('Créditos negativos rechazados', () => {
    const result = creditAssignmentSchema.safeParse({
      ...validAssignment,
      credits: -1,
    });
    expect(result.success).toBe(false);
  });

  it('participationId vacío rechazado', () => {
    const result = creditAssignmentSchema.safeParse({
      ...validAssignment,
      participationId: '',
    });
    expect(result.success).toBe(false);
  });

  it('courseId vacío rechazado', () => {
    const result = creditAssignmentSchema.safeParse({
      ...validAssignment,
      courseId: '',
    });
    expect(result.success).toBe(false);
  });

  it('Créditos decimales válidos (1.5)', () => {
    const result = creditAssignmentSchema.safeParse({
      ...validAssignment,
      credits: 1.5,
    });
    expect(result.success).toBe(true);
  });

  it('Créditos en el borde 4.9 válidos', () => {
    const result = creditAssignmentSchema.safeParse({
      ...validAssignment,
      credits: 4.9,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// Tests: Reglas de negocio de créditos (por diseño)
// ============================================================

describe('Reglas de negocio de créditos', () => {
  it('Solo estudiantes pueden autoasignarse créditos (self-service)', () => {
    expect(hasPermission('ESTUDIANTE', ACTIONS.ASSIGN_CREDITS)).toBe(true);
    expect(hasPermission('ADMIN', ACTIONS.ASSIGN_CREDITS)).toBe(false);
    expect(hasPermission('PROFESOR', ACTIONS.ASSIGN_CREDITS)).toBe(false);
  });

  it('Admin y profesor pueden verificar los créditos asignados', () => {
    expect(hasPermission('ADMIN', ACTIONS.VIEW_COURSE_CREDITS)).toBe(true);
    expect(hasPermission('PROFESOR', ACTIONS.VIEW_COURSE_CREDITS)).toBe(true);
  });

  it('Flujo completo de permisos: estudiar → inscribirse → completar → asignar', () => {
    // Estudiante puede: buscar, inscribirse, cancelar, ver historial, asignar
    expect(hasPermission('ESTUDIANTE', ACTIONS.BROWSE_STUDIES)).toBe(true);
    expect(hasPermission('ESTUDIANTE', ACTIONS.SIGN_UP_TIMESLOT)).toBe(true);
    expect(hasPermission('ESTUDIANTE', ACTIONS.CANCEL_SIGN_UP)).toBe(true);
    expect(hasPermission('ESTUDIANTE', ACTIONS.VIEW_OWN_HISTORY)).toBe(true);
    expect(hasPermission('ESTUDIANTE', ACTIONS.ASSIGN_CREDITS)).toBe(true);

    // IP/IE pueden: marcar completitud que habilita la asignación
    expect(hasPermission('INV_PRINCIPAL', ACTIONS.MARK_COMPLETION)).toBe(true);
    expect(hasPermission('INV_EJECUTOR', ACTIONS.MARK_COMPLETION)).toBe(true);

    // Profesor puede: ver los créditos asignados, crear cursos
    expect(hasPermission('PROFESOR', ACTIONS.VIEW_COURSE_CREDITS)).toBe(true);
    expect(hasPermission('PROFESOR', ACTIONS.CREATE_COURSE)).toBe(true);
  });
});
