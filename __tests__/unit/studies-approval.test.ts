/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Tests — Flujo de Aprobación de Estudios
 * Verifica la máquina de estados del estudio:
 * DRAFT → PENDING_APPROVAL → ACTIVE / REJECTED → (CLOSED / DRAFT)
 * Verifica que los roles correctos tienen acceso a cada transición.
 */

import { describe, it, expect } from 'vitest';
import { hasPermission, ACTIONS } from '@/lib/permissions';
import { studyApprovalSchema, studySchema, courseSchema } from '@/lib/validations';
import type { Role } from '@/lib/validations';

// ============================================================
// Helper: lista de roles
// ============================================================

const ALL_ROLES: Role[] = [
  'ADMIN',
  'PROFESOR',
  'INV_PRINCIPAL',
  'INV_EJECUTOR',
  'ESTUDIANTE',
];

// ============================================================
// Tests: Máquina de estados del Estudio
// ============================================================

describe('Máquina de estados del estudio', () => {
  describe('Transición DRAFT → PENDING_APPROVAL', () => {
    it('Solo INV_PRINCIPAL puede enviar a aprobación', () => {
      for (const role of ALL_ROLES) {
        const expected = role === 'INV_PRINCIPAL';
        expect(hasPermission(role, ACTIONS.SUBMIT_STUDY_FOR_APPROVAL)).toBe(expected);
      }
    });
  });

  describe('Transición PENDING_APPROVAL → ACTIVE/REJECTED', () => {
    it('Solo ADMIN puede aprobar estudios', () => {
      for (const role of ALL_ROLES) {
        const expected = role === 'ADMIN';
        expect(hasPermission(role, ACTIONS.APPROVE_STUDIES)).toBe(expected);
      }
    });
  });

  describe('Permisos de gestión de estudios', () => {
    it('Solo IP puede crear estudios', () => {
      for (const role of ALL_ROLES) {
        const expected = role === 'INV_PRINCIPAL';
        expect(hasPermission(role, ACTIONS.CREATE_STUDY)).toBe(expected);
      }
    });

    it('Solo IP puede editar estudios propios', () => {
      for (const role of ALL_ROLES) {
        const expected = role === 'INV_PRINCIPAL';
        expect(hasPermission(role, ACTIONS.EDIT_OWN_STUDY)).toBe(expected);
      }
    });

    it('Solo IP puede eliminar estudios propios', () => {
      for (const role of ALL_ROLES) {
        const expected = role === 'INV_PRINCIPAL';
        expect(hasPermission(role, ACTIONS.DELETE_OWN_STUDY)).toBe(expected);
      }
    });

    it('Solo IP puede gestionar colaboradores', () => {
      for (const role of ALL_ROLES) {
        const expected = role === 'INV_PRINCIPAL';
        expect(hasPermission(role, ACTIONS.MANAGE_COLLABORATORS)).toBe(expected);
      }
    });

    it('Solo IP puede configurar prescreen', () => {
      for (const role of ALL_ROLES) {
        const expected = role === 'INV_PRINCIPAL';
        expect(hasPermission(role, ACTIONS.CONFIGURE_PRESCREEN)).toBe(expected);
      }
    });
  });

  describe('Permisos IP vs IE sobre timeslots', () => {
    const sharedTimeslotActions = [
      ACTIONS.CREATE_TIMESLOT,
      ACTIONS.EDIT_TIMESLOT,
      ACTIONS.IMPORT_TIMESLOTS,
      ACTIONS.VIEW_ENROLLED_PARTICIPANTS,
      ACTIONS.MARK_COMPLETION,
      ACTIONS.BULK_MARK_COMPLETION,
    ];

    for (const action of sharedTimeslotActions) {
      it(`${action}: IP e IE tienen acceso`, () => {
        expect(hasPermission('INV_PRINCIPAL', action)).toBe(true);
        expect(hasPermission('INV_EJECUTOR', action)).toBe(true);
      });

      it(`${action}: otros roles NO tienen acceso`, () => {
        expect(hasPermission('ADMIN', action)).toBe(false);
        expect(hasPermission('PROFESOR', action)).toBe(false);
        expect(hasPermission('ESTUDIANTE', action)).toBe(false);
      });
    }
  });
});

// ============================================================
// Tests: Validación de Aprobación (studyApprovalSchema)
// ============================================================

