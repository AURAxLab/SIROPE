/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Tests — Permisos por Rol (RBAC)
 * Verifica que cada rol tenga exactamente los permisos definidos en
 * la tabla de roles y permisos del plan de implementación.
 * Cobertura: 100% de combinaciones rol × acción.
 */

import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  requirePermission,
  getPermissionsForRole,
  getDashboardPathForRole,
  ACTIONS,
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
} from '@/lib/permissions';
import type { Role } from '@/lib/validations';
import type { Action } from '@/lib/permissions';

// ============================================================
// Datos de referencia: la tabla de roles y permisos del plan
// ============================================================

/**
 * Mapa de permisos esperados por rol.
 * Esta es la fuente de verdad contra la que se valida el código.
 * Corresponde exactamente a la tabla de Roles y Permisos del plan.
 */
const EXPECTED_PERMISSIONS: Record<Role, Action[]> = {
  ADMIN: [
    ACTIONS.MANAGE_SEMESTERS,
    ACTIONS.MANAGE_USERS,
    ACTIONS.MANAGE_SYSTEM_CONFIG,
    ACTIONS.MANAGE_INSTITUTION,
    ACTIONS.APPROVE_STUDIES,
    ACTIONS.VIEW_AUDIT_LOG,
    ACTIONS.CREATE_COURSE,
    ACTIONS.VIEW_COURSE_CREDITS,
    ACTIONS.EXPORT_REPORTS,
  ],

  PROFESOR: [
    ACTIONS.CREATE_COURSE,
    ACTIONS.EDIT_OWN_COURSE,
    ACTIONS.VIEW_COURSE_CREDITS,
    ACTIONS.EXPORT_REPORTS,
  ],

  INV_PRINCIPAL: [
    ACTIONS.CREATE_STUDY,
    ACTIONS.EDIT_OWN_STUDY,
    ACTIONS.DELETE_OWN_STUDY,
    ACTIONS.SUBMIT_STUDY_FOR_APPROVAL,
    ACTIONS.MANAGE_COLLABORATORS,
    ACTIONS.CONFIGURE_PRESCREEN,
    ACTIONS.CREATE_TIMESLOT,
    ACTIONS.EDIT_TIMESLOT,
    ACTIONS.IMPORT_TIMESLOTS,
    ACTIONS.VIEW_ENROLLED_PARTICIPANTS,
    ACTIONS.MARK_COMPLETION,
    ACTIONS.BULK_MARK_COMPLETION,
  ],

  INV_EJECUTOR: [
    ACTIONS.CREATE_TIMESLOT,
    ACTIONS.EDIT_TIMESLOT,
    ACTIONS.IMPORT_TIMESLOTS,
    ACTIONS.VIEW_ENROLLED_PARTICIPANTS,
    ACTIONS.MARK_COMPLETION,
    ACTIONS.BULK_MARK_COMPLETION,
  ],

  ESTUDIANTE: [
    ACTIONS.BROWSE_STUDIES,
    ACTIONS.ANSWER_PRESCREEN,
    ACTIONS.SIGN_UP_TIMESLOT,
    ACTIONS.CANCEL_SIGN_UP,
    ACTIONS.JOIN_WAITLIST,
    ACTIONS.ASSIGN_CREDITS,
    ACTIONS.VIEW_OWN_HISTORY,
  ],
};

/** Lista de todos los roles del sistema. */
const ALL_ROLES: Role[] = [
  'ADMIN',
  'PROFESOR',
  'INV_PRINCIPAL',
  'INV_EJECUTOR',
  'ESTUDIANTE',
];

/** Lista de todas las acciones del sistema. */
const ALL_ACTIONS: Action[] = Object.values(ACTIONS);

// ============================================================
// Tests: hasPermission — accesos permitidos
// ============================================================

describe('hasPermission — accesos permitidos', () => {
  for (const role of ALL_ROLES) {
    describe(`Rol: ${role}`, () => {
      const expectedActions = EXPECTED_PERMISSIONS[role];

      for (const action of expectedActions) {
        it(`PERMITE ${action}`, () => {
          expect(hasPermission(role, action)).toBe(true);
        });
      }
    });
  }
});

// ============================================================
// Tests: hasPermission — accesos denegados
// ============================================================

describe('hasPermission — accesos denegados', () => {
  for (const role of ALL_ROLES) {
    describe(`Rol: ${role}`, () => {
      const allowedActions = new Set(EXPECTED_PERMISSIONS[role]);
      const deniedActions = ALL_ACTIONS.filter((a) => !allowedActions.has(a));

      for (const action of deniedActions) {
        it(`DENIEGA ${action}`, () => {
          expect(hasPermission(role, action)).toBe(false);
        });
      }
    });
  }
});

// ============================================================
// Tests: hasPermission — cantidad exacta de permisos por rol
// ============================================================

