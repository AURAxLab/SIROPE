/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Acciones de Servidor — Administración
 * Gestiona usuarios, semestres, configuración del sistema, y auditoría.
 * Solo accesible por administradores.
 */

'use server';

import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { requirePermission, ACTIONS } from '@/lib/permissions';
import { getAuditLogs } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit';
import {
  semesterSchema,
  institutionConfigSchema,
  registerSchema,
} from '@/lib/validations';
import type { Role } from '@/lib/validations';
import { hashPassword } from '@/lib/auth-utils';

// ============================================================
// Tipos
// ============================================================

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================
// Gestión de Usuarios
// ============================================================

/**
 * Lista todos los usuarios del sistema con paginación y filtros.
 * Solo ADMIN puede acceder.
 *
 * @param filters - Filtros opcionales
 * @returns Lista paginada de usuarios
 */
export async function getUsers(filters: {
  search?: string;
  role?: string;
  active?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'No autenticado' };

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.MANAGE_USERS);

  const { search, role: roleFilter, active, page = 1, pageSize = 25 } = filters;
  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { studentId: { contains: search } },
    ];
  }
  if (roleFilter) where.role = roleFilter;
  if (active !== undefined) where.active = active;

  const skip = (page - 1) * pageSize;
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        studentId: true,
        active: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
      skip,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    success: true,
    data: {
      users,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Crea un nuevo usuario en el sistema.
 * Solo ADMIN puede crear usuarios.
 *
 * @param formData - Datos del nuevo usuario
 */
export async function createUser(formData: {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  role: string;
  studentId?: string;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'No autenticado' };

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.MANAGE_USERS);

  const parsed = registerSchema.safeParse(formData);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || 'Datos inválidos';
    return { success: false, error: firstError };
  }

  // Verificar que el email no exista
  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return { success: false, error: 'Ya existe un usuario con ese correo' };
  }

  const hashedPassword = await hashPassword(parsed.data.password);

  const newUser = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role,
      studentId: parsed.data.studentId,
      passwordHash: hashedPassword,
      active: true,
    },
  });

  await logAuditEvent({
    userId: session.user.id,
    action: 'CREATE_USER',
    entityType: 'User',
    entityId: newUser.id,
    newState: { email: newUser.email, role: newUser.role },
  });

  return { success: true, data: { id: newUser.id, email: newUser.email } };
}

/**
 * Actualiza el rol o estado activo de un usuario.
 * Solo ADMIN. No puede desactivarse a sí mismo.
 *
 * @param userId - ID del usuario a modificar
 * @param updates - Campos a actualizar
 */
export async function updateUser(
  userId: string,
  updates: { role?: string; active?: boolean; name?: string }
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'No autenticado' };

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.MANAGE_USERS);

  if (userId === session.user.id && updates.active === false) {
    return { success: false, error: 'No puede desactivar su propia cuenta' };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, error: 'Usuario no encontrado' };

  const updateData: Record<string, unknown> = {};
  if (updates.role) updateData.role = updates.role;
  if (updates.active !== undefined) updateData.active = updates.active;
  if (updates.name) updateData.name = updates.name;

  await prisma.user.update({ where: { id: userId }, data: updateData });

  await logAuditEvent({
    userId: session.user.id,
    action: 'UPDATE_USER',
    entityType: 'User',
    entityId: userId,
    previousState: { role: user.role, active: user.active },
    newState: updateData,
  });

  return { success: true };
}

/**
 * Resetea la contraseña de un usuario a una temporal generada.
 * Solo ADMIN. No puede resetear su propia contraseña aquí.
 *
 * @param userId - ID del usuario
 * @returns Contraseña temporal generada
 */
export async function resetUserPassword(userId: string): Promise<ActionResult<{ tempPassword: string }>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'No autenticado' };

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.MANAGE_USERS);

  if (userId === session.user.id) {
    return { success: false, error: 'No puede resetear su propia contraseña desde aquí' };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, error: 'Usuario no encontrado' };

  // Generar contraseña temporal de 12 caracteres
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
  let tempPassword = '';
  for (let i = 0; i < 12; i++) {
    tempPassword += chars[Math.floor(Math.random() * chars.length)];
  }

  const hashedPassword = await hashPassword(tempPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashedPassword },
  });

  await logAuditEvent({
    userId: session.user.id,
    action: 'RESET_PASSWORD',
    entityType: 'User',
    entityId: userId,
    newState: { targetUser: user.email },
  });

  return { success: true, data: { tempPassword } };
}

// ============================================================
// Gestión de Semestres
// ============================================================

/**
 * Lista todos los semestres del sistema.
 */
export async function getSemesters(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'No autenticado' };

  const semesters = await prisma.semester.findMany({
    include: {
      _count: { select: { courses: true, studies: true } },
    },
    orderBy: { startDate: 'desc' },
  });

  return { success: true, data: semesters };
}

/**
 * Crea un nuevo semestre.
 * Solo ADMIN. Desactiva el anterior si se marca como activo.
 *
 * @param formData - Datos del semestre
 */