describe('Validación de aprobación de estudio', () => {
  it('Aprobación válida', () => {
    const result = studyApprovalSchema.safeParse({
      studyId: 'study-123',
      decision: 'APPROVE',
    });
    expect(result.success).toBe(true);
  });

  it('Rechazo con razón válido', () => {
    const result = studyApprovalSchema.safeParse({
      studyId: 'study-123',
      decision: 'REJECT',
      rejectionReason: 'El estudio no cumple con los requisitos éticos necesarios.',
    });
    expect(result.success).toBe(true);
  });

  it('Rechazo SIN razón es inválido', () => {
    const result = studyApprovalSchema.safeParse({
      studyId: 'study-123',
      decision: 'REJECT',
    });
    expect(result.success).toBe(false);
  });

  it('Rechazo con razón vacía es inválido', () => {
    const result = studyApprovalSchema.safeParse({
      studyId: 'study-123',
      decision: 'REJECT',
      rejectionReason: '',
    });
    expect(result.success).toBe(false);
  });

  it('Decisión inválida ("MAYBE") es rechazada', () => {
    const result = studyApprovalSchema.safeParse({
      studyId: 'study-123',
      decision: 'MAYBE',
    });
    expect(result.success).toBe(false);
  });

  it('Falta studyId es inválido', () => {
    const result = studyApprovalSchema.safeParse({
      decision: 'APPROVE',
    });
    expect(result.success).toBe(false);
  });

  it('Aprobación NO necesita rejectionReason', () => {
    const result = studyApprovalSchema.safeParse({
      studyId: 'study-1',
      decision: 'APPROVE',
      rejectionReason: 'esto se ignora',
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// Tests: Validación de Estudio (studySchema)
// ============================================================

describe('Validación de estudio (studySchema)', () => {
  const validStudy = {
    title: 'Efectos de la música en la concentración',
    description: 'Un estudio sobre cómo diferentes géneros musicales afectan la capacidad de concentración durante tareas cognitivas.',
    semesterId: 'sem-2026-1',
    creditsWorth: 1.5,
    estimatedDuration: 60,
  };

  it('Estudio válido con todos los campos', () => {
    expect(studySchema.safeParse(validStudy).success).toBe(true);
  });

  it('Con location y eligibilityCriteria opcionales', () => {
    const result = studySchema.safeParse({
      ...validStudy,
      location: 'Laboratorio ECCI-204',
      eligibilityCriteria: 'Estudiantes activos en carreras de computación',
    });
    expect(result.success).toBe(true);
  });

  it('Créditos = 0.5 (mínimo) OK', () => {
    const result = studySchema.safeParse({ ...validStudy, creditsWorth: 0.5 });
    expect(result.success).toBe(true);
  });

  it('Créditos = 5.0 (máximo) OK', () => {
    const result = studySchema.safeParse({ ...validStudy, creditsWorth: 5.0 });
    expect(result.success).toBe(true);
  });

  it('Créditos = 0.4 rechazado (menor que mínimo)', () => {
    const result = studySchema.safeParse({ ...validStudy, creditsWorth: 0.4 });
    expect(result.success).toBe(false);
  });

  it('Créditos = 5.1 rechazado (mayor que máximo)', () => {
    const result = studySchema.safeParse({ ...validStudy, creditsWorth: 5.1 });
    expect(result.success).toBe(false);
  });

  it('Duración = 5 min (mínimo) OK', () => {
    const result = studySchema.safeParse({ ...validStudy, estimatedDuration: 5 });
    expect(result.success).toBe(true);
  });

  it('Duración = 480 min (máximo) OK', () => {
    const result = studySchema.safeParse({ ...validStudy, estimatedDuration: 480 });
    expect(result.success).toBe(true);
  });

  it('Titulo < 5 chars rechazado', () => {
    const result = studySchema.safeParse({ ...validStudy, title: 'Test' });
    expect(result.success).toBe(false);
  });

  it('Descripción < 10 chars rechazada', () => {
    const result = studySchema.safeParse({ ...validStudy, description: 'Corto.' });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// Tests: Permisos de Cursos
// ============================================================

describe('Permisos de cursos', () => {
  it('ADMIN puede crear cursos', () => {
    expect(hasPermission('ADMIN', ACTIONS.CREATE_COURSE)).toBe(true);
  });

  it('PROFESOR puede crear cursos', () => {
    expect(hasPermission('PROFESOR', ACTIONS.CREATE_COURSE)).toBe(true);
  });

  it('Otros roles NO pueden crear cursos', () => {
    expect(hasPermission('INV_PRINCIPAL', ACTIONS.CREATE_COURSE)).toBe(false);
    expect(hasPermission('INV_EJECUTOR', ACTIONS.CREATE_COURSE)).toBe(false);
    expect(hasPermission('ESTUDIANTE', ACTIONS.CREATE_COURSE)).toBe(false);
  });

  it('Solo PROFESOR puede editar su propio curso', () => {
    expect(hasPermission('PROFESOR', ACTIONS.EDIT_OWN_COURSE)).toBe(true);
    expect(hasPermission('ADMIN', ACTIONS.EDIT_OWN_COURSE)).toBe(false);
  });

  it('ADMIN y PROFESOR pueden ver créditos del curso', () => {
    expect(hasPermission('ADMIN', ACTIONS.VIEW_COURSE_CREDITS)).toBe(true);
    expect(hasPermission('PROFESOR', ACTIONS.VIEW_COURSE_CREDITS)).toBe(true);
  });
});

// ============================================================
// Tests: Validación de Curso (courseSchema)
// ============================================================

describe('Validación de curso (courseSchema)', () => {
  const validCourse = {
    code: 'CI-1101',
    name: 'Introducción a la Computación',
    semesterId: 'sem-1',
    maxExtraCredits: 2.0,
    optedIn: true,
  };

  it('Curso válido', () => {
    expect(courseSchema.safeParse(validCourse).success).toBe(true);
  });

  it('Créditos = 0 OK (profesor puede poner 0)', () => {
    const result = courseSchema.safeParse({ ...validCourse, maxExtraCredits: 0 });
    expect(result.success).toBe(true);
  });

  it('Créditos = 10 OK (máximo)', () => {
    const result = courseSchema.safeParse({ ...validCourse, maxExtraCredits: 10 });
    expect(result.success).toBe(true);
  });

  it('Créditos negativos rechazados', () => {
    const result = courseSchema.safeParse({ ...validCourse, maxExtraCredits: -0.5 });
    expect(result.success).toBe(false);
  });

  it('Créditos > 10 rechazados', () => {
    const result = courseSchema.safeParse({ ...validCourse, maxExtraCredits: 10.5 });
    expect(result.success).toBe(false);
  });

  it('Código vacío rechazado', () => {
    const result = courseSchema.safeParse({ ...validCourse, code: '' });
    expect(result.success).toBe(false);
  });

  it('Nombre vacío rechazado', () => {
    const result = courseSchema.safeParse({ ...validCourse, name: '' });
    expect(result.success).toBe(false);
  });

  it('optedIn = false válido', () => {
    const result = courseSchema.safeParse({ ...validCourse, optedIn: false });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// Tests: Permisos del Estudiante
// ============================================================

describe('Permisos del estudiante para participación', () => {
  it('Puede buscar estudios', () => {
    expect(hasPermission('ESTUDIANTE', ACTIONS.BROWSE_STUDIES)).toBe(true);
  });

  it('Puede responder prescreen', () => {
    expect(hasPermission('ESTUDIANTE', ACTIONS.ANSWER_PRESCREEN)).toBe(true);
  });

  it('Puede inscribirse en timeslots', () => {
    expect(hasPermission('ESTUDIANTE', ACTIONS.SIGN_UP_TIMESLOT)).toBe(true);
  });

  it('Puede cancelar inscripción', () => {
    expect(hasPermission('ESTUDIANTE', ACTIONS.CANCEL_SIGN_UP)).toBe(true);
  });

  it('Puede unirse a waitlist', () => {
    expect(hasPermission('ESTUDIANTE', ACTIONS.JOIN_WAITLIST)).toBe(true);
  });

  it('Puede asignar créditos', () => {
    expect(hasPermission('ESTUDIANTE', ACTIONS.ASSIGN_CREDITS)).toBe(true);
  });

  it('Puede ver su propio historial', () => {
    expect(hasPermission('ESTUDIANTE', ACTIONS.VIEW_OWN_HISTORY)).toBe(true);
  });

  it('NO puede aprobar estudios', () => {
    expect(hasPermission('ESTUDIANTE', ACTIONS.APPROVE_STUDIES)).toBe(false);
  });

  it('NO puede ver auditoría', () => {
    expect(hasPermission('ESTUDIANTE', ACTIONS.VIEW_AUDIT_LOG)).toBe(false);
  });

  it('NO puede crear estudios', () => {
    expect(hasPermission('ESTUDIANTE', ACTIONS.CREATE_STUDY)).toBe(false);
  });
});
