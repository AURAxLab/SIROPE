/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Tests — Validaciones Zod
 * Verifica que los schemas de validación acepten datos válidos
 * y rechacen datos inválidos con mensajes en español.
 */

import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  institutionConfigSchema,
  semesterSchema,
  courseSchema,
  studySchema,
  prescreenQuestionSchema,
  prescreenAnswerSchema,
  timeslotSchema,
  timeslotImportRowSchema,
  creditAssignmentSchema,
  markCompletionSchema,
  bulkCompletionSchema,
  studyApprovalSchema,
  RoleEnum,
  StudyStatusEnum,
  TimeslotStatusEnum,
  ParticipationStatusEnum,
  WaitlistStatusEnum,
  AuthModeEnum,
} from '@/lib/validations';

// ============================================================
// Tests: Enums
// ============================================================

describe('Enums del sistema', () => {
  it('RoleEnum acepta los 5 roles válidos', () => {
    const roles = ['ADMIN', 'PROFESOR', 'INV_PRINCIPAL', 'INV_EJECUTOR', 'ESTUDIANTE'];
    for (const role of roles) {
      expect(RoleEnum.safeParse(role).success).toBe(true);
    }
  });

  it('RoleEnum rechaza roles inválidos', () => {
    expect(RoleEnum.safeParse('SUPERADMIN').success).toBe(false);
    expect(RoleEnum.safeParse('').success).toBe(false);
  });

  it('StudyStatusEnum acepta los 5 estados válidos', () => {
    const statuses = ['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'CLOSED', 'REJECTED'];
    for (const status of statuses) {
      expect(StudyStatusEnum.safeParse(status).success).toBe(true);
    }
  });

  it('TimeslotStatusEnum acepta correctamente', () => {
    expect(TimeslotStatusEnum.safeParse('AVAILABLE').success).toBe(true);
    expect(TimeslotStatusEnum.safeParse('FULL').success).toBe(true);
    expect(TimeslotStatusEnum.safeParse('CANCELLED').success).toBe(true);
    expect(TimeslotStatusEnum.safeParse('OPEN').success).toBe(false);
  });

  it('ParticipationStatusEnum acepta correctamente', () => {
    const valid = ['SIGNED_UP', 'REMINDED', 'COMPLETED', 'NO_SHOW', 'CANCELLED'];
    for (const s of valid) {
      expect(ParticipationStatusEnum.safeParse(s).success).toBe(true);
    }
  });

  it('WaitlistStatusEnum acepta correctamente', () => {
    expect(WaitlistStatusEnum.safeParse('WAITING').success).toBe(true);
    expect(WaitlistStatusEnum.safeParse('NOTIFIED').success).toBe(true);
    expect(WaitlistStatusEnum.safeParse('EXPIRED').success).toBe(true);
  });

  it('AuthModeEnum acepta CREDENTIALS y LDAP', () => {
    expect(AuthModeEnum.safeParse('CREDENTIALS').success).toBe(true);
    expect(AuthModeEnum.safeParse('LDAP').success).toBe(true);
    expect(AuthModeEnum.safeParse('OAUTH').success).toBe(false);
  });
});

// ============================================================
// Tests: loginSchema
// ============================================================

describe('loginSchema', () => {
  it('Acepta credenciales válidas', () => {
    const result = loginSchema.safeParse({
      email: 'user@ucr.ac.cr',
      password: 'Password1',
    });
    expect(result.success).toBe(true);
  });

  it('Rechaza email inválido', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'Password1',
    });
    expect(result.success).toBe(false);
  });

  it('Rechaza contraseña corta (<8 caracteres)', () => {
    const result = loginSchema.safeParse({
      email: 'user@ucr.ac.cr',
      password: 'Pass1',
    });
    expect(result.success).toBe(false);
  });

  it('Rechaza email vacío', () => {
    const result = loginSchema.safeParse({ email: '', password: 'Password1' });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// Tests: registerSchema
// ============================================================

describe('registerSchema', () => {
  const validRegister = {
    email: 'nuevo@ucr.ac.cr',
    password: 'Sirope2026!',
    confirmPassword: 'Sirope2026!',
    name: 'Juan Pérez',
    role: 'ESTUDIANTE' as const,
    studentId: 'B90123',
  };

  it('Acepta registro válido completo', () => {
    const result = registerSchema.safeParse(validRegister);
    expect(result.success).toBe(true);
  });

  it('Rechaza contraseña sin mayúscula', () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      password: 'sirope2026!',
      confirmPassword: 'sirope2026!',
    });
    expect(result.success).toBe(false);
  });

  it('Rechaza contraseña sin número', () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      password: 'SiropeTest!',
      confirmPassword: 'SiropeTest!',
    });
    expect(result.success).toBe(false);
  });

  it('Rechaza contraseña sin minúscula', () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      password: 'SIROPE2026!',
      confirmPassword: 'SIROPE2026!',
    });
    expect(result.success).toBe(false);
  });

  it('Rechaza cuando contraseñas no coinciden', () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      confirmPassword: 'DifferentPass1',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('confirmPassword');
    }
  });

  it('Rechaza nombre muy corto', () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      name: 'A',
    });
    expect(result.success).toBe(false);
  });

  it('Rechaza rol inválido', () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      role: 'SUPERADMIN',
    });
    expect(result.success).toBe(false);
  });

  it('studentId es opcional', () => {
    const { studentId: _unused, ...withoutStudentId } = validRegister;
    void _unused;
    const result = registerSchema.safeParse(withoutStudentId);
    expect(result.success).toBe(true);
  });
});