export async function createSemester(formData: {
  name: string;
  startDate: string;
  endDate: string;
  active?: boolean;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'No autenticado' };

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.MANAGE_SEMESTERS);

  const parsed = semesterSchema.safeParse(formData);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || 'Datos inválidos';
    return { success: false, error: firstError };
  }

  // Si se activa este semestre, desactivar los demás
  if (formData.active) {
    await prisma.semester.updateMany({
      where: { active: true },
      data: { active: false },
    });
  }

  const semester = await prisma.semester.create({
    data: {
      name: parsed.data.name,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
      active: formData.active ?? false,
    },
  });

  await logAuditEvent({
    userId: session.user.id,
    action: 'CREATE_SEMESTER',
    entityType: 'Semester',
    entityId: semester.id,
    newState: { name: semester.name, active: semester.active },
  });

  return { success: true, data: semester };
}

/**
 * Activa un semestre y desactiva todos los demás.
 *
 * @param semesterId - ID del semestre a activar
 */
export async function activateSemester(semesterId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'No autenticado' };

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.MANAGE_SEMESTERS);

  await prisma.semester.updateMany({
    where: { active: true },
    data: { active: false },
  });

  await prisma.semester.update({
    where: { id: semesterId },
    data: { active: true },
  });

  await logAuditEvent({
    userId: session.user.id,
    action: 'ACTIVATE_SEMESTER',
    entityType: 'Semester',
    entityId: semesterId,
    newState: { active: true },
  });

  return { success: true };
}

// ============================================================
// Configuración del Sistema
// ============================================================

/**
 * Obtiene toda la configuración del sistema.
 */
export async function getSystemConfig(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'No autenticado' };

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.MANAGE_SYSTEM_CONFIG);

  const configs = await prisma.systemConfig.findMany({
    orderBy: { key: 'asc' },
  });

  return { success: true, data: configs };
}

/**
 * Actualiza una configuración del sistema.
 *
 * @param key - Clave de configuración
 * @param value - Nuevo valor
 */
export async function updateSystemConfig(
  key: string,
  value: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'No autenticado' };

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.MANAGE_SYSTEM_CONFIG);

  const existing = await prisma.systemConfig.findUnique({ where: { key } });
  const previousValue = existing?.value;

  await prisma.systemConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });

  await logAuditEvent({
    userId: session.user.id,
    action: 'UPDATE_SYSTEM_CONFIG',
    entityType: 'SystemConfig',
    entityId: key,
    previousState: previousValue ? { value: previousValue } : null,
    newState: { value },
  });

  return { success: true };
}

/**
 * Actualiza la configuración institucional completa.
 *
 * @param formData - Datos de la institución
 */
export async function updateInstitutionConfig(formData: {
  name: string;
  shortName: string;
  universityName: string;
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;
  contactEmail: string;
  website?: string;
  timezone: string;
  studentIdLabel: string;
  authMode: string;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'No autenticado' };

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.MANAGE_SYSTEM_CONFIG);

  const parsed = institutionConfigSchema.safeParse(formData);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || 'Datos inválidos';
    return { success: false, error: firstError };
  }

  // Guardar cada campo como par clave/valor en SystemConfig
  const entries = Object.entries(parsed.data);
  for (const [key, value] of entries) {
    const stringValue = typeof value === 'string' ? value : String(value);
    await prisma.systemConfig.upsert({
      where: { key: `INSTITUTION_${key.toUpperCase()}` },
      update: { value: stringValue },
      create: { key: `INSTITUTION_${key.toUpperCase()}`, value: stringValue },
    });
  }

  await logAuditEvent({
    userId: session.user.id,
    action: 'UPDATE_INSTITUTION_CONFIG',
    entityType: 'SystemConfig',
    entityId: 'institution',
    newState: parsed.data as unknown as Record<string, unknown>,
  });

  // Also update InstitutionConfig model directly (used by auth.ts)
  await prisma.institutionConfig.upsert({
    where: { id: 'singleton' },
    update: {
      name: parsed.data.name,
      shortName: parsed.data.shortName,
      universityName: parsed.data.universityName,
      contactEmail: parsed.data.contactEmail,
      timezone: parsed.data.timezone,
      studentIdLabel: parsed.data.studentIdLabel,
      authMode: parsed.data.authMode || 'CREDENTIALS',
    },
    create: { id: 'singleton' },
  });

  return { success: true };
}

/**
 * Guarda la configuración LDAP en InstitutionConfig.
 * Solo accesible por ADMIN.
 */
export async function saveLdapConfig(ldapConfig: Record<string, unknown>): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'No autenticado' };

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.MANAGE_SYSTEM_CONFIG);

  const ldapJson = JSON.stringify(ldapConfig);

  await prisma.institutionConfig.upsert({
    where: { id: 'singleton' },
    update: { ldapConfig: ldapJson },
    create: { id: 'singleton', ldapConfig: ldapJson },
  });

  await logAuditEvent({
    userId: session.user.id,
    action: 'UPDATE_LDAP_CONFIG',
    entityType: 'InstitutionConfig',
    entityId: 'singleton',
  });

  return { success: true };
}

