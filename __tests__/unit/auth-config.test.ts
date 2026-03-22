/**
 * SIROPE — Tests: AuthMode Logic & Configuration
 * Verifica la lógica de selección de modo de autenticación,
 * enums, schemas de configuración institucional, y reglas de auditoría.
 */

import { describe, it, expect } from 'vitest';
import {
  AuthModeEnum,
  RoleEnum,
  StudyStatusEnum,
  ParticipationStatusEnum,
  WaitlistStatusEnum,
  institutionConfigSchema,
} from '@/lib/validations';
import { hasPermission, ACTIONS } from '@/lib/permissions';
import type { Role } from '@/lib/validations';

const ALL_ROLES: Role[] = ['ADMIN', 'PROFESOR', 'INV_PRINCIPAL', 'INV_EJECUTOR', 'ESTUDIANTE'];

// ============================================================
// Tests: AuthMode enum
// ============================================================

describe('AuthMode enum', () => {
  it('Acepta CREDENTIALS', () => {
    expect(AuthModeEnum.safeParse('CREDENTIALS').success).toBe(true);
  });

  it('Acepta LDAP', () => {
    expect(AuthModeEnum.safeParse('LDAP').success).toBe(true);
  });

  it('Rechaza valor inválido', () => {
    expect(AuthModeEnum.safeParse('OAUTH').success).toBe(false);
    expect(AuthModeEnum.safeParse('').success).toBe(false);
    expect(AuthModeEnum.safeParse('credentials').success).toBe(false);
  });
});

// ============================================================
// Tests: InstitutionConfig schema
// ============================================================

describe('institutionConfigSchema', () => {
  const validConfig = {
    name: 'Escuela de Ciencias',
    shortName: 'ECCI',
    universityName: 'Universidad de CR',
    primaryColor: '#4F46E5',
    accentColor: '#F59E0B',
    contactEmail: 'sirope@universidad.cr',
    website: 'https://universidad.cr',
    timezone: 'America/Costa_Rica',
    studentIdLabel: 'Carné',
    authMode: 'CREDENTIALS',
  };

  it('Configuración válida completa', () => {
    expect(institutionConfigSchema.safeParse(validConfig).success).toBe(true);
  });

  it('Acepta authMode LDAP', () => {
    expect(institutionConfigSchema.safeParse({ ...validConfig, authMode: 'LDAP' }).success).toBe(true);
  });

  it('Nombre vacío rechazado', () => {
    expect(institutionConfigSchema.safeParse({ ...validConfig, name: '' }).success).toBe(false);
  });

  it('Email inválido rechazado', () => {
    expect(institutionConfigSchema.safeParse({ ...validConfig, contactEmail: 'not-an-email' }).success).toBe(false);
  });

  it('Timezone vacío rechazado', () => {
    expect(institutionConfigSchema.safeParse({ ...validConfig, timezone: '' }).success).toBe(false);
  });
});

// ============================================================
// Tests: Enums de estado
// ============================================================