describe('hasPermission — cantidad exacta de permisos por rol', () => {
  it('ADMIN tiene exactamente 9 permisos', () => {
    expect(getPermissionsForRole('ADMIN')).toHaveLength(9);
  });

  it('PROFESOR tiene exactamente 4 permisos', () => {
    expect(getPermissionsForRole('PROFESOR')).toHaveLength(4);
  });

  it('INV_PRINCIPAL tiene exactamente 12 permisos', () => {
    expect(getPermissionsForRole('INV_PRINCIPAL')).toHaveLength(12);
  });

  it('INV_EJECUTOR tiene exactamente 6 permisos', () => {
    expect(getPermissionsForRole('INV_EJECUTOR')).toHaveLength(6);
  });

  it('ESTUDIANTE tiene exactamente 7 permisos', () => {
    expect(getPermissionsForRole('ESTUDIANTE')).toHaveLength(7);
  });
});

// ============================================================
// Tests: Aislamiento de permisos críticos de seguridad
// ============================================================

describe('Aislamiento de permisos críticos', () => {
  const adminOnlyActions: Action[] = [
    ACTIONS.MANAGE_USERS,
    ACTIONS.MANAGE_SYSTEM_CONFIG,
    ACTIONS.MANAGE_INSTITUTION,
    ACTIONS.APPROVE_STUDIES,
    ACTIONS.VIEW_AUDIT_LOG,
    ACTIONS.MANAGE_SEMESTERS,
  ];

  for (const action of adminOnlyActions) {
    it(`${action} es exclusivo de ADMIN`, () => {
      const rolesWithPermission = ALL_ROLES.filter((r) =>
        hasPermission(r, action)
      );
      expect(rolesWithPermission).toEqual(['ADMIN']);
    });
  }

  const piOnlyActions: Action[] = [
    ACTIONS.CREATE_STUDY,
    ACTIONS.EDIT_OWN_STUDY,
    ACTIONS.DELETE_OWN_STUDY,
    ACTIONS.SUBMIT_STUDY_FOR_APPROVAL,
    ACTIONS.MANAGE_COLLABORATORS,
    ACTIONS.CONFIGURE_PRESCREEN,
  ];

  for (const action of piOnlyActions) {
    it(`${action} es exclusivo de INV_PRINCIPAL`, () => {
      const rolesWithPermission = ALL_ROLES.filter((r) =>
        hasPermission(r, action)
      );
      expect(rolesWithPermission).toEqual(['INV_PRINCIPAL']);
    });
  }

  const studentOnlyActions: Action[] = [
    ACTIONS.BROWSE_STUDIES,
    ACTIONS.ANSWER_PRESCREEN,
    ACTIONS.SIGN_UP_TIMESLOT,
    ACTIONS.CANCEL_SIGN_UP,
    ACTIONS.JOIN_WAITLIST,
    ACTIONS.ASSIGN_CREDITS,
    ACTIONS.VIEW_OWN_HISTORY,
  ];

  for (const action of studentOnlyActions) {
    it(`${action} es exclusivo de ESTUDIANTE`, () => {
      const rolesWithPermission = ALL_ROLES.filter((r) =>
        hasPermission(r, action)
      );
      expect(rolesWithPermission).toEqual(['ESTUDIANTE']);
    });
  }

  it('Estudiante NO puede aprobar estudios', () => {
    expect(hasPermission('ESTUDIANTE', ACTIONS.APPROVE_STUDIES)).toBe(false);
  });

  it('Estudiante NO puede gestionar usuarios', () => {
    expect(hasPermission('ESTUDIANTE', ACTIONS.MANAGE_USERS)).toBe(false);
  });

  it('Profesor NO puede crear estudios', () => {
    expect(hasPermission('PROFESOR', ACTIONS.CREATE_STUDY)).toBe(false);
  });

  it('IE NO puede eliminar estudios', () => {
    expect(hasPermission('INV_EJECUTOR', ACTIONS.DELETE_OWN_STUDY)).toBe(false);
  });

  it('IE NO puede gestionar colaboradores', () => {
    expect(hasPermission('INV_EJECUTOR', ACTIONS.MANAGE_COLLABORATORS)).toBe(false);
  });
});

// ============================================================
// Tests: Permisos compartidos entre IP e IE
// ============================================================

describe('Permisos compartidos IP ↔ IE', () => {
  const sharedActions: Action[] = [
    ACTIONS.CREATE_TIMESLOT,
    ACTIONS.EDIT_TIMESLOT,
    ACTIONS.IMPORT_TIMESLOTS,
    ACTIONS.VIEW_ENROLLED_PARTICIPANTS,
    ACTIONS.MARK_COMPLETION,
    ACTIONS.BULK_MARK_COMPLETION,
  ];

  for (const action of sharedActions) {
    it(`${action} permitido para IP e IE`, () => {
      expect(hasPermission('INV_PRINCIPAL', action)).toBe(true);
      expect(hasPermission('INV_EJECUTOR', action)).toBe(true);
    });
  }
});

// ============================================================
// Tests: requirePermission
// ============================================================