// ============================================================
// Tests: forgotPasswordSchema & resetPasswordSchema
// ============================================================

describe('forgotPasswordSchema', () => {
  it('Acepta email válido', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'a@b.com' }).success).toBe(true);
  });

  it('Rechaza email inválido', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'bad' }).success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('Acepta datos válidos', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'abc123',
      password: 'NewPass123',
      confirmPassword: 'NewPass123',
    });
    expect(result.success).toBe(true);
  });

  it('Rechaza contraseñas que no coinciden', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'abc123',
      password: 'NewPass123',
      confirmPassword: 'DiffPass123',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// Tests: institutionConfigSchema
// ============================================================

describe('institutionConfigSchema', () => {
  const validConfig = {
    name: 'Escuela de Ciencias de la Computación',
    shortName: 'ECCI',
    universityName: 'Universidad de Costa Rica',
    primaryColor: '#4F46E5',
    accentColor: '#F59E0B',
    contactEmail: 'sirope@ecci.ucr.ac.cr',
    timezone: 'America/Costa_Rica',
    studentIdLabel: 'Carné',
    authMode: 'CREDENTIALS' as const,
  };

  it('Acepta configuración válida', () => {
    expect(institutionConfigSchema.safeParse(validConfig).success).toBe(true);
  });

  it('Rechaza color hexadecimal inválido', () => {
    const result = institutionConfigSchema.safeParse({
      ...validConfig,
      primaryColor: 'red',
    });
    expect(result.success).toBe(false);
  });

  it('Rechaza modo de auth inválido', () => {
    const result = institutionConfigSchema.safeParse({
      ...validConfig,
      authMode: 'OAUTH',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// Tests: semesterSchema
// ============================================================

describe('semesterSchema', () => {
  it('Acepta formato válido I-2026', () => {
    const result = semesterSchema.safeParse({
      name: 'I-2026',
      startDate: '2026-03-09T00:00:00.000Z',
      endDate: '2026-07-10T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('Acepta formato II-2026', () => {
    const result = semesterSchema.safeParse({
      name: 'II-2026',
      startDate: '2026-08-01T00:00:00.000Z',
      endDate: '2026-12-15T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('Rechaza formato inválido', () => {
    const result = semesterSchema.safeParse({
      name: 'Semestre 1',
      startDate: '2026-03-09T00:00:00.000Z',
      endDate: '2026-07-10T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('Rechaza cuando fin es antes de inicio', () => {
    const result = semesterSchema.safeParse({
      name: 'I-2026',
      startDate: '2026-07-10T00:00:00.000Z',
      endDate: '2026-03-09T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// Tests: courseSchema
// ============================================================

describe('courseSchema', () => {
  it('Acepta curso válido', () => {
    const result = courseSchema.safeParse({
      code: 'CI-1101',
      name: 'Introducción a la Computación',
      semesterId: 'sem-1',
      maxExtraCredits: 2.0,
      optedIn: true,
    });
    expect(result.success).toBe(true);
  });

  it('Rechaza créditos negativos', () => {
    const result = courseSchema.safeParse({
      code: 'CI-1101',
      name: 'Test',
      semesterId: 'sem-1',
      maxExtraCredits: -1,
      optedIn: true,
    });
    expect(result.success).toBe(false);
  });

  it('Rechaza créditos mayores a 10', () => {
    const result = courseSchema.safeParse({
      code: 'CI-1101',
      name: 'Test',
      semesterId: 'sem-1',
      maxExtraCredits: 11,
      optedIn: true,
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// Tests: studySchema
// ============================================================

describe('studySchema', () => {
  const validStudy = {
    title: 'Estudio sobre usabilidad de interfaces',
    description: 'Un estudio completo que examina patrones de interfaz en aplicaciones móviles.',
    semesterId: 'sem-1',
    creditsWorth: 1.0,
    estimatedDuration: 45,
  };

  it('Acepta estudio válido', () => {
    expect(studySchema.safeParse(validStudy).success).toBe(true);
  });

  it('Rechaza título muy corto', () => {
    const result = studySchema.safeParse({ ...validStudy, title: 'Hola' });
    expect(result.success).toBe(false);
  });

  it('Rechaza descripción muy corta', () => {
    const result = studySchema.safeParse({ ...validStudy, description: 'Corto' });
    expect(result.success).toBe(false);
  });

  it('Rechaza créditos menores a 0.5', () => {
    const result = studySchema.safeParse({ ...validStudy, creditsWorth: 0.2 });
    expect(result.success).toBe(false);
  });

  it('Rechaza duración menor a 5 minutos', () => {
    const result = studySchema.safeParse({ ...validStudy, estimatedDuration: 3 });
    expect(result.success).toBe(false);
  });

  it('Rechaza duración mayor a 480 minutos', () => {
    const result = studySchema.safeParse({ ...validStudy, estimatedDuration: 500 });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// Tests: prescreenQuestionSchema & prescreenAnswerSchema
// ============================================================

describe('prescreenQuestionSchema', () => {
  it('Acepta pregunta válida', () => {
    const result = prescreenQuestionSchema.safeParse({
      questionText: '¿Tiene experiencia usando apps móviles?',
      requiredAnswer: true,
      orderIndex: 0,
    });
    expect(result.success).toBe(true);
  });

  it('Rechaza pregunta muy corta', () => {
    const result = prescreenQuestionSchema.safeParse({
      questionText: 'Hola',
      requiredAnswer: true,
      orderIndex: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('prescreenAnswerSchema', () => {
  it('Acepta respuesta válida', () => {
    const result = prescreenAnswerSchema.safeParse({
      questionId: 'q-1',
      answer: true,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// Tests: timeslotSchema
// ============================================================

describe('timeslotSchema', () => {
  it('Acepta timeslot válido', () => {
    const result = timeslotSchema.safeParse({
      studyId: 'study-1',
      startTime: '2026-04-01T09:00:00.000Z',
      endTime: '2026-04-01T10:00:00.000Z',
      maxParticipants: 5,
    });
    expect(result.success).toBe(true);
  });

  it('Rechaza cuando fin es antes de inicio', () => {
    const result = timeslotSchema.safeParse({
      studyId: 'study-1',
      startTime: '2026-04-01T10:00:00.000Z',
      endTime: '2026-04-01T09:00:00.000Z',
      maxParticipants: 5,
    });
    expect(result.success).toBe(false);
  });

  it('Rechaza participantes en 0', () => {
    const result = timeslotSchema.safeParse({
      studyId: 'study-1',
      startTime: '2026-04-01T09:00:00.000Z',
      endTime: '2026-04-01T10:00:00.000Z',
      maxParticipants: 0,
    });
    expect(result.success).toBe(false);
  });

  it('Rechaza más de 500 participantes', () => {
    const result = timeslotSchema.safeParse({
      studyId: 'study-1',
      startTime: '2026-04-01T09:00:00.000Z',
      endTime: '2026-04-01T10:00:00.000Z',
      maxParticipants: 501,
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// Tests: timeslotImportRowSchema
// ============================================================

describe('timeslotImportRowSchema', () => {
  it('Acepta fila válida', () => {
    const result = timeslotImportRowSchema.safeParse({
      fecha: '2026-04-01',
      horaInicio: '09:00',
      horaFin: '10:00',
      maxParticipantes: 3,
    });
    expect(result.success).toBe(true);
  });

  it('Rechaza fecha vacía', () => {
    const result = timeslotImportRowSchema.safeParse({
      fecha: '',
      horaInicio: '09:00',
      horaFin: '10:00',
      maxParticipantes: 3,
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// Tests: creditAssignmentSchema & markCompletionSchema
// ============================================================

describe('creditAssignmentSchema', () => {
  it('Acepta asignación válida', () => {
    const result = creditAssignmentSchema.safeParse({
      participationId: 'part-1',
      courseId: 'course-1',
      credits: 1.0,
    });
    expect(result.success).toBe(true);
  });

  it('Rechaza créditos menores a 0.5', () => {
    const result = creditAssignmentSchema.safeParse({
      participationId: 'part-1',
      courseId: 'course-1',
      credits: 0.1,
    });
    expect(result.success).toBe(false);
  });
});

describe('markCompletionSchema', () => {
  it('Acepta COMPLETED', () => {
    const result = markCompletionSchema.safeParse({
      participationId: 'part-1',
      status: 'COMPLETED',
    });
    expect(result.success).toBe(true);
  });

  it('Acepta NO_SHOW', () => {
    const result = markCompletionSchema.safeParse({
      participationId: 'part-1',
      status: 'NO_SHOW',
    });
    expect(result.success).toBe(true);
  });

  it('Rechaza estado inválido', () => {
    const result = markCompletionSchema.safeParse({
      participationId: 'part-1',
      status: 'CANCELLED',
    });
    expect(result.success).toBe(false);
  });
});

describe('bulkCompletionSchema', () => {
  it('Acepta lote válido', () => {
    const result = bulkCompletionSchema.safeParse({
      participationIds: ['p1', 'p2', 'p3'],
      status: 'COMPLETED',
    });
    expect(result.success).toBe(true);
  });

  it('Rechaza array vacío', () => {
    const result = bulkCompletionSchema.safeParse({
      participationIds: [],
      status: 'COMPLETED',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// Tests: studyApprovalSchema
// ============================================================

describe('studyApprovalSchema', () => {
  it('Acepta aprobación válida', () => {
    const result = studyApprovalSchema.safeParse({
      studyId: 'study-1',
      decision: 'APPROVE',
    });
    expect(result.success).toBe(true);
  });

  it('Acepta rechazo con razón', () => {
    const result = studyApprovalSchema.safeParse({
      studyId: 'study-1',
      decision: 'REJECT',
      rejectionReason: 'El diseño del estudio es inadecuado.',
    });
    expect(result.success).toBe(true);
  });

  it('Rechaza rechazo sin razón', () => {
    const result = studyApprovalSchema.safeParse({
      studyId: 'study-1',
      decision: 'REJECT',
    });
    expect(result.success).toBe(false);
  });

  it('Rechaza decisión inválida', () => {
    const result = studyApprovalSchema.safeParse({
      studyId: 'study-1',
      decision: 'MAYBE',
    });
    expect(result.success).toBe(false);
  });
});
