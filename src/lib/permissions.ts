/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Permisos — Control de Acceso Basado en Roles (RBAC)
 * Define las acciones permitidas para cada rol y funciones auxiliares
 * para verificar permisos de forma declarativa y segura.
 */

import { type Role } from './validations';

// ============================================================
// Definición de acciones del sistema
// ============================================================

/**
 * Todas las acciones posibles en el sistema.
 * Cada acción corresponde a una operación que un usuario puede realizar.
 */
export const ACTIONS = {
  // Administración
  MANAGE_SEMESTERS: 'MANAGE_SEMESTERS',
  MANAGE_USERS: 'MANAGE_USERS',
  MANAGE_SYSTEM_CONFIG: 'MANAGE_SYSTEM_CONFIG',
  MANAGE_INSTITUTION: 'MANAGE_INSTITUTION',
  APPROVE_STUDIES: 'APPROVE_STUDIES',
  VIEW_AUDIT_LOG: 'VIEW_AUDIT_LOG',

  // Cursos
  CREATE_COURSE: 'CREATE_COURSE',
  EDIT_OWN_COURSE: 'EDIT_OWN_COURSE',
  VIEW_COURSE_CREDITS: 'VIEW_COURSE_CREDITS',

  // Estudios
  CREATE_STUDY: 'CREATE_STUDY',
  EDIT_OWN_STUDY: 'EDIT_OWN_STUDY',
  DELETE_OWN_STUDY: 'DELETE_OWN_STUDY',
  SUBMIT_STUDY_FOR_APPROVAL: 'SUBMIT_STUDY_FOR_APPROVAL',
  MANAGE_COLLABORATORS: 'MANAGE_COLLABORATORS',
  CONFIGURE_PRESCREEN: 'CONFIGURE_PRESCREEN',

  // Timeslots
  CREATE_TIMESLOT: 'CREATE_TIMESLOT',
  EDIT_TIMESLOT: 'EDIT_TIMESLOT',
  IMPORT_TIMESLOTS: 'IMPORT_TIMESLOTS',
  VIEW_ENROLLED_PARTICIPANTS: 'VIEW_ENROLLED_PARTICIPANTS',

  // Completitud
  MARK_COMPLETION: 'MARK_COMPLETION',
  BULK_MARK_COMPLETION: 'BULK_MARK_COMPLETION',

  // Estudiante
  BROWSE_STUDIES: 'BROWSE_STUDIES',
  ANSWER_PRESCREEN: 'ANSWER_PRESCREEN',
  SIGN_UP_TIMESLOT: 'SIGN_UP_TIMESLOT',
  CANCEL_SIGN_UP: 'CANCEL_SIGN_UP',
  JOIN_WAITLIST: 'JOIN_WAITLIST',
  ASSIGN_CREDITS: 'ASSIGN_CREDITS',
  VIEW_OWN_HISTORY: 'VIEW_OWN_HISTORY',

  // Reportes
  EXPORT_REPORTS: 'EXPORT_REPORTS',
} as const;

export type Action = (typeof ACTIONS)[keyof typeof ACTIONS];

// ============================================================
// Mapa de permisos por rol
// ============================================================

/**
 * Define qué acciones puede realizar cada rol.
 * Esta es la fuente de verdad para todo el control de acceso.
 */
const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Action>> = {
  ADMIN: new Set([
    ACTIONS.MANAGE_SEMESTERS,
    ACTIONS.MANAGE_USERS,
    ACTIONS.MANAGE_SYSTEM_CONFIG,
    ACTIONS.MANAGE_INSTITUTION,
    ACTIONS.APPROVE_STUDIES,
    ACTIONS.VIEW_AUDIT_LOG,
    ACTIONS.CREATE_COURSE,
    ACTIONS.VIEW_COURSE_CREDITS,
    ACTIONS.EXPORT_REPORTS,
  ]),

  PROFESOR: new Set([
    ACTIONS.CREATE_COURSE,
    ACTIONS.EDIT_OWN_COURSE,
    ACTIONS.VIEW_COURSE_CREDITS,
    ACTIONS.EXPORT_REPORTS,
  ]),

  INV_PRINCIPAL: new Set([
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
  ]),

  INV_EJECUTOR: new Set([
    ACTIONS.CREATE_TIMESLOT,
    ACTIONS.EDIT_TIMESLOT,
    ACTIONS.IMPORT_TIMESLOTS,
    ACTIONS.VIEW_ENROLLED_PARTICIPANTS,
    ACTIONS.MARK_COMPLETION,
    ACTIONS.BULK_MARK_COMPLETION,
  ]),

  ESTUDIANTE: new Set([
    ACTIONS.BROWSE_STUDIES,
    ACTIONS.ANSWER_PRESCREEN,
    ACTIONS.SIGN_UP_TIMESLOT,
    ACTIONS.CANCEL_SIGN_UP,
    ACTIONS.JOIN_WAITLIST,
    ACTIONS.ASSIGN_CREDITS,
    ACTIONS.VIEW_OWN_HISTORY,
  ]),
};

// ============================================================
// Funciones de verificación de permisos
// ============================================================

/**
 * Verifica si un rol tiene permiso para realizar una acción específica.
 *
 * @param role - Rol del usuario
 * @param action - Acción a verificar
 * @returns true si el rol tiene permiso para la acción
 */
export function hasPermission(role: Role, action: Action): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) {
    return false;
  }
  return permissions.has(action);
}

/**
 * Verifica si un rol tiene permiso para realizar una acción.
 * Lanza un error si no tiene permiso (útil en server actions).
 *
 * @param role - Rol del usuario
 * @param action - Acción requerida
 * @throws Error con mensaje descriptivo si no tiene permiso
 */
export function requirePermission(role: Role, action: Action): void {
  if (!hasPermission(role, action)) {
    throw new Error(
      `Acceso denegado: el rol "${role}" no tiene permiso para "${action}".`
    );
  }
}

/**
 * Obtiene todas las acciones permitidas para un rol dado.
 *
 * @param role - Rol del usuario
 * @returns Array de acciones permitidas
 */
export function getPermissionsForRole(role: Role): Action[] {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) {
    return [];
  }
  return Array.from(permissions);
}

/**
 * Determina la ruta del dashboard correspondiente al rol del usuario.
 *
 * @param role - Rol del usuario
 * @returns Ruta del dashboard para redireccionamiento
 */
export function getDashboardPathForRole(role: Role): string {
  const dashboardPaths: Record<Role, string> = {
    ADMIN: '/admin',
    PROFESOR: '/profesor',
    INV_PRINCIPAL: '/investigador',
    INV_EJECUTOR: '/investigador',
    ESTUDIANTE: '/estudiante',
  };

  return dashboardPaths[role] || '/';
}

/**
 * Lista de roles que pueden ser asignados a nuevos usuarios.
 * Excluye ADMIN por seguridad (solo otro ADMIN puede crear admins).
 */
export const ASSIGNABLE_ROLES: Role[] = [
  'PROFESOR',
  'INV_PRINCIPAL',
  'INV_EJECUTOR',
  'ESTUDIANTE',
];

/**
 * Etiquetas legibles en español para cada rol.
 */
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador',
  PROFESOR: 'Profesor',
  INV_PRINCIPAL: 'Investigador Principal',
  INV_EJECUTOR: 'Investigador Ejecutor',
  ESTUDIANTE: 'Estudiante',
};