describe('requirePermission', () => {
  it('No lanza error cuando el rol tiene permiso', () => {
    expect(() => {
      requirePermission('ADMIN', ACTIONS.MANAGE_USERS);
    }).not.toThrow();
  });

  it('Lanza error descriptivo cuando el rol NO tiene permiso', () => {
    expect(() => {
      requirePermission('ESTUDIANTE', ACTIONS.MANAGE_USERS);
    }).toThrow('Acceso denegado');
  });

  it('El mensaje de error contiene el rol y la acción', () => {
    expect(() => {
      requirePermission('PROFESOR', ACTIONS.CREATE_STUDY);
    }).toThrow(/PROFESOR/);
  });

  it('El mensaje de error contiene la acción denegada', () => {
    expect(() => {
      requirePermission('PROFESOR', ACTIONS.CREATE_STUDY);
    }).toThrow(/CREATE_STUDY/);
  });
});

// ============================================================
// Tests: getPermissionsForRole
// ============================================================

describe('getPermissionsForRole', () => {
  it('Retorna array para ADMIN', () => {
    const perms = getPermissionsForRole('ADMIN');
    expect(Array.isArray(perms)).toBe(true);
    expect(perms.length).toBeGreaterThan(0);
  });

  it('Retorna exactamente los permisos esperados para cada rol', () => {
    for (const role of ALL_ROLES) {
      const actual = new Set(getPermissionsForRole(role));
      const expected = new Set(EXPECTED_PERMISSIONS[role]);
      expect(actual).toEqual(expected);
    }
  });

  it('Retorna array vacío para rol inválido', () => {
    const perms = getPermissionsForRole('INVALID_ROLE' as Role);
    expect(perms).toEqual([]);
  });
});

// ============================================================
// Tests: getDashboardPathForRole
// ============================================================

describe('getDashboardPathForRole', () => {
  it('ADMIN → /admin', () => {
    expect(getDashboardPathForRole('ADMIN')).toBe('/admin');
  });

  it('PROFESOR → /profesor', () => {
    expect(getDashboardPathForRole('PROFESOR')).toBe('/profesor');
  });

  it('INV_PRINCIPAL → /investigador', () => {
    expect(getDashboardPathForRole('INV_PRINCIPAL')).toBe('/investigador');
  });

  it('INV_EJECUTOR → /investigador (comparte dashboard con IP)', () => {
    expect(getDashboardPathForRole('INV_EJECUTOR')).toBe('/investigador');
  });

  it('ESTUDIANTE → /estudiante', () => {
    expect(getDashboardPathForRole('ESTUDIANTE')).toBe('/estudiante');
  });

  it('Rol inválido → / (fallback)', () => {
    expect(getDashboardPathForRole('UNKNOWN' as Role)).toBe('/');
  });
});

// ============================================================
// Tests: ASSIGNABLE_ROLES
// ============================================================

describe('ASSIGNABLE_ROLES', () => {
  it('No incluye ADMIN (seguridad)', () => {
    expect(ASSIGNABLE_ROLES).not.toContain('ADMIN');
  });

  it('Incluye PROFESOR', () => {
    expect(ASSIGNABLE_ROLES).toContain('PROFESOR');
  });

  it('Incluye INV_PRINCIPAL', () => {
    expect(ASSIGNABLE_ROLES).toContain('INV_PRINCIPAL');
  });

  it('Incluye INV_EJECUTOR', () => {
    expect(ASSIGNABLE_ROLES).toContain('INV_EJECUTOR');
  });

  it('Incluye ESTUDIANTE', () => {
    expect(ASSIGNABLE_ROLES).toContain('ESTUDIANTE');
  });

  it('Tiene exactamente 4 roles asignables', () => {
    expect(ASSIGNABLE_ROLES).toHaveLength(4);
  });
});

// ============================================================
// Tests: ROLE_LABELS
// ============================================================

describe('ROLE_LABELS', () => {
  it('Cada rol tiene una etiqueta en español', () => {
    for (const role of ALL_ROLES) {
      expect(ROLE_LABELS[role]).toBeDefined();
      expect(ROLE_LABELS[role].length).toBeGreaterThan(0);
    }
  });

  it('ADMIN se etiqueta como Administrador', () => {
    expect(ROLE_LABELS.ADMIN).toBe('Administrador');
  });

  it('INV_PRINCIPAL se etiqueta como Investigador Principal', () => {
    expect(ROLE_LABELS.INV_PRINCIPAL).toBe('Investigador Principal');
  });

  it('INV_EJECUTOR se etiqueta como Investigador Ejecutor', () => {
    expect(ROLE_LABELS.INV_EJECUTOR).toBe('Investigador Ejecutor');
  });
});

// ============================================================
// Tests: Completitud — ningún permiso huérfano
// ============================================================

describe('Completitud del sistema de permisos', () => {
  it('Todas las acciones definidas están asignadas al menos a un rol', () => {
    for (const action of ALL_ACTIONS) {
      const rolesWithAction = ALL_ROLES.filter((r) =>
        hasPermission(r, action)
      );
      expect(rolesWithAction.length).toBeGreaterThan(0);
    }
  });

  it('No hay roles sin permisos', () => {
    for (const role of ALL_ROLES) {
      const perms = getPermissionsForRole(role);
      expect(perms.length).toBeGreaterThan(0);
    }
  });

  it('El total de acciones es 29', () => {
    expect(ALL_ACTIONS).toHaveLength(29);
  });
});