describe('Enums de estado del sistema', () => {
  it('StudyStatus tiene todos los estados del lifecycle', () => {
    const expected = ['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'CLOSED', 'REJECTED'];
    for (const status of expected) {
      expect(StudyStatusEnum.safeParse(status).success).toBe(true);
    }
  });

  it('ParticipationStatus tiene todos los estados', () => {
    const expected = ['SIGNED_UP', 'REMINDED', 'COMPLETED', 'NO_SHOW', 'CANCELLED'];
    for (const status of expected) {
      expect(ParticipationStatusEnum.safeParse(status).success).toBe(true);
    }
  });

  it('WaitlistStatus tiene todos los estados', () => {
    const expected = ['WAITING', 'NOTIFIED', 'EXPIRED'];
    for (const status of expected) {
      expect(WaitlistStatusEnum.safeParse(status).success).toBe(true);
    }
  });

  it('RoleEnum tiene exactamente 5 roles', () => {
    const roles = ['ADMIN', 'PROFESOR', 'INV_PRINCIPAL', 'INV_EJECUTOR', 'ESTUDIANTE'];
    for (const role of roles) {
      expect(RoleEnum.safeParse(role).success).toBe(true);
    }
    expect(RoleEnum.safeParse('SUPERADMIN').success).toBe(false);
  });
});

// ============================================================
// Tests: Permisos de administración
// ============================================================

describe('Permisos de administración', () => {
  it('Solo ADMIN puede gestionar configuración del sistema', () => {
    for (const role of ALL_ROLES) {
      expect(hasPermission(role, ACTIONS.MANAGE_SYSTEM_CONFIG)).toBe(role === 'ADMIN');
    }
  });

  it('Solo ADMIN puede gestionar usuarios', () => {
    for (const role of ALL_ROLES) {
      expect(hasPermission(role, ACTIONS.MANAGE_USERS)).toBe(role === 'ADMIN');
    }
  });

  it('Solo ADMIN puede aprobar estudios', () => {
    for (const role of ALL_ROLES) {
      expect(hasPermission(role, ACTIONS.APPROVE_STUDIES)).toBe(role === 'ADMIN');
    }
  });

  it('Solo ADMIN puede ver logs de auditoría', () => {
    for (const role of ALL_ROLES) {
      expect(hasPermission(role, ACTIONS.VIEW_AUDIT_LOG)).toBe(role === 'ADMIN');
    }
  });

  it('Solo ADMIN puede gestionar semestres', () => {
    for (const role of ALL_ROLES) {
      expect(hasPermission(role, ACTIONS.MANAGE_SEMESTERS)).toBe(role === 'ADMIN');
    }
  });
});

// ============================================================
// Tests: Separación de responsabilidades investigador
// ============================================================

describe('Separación de responsabilidades entre investigadores', () => {
  it('Solo INV_PRINCIPAL puede crear estudios', () => {
    expect(hasPermission('INV_PRINCIPAL', ACTIONS.CREATE_STUDY)).toBe(true);
    expect(hasPermission('INV_EJECUTOR', ACTIONS.CREATE_STUDY)).toBe(false);
  });

  it('Ambos pueden marcar completitud', () => {
    expect(hasPermission('INV_PRINCIPAL', ACTIONS.MARK_COMPLETION)).toBe(true);
    expect(hasPermission('INV_EJECUTOR', ACTIONS.MARK_COMPLETION)).toBe(true);
  });

  it('Ambos pueden crear y editar timeslots', () => {
    expect(hasPermission('INV_PRINCIPAL', ACTIONS.CREATE_TIMESLOT)).toBe(true);
    expect(hasPermission('INV_EJECUTOR', ACTIONS.CREATE_TIMESLOT)).toBe(true);
    expect(hasPermission('INV_PRINCIPAL', ACTIONS.EDIT_TIMESLOT)).toBe(true);
    expect(hasPermission('INV_EJECUTOR', ACTIONS.EDIT_TIMESLOT)).toBe(true);
  });

  it('Solo INV_PRINCIPAL puede gestionar colaboradores', () => {
    expect(hasPermission('INV_PRINCIPAL', ACTIONS.MANAGE_COLLABORATORS)).toBe(true);
    expect(hasPermission('INV_EJECUTOR', ACTIONS.MANAGE_COLLABORATORS)).toBe(false);
  });

  it('Solo INV_PRINCIPAL puede configurar prescreen', () => {
    expect(hasPermission('INV_PRINCIPAL', ACTIONS.CONFIGURE_PRESCREEN)).toBe(true);
    expect(hasPermission('INV_EJECUTOR', ACTIONS.CONFIGURE_PRESCREEN)).toBe(false);
  });

  it('Solo INV_PRINCIPAL puede editar y eliminar estudios propios', () => {
    expect(hasPermission('INV_PRINCIPAL', ACTIONS.EDIT_OWN_STUDY)).toBe(true);
    expect(hasPermission('INV_EJECUTOR', ACTIONS.EDIT_OWN_STUDY)).toBe(false);
    expect(hasPermission('INV_PRINCIPAL', ACTIONS.DELETE_OWN_STUDY)).toBe(true);
    expect(hasPermission('INV_EJECUTOR', ACTIONS.DELETE_OWN_STUDY)).toBe(false);
  });
});

// ============================================================
// Tests: Permisos de profesor
// ============================================================

describe('Permisos de profesor', () => {
  it('Puede crear cursos', () => {
    expect(hasPermission('PROFESOR', ACTIONS.CREATE_COURSE)).toBe(true);
  });

  it('Puede ver créditos del curso', () => {
    expect(hasPermission('PROFESOR', ACTIONS.VIEW_COURSE_CREDITS)).toBe(true);
  });

  it('Puede editar sus propios cursos', () => {
    expect(hasPermission('PROFESOR', ACTIONS.EDIT_OWN_COURSE)).toBe(true);
  });

  it('Puede exportar reportes', () => {
    expect(hasPermission('PROFESOR', ACTIONS.EXPORT_REPORTS)).toBe(true);
  });

  it('NO puede crear estudios', () => {
    expect(hasPermission('PROFESOR', ACTIONS.CREATE_STUDY)).toBe(false);
  });

  it('NO puede aprobar estudios', () => {
    expect(hasPermission('PROFESOR', ACTIONS.APPROVE_STUDIES)).toBe(false);
  });

  it('NO puede gestionar usuarios', () => {
    expect(hasPermission('PROFESOR', ACTIONS.MANAGE_USERS)).toBe(false);
  });
});

// ============================================================
// Tests: Acciones que NO tiene cada rol (negative tests)
// ============================================================

describe('Negative permission tests', () => {
  it('ESTUDIANTE no tiene acceso a nada administrativo', () => {
    expect(hasPermission('ESTUDIANTE', ACTIONS.MANAGE_USERS)).toBe(false);
    expect(hasPermission('ESTUDIANTE', ACTIONS.MANAGE_SEMESTERS)).toBe(false);
    expect(hasPermission('ESTUDIANTE', ACTIONS.MANAGE_SYSTEM_CONFIG)).toBe(false);
    expect(hasPermission('ESTUDIANTE', ACTIONS.APPROVE_STUDIES)).toBe(false);
    expect(hasPermission('ESTUDIANTE', ACTIONS.VIEW_AUDIT_LOG)).toBe(false);
    expect(hasPermission('ESTUDIANTE', ACTIONS.CREATE_STUDY)).toBe(false);
    expect(hasPermission('ESTUDIANTE', ACTIONS.CREATE_COURSE)).toBe(false);
  });

  it('INV_EJECUTOR tiene un subset limitado de INV_PRINCIPAL', () => {
    // Things IP has that IE doesn't
    expect(hasPermission('INV_EJECUTOR', ACTIONS.CREATE_STUDY)).toBe(false);
    expect(hasPermission('INV_EJECUTOR', ACTIONS.EDIT_OWN_STUDY)).toBe(false);
    expect(hasPermission('INV_EJECUTOR', ACTIONS.DELETE_OWN_STUDY)).toBe(false);
    expect(hasPermission('INV_EJECUTOR', ACTIONS.SUBMIT_STUDY_FOR_APPROVAL)).toBe(false);
    expect(hasPermission('INV_EJECUTOR', ACTIONS.MANAGE_COLLABORATORS)).toBe(false);
    expect(hasPermission('INV_EJECUTOR', ACTIONS.CONFIGURE_PRESCREEN)).toBe(false);
  });
});