/**
 * Prueba la conexión LDAP con la configuración proporcionada.
 */
export async function testLdapConnection(ldapConfig: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'No autenticado' };

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.MANAGE_SYSTEM_CONFIG);

  const { testLdapConnection: testLdap } = await import('@/lib/ldap');
  const { parseLdapConfig } = await import('@/lib/ldap');
  const config = parseLdapConfig(JSON.stringify(ldapConfig));
  if (!config) return { success: false, message: 'Configuración LDAP inválida' };

  return testLdap(config);
}

// ============================================================
// Auditoría
// ============================================================

/**
 * Obtiene los registros de auditoría con filtros y paginación.
 * Wrapper de getAuditLogs con verificación de permisos.
 */
export async function fetchAuditLogs(filters: {
  userId?: string;
  action?: string;
  entityType?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'No autenticado' };

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.VIEW_AUDIT_LOG);

  const result = await getAuditLogs({
    ...filters,
    fromDate: filters.fromDate ? new Date(filters.fromDate) : undefined,
    toDate: filters.toDate ? new Date(filters.toDate) : undefined,
  });

  return { success: true, data: result };
}

// ============================================================
// Exportación CSV
// ============================================================

/**
 * Genera CSV de participaciones (para reportes).
 * Solo ADMIN y PROFESOR pueden exportar.
 *
 * @param filters - Filtros opcionales
 * @returns Cadena CSV
 */
export async function exportParticipationsCSV(filters: {
  semesterId?: string;
  studyId?: string;
  courseId?: string;
}): Promise<ActionResult<string>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'No autenticado' };

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.EXPORT_REPORTS);

  const where: Record<string, unknown> = {};
  if (filters.studyId) where.studyId = filters.studyId;
  if (filters.semesterId) {
    where.study = { semesterId: filters.semesterId };
  }

  const participations = await prisma.participation.findMany({
    where,
    include: {
      student: { select: { name: true, email: true, studentId: true } },
      study: { select: { title: true, creditsWorth: true } },
      timeslot: { select: { startTime: true, location: true } },
      creditAssignments: {
        include: { course: { select: { code: true, name: true } } },
      },
    },
    orderBy: { signedUpAt: 'desc' },
  });

  // Cabeceras CSV
  const headers = [
    'Estudiante',
    'Correo',
    'Carné',
    'Estudio',
    'Fecha Timeslot',
    'Ubicación',
    'Estado',
    'Créditos Ganados',
    'Curso Asignado',
    'Créditos Asignados',
    'Fecha Inscripción',
  ];

  const rows = participations.map((p) => {
    const creditInfo = p.creditAssignments[0];
    return [
      escapeCsvField(p.student.name),
      escapeCsvField(p.student.email),
      escapeCsvField(p.student.studentId || ''),
      escapeCsvField(p.study.title),
      p.timeslot.startTime.toISOString(),
      escapeCsvField(p.timeslot.location || ''),
      p.status,
      p.creditsEarned?.toString() || '0',
      creditInfo ? escapeCsvField(creditInfo.course.code) : '',
      creditInfo ? creditInfo.credits.toString() : '',
      p.signedUpAt.toISOString(),
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');

  await logAuditEvent({
    userId: session.user.id,
    action: 'EXPORT_CSV',
    entityType: 'Report',
    entityId: 'participations',
    newState: { rows: participations.length, filters },
  });

  return { success: true, data: csv };
}

/**
 * Genera CSV de créditos por curso (para profesor/admin).
 *
 * @param courseId - ID del curso (opcional, filtra por profesor)
 * @returns Cadena CSV
 */
export async function exportCourseCreditsCSV(
  courseId?: string
): Promise<ActionResult<string>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'No autenticado' };

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.EXPORT_REPORTS);

  const where: Record<string, unknown> = {};
  if (courseId) where.courseId = courseId;
  if (role === 'PROFESOR') {
    where.course = { professorId: session.user.id };
  }

  const assignments = await prisma.creditAssignment.findMany({
    where,
    include: {
      student: { select: { name: true, email: true, studentId: true } },
      course: { select: { code: true, name: true } },
      participation: {
        select: { study: { select: { title: true } } },
      },
    },
    orderBy: { assignedAt: 'desc' },
  });

  const headers = [
    'Estudiante',
    'Correo',
    'Carné',
    'Curso',
    'Nombre Curso',
    'Estudio',
    'Créditos',
    'Fecha Asignación',
  ];

  const rows = assignments.map((a) => [
    escapeCsvField(a.student.name),
    escapeCsvField(a.student.email),
    escapeCsvField(a.student.studentId || ''),
    escapeCsvField(a.course.code),
    escapeCsvField(a.course.name),
    escapeCsvField(a.participation?.study.title || 'Asignación alternativa'),
    a.credits.toString(),
    a.assignedAt.toISOString(),
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\n');

  return { success: true, data: csv };
}

/**
 * Escapa un campo para CSV (maneja comas y comillas).
 */
function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
