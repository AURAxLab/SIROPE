/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Validaciones — Schemas Zod
 * Define los schemas de validación para todos los datos de entrada del sistema.
 * Se usan tanto en el cliente como en el servidor para garantizar integridad.
 */

import { z } from 'zod';

// ============================================================
// Enums del sistema
// ============================================================

/** Roles de usuario disponibles en el sistema. */
export const RoleEnum = z.enum([
  'ADMIN',
  'PROFESOR',
  'INV_PRINCIPAL',
  'INV_EJECUTOR',
  'ESTUDIANTE',
]);
export type Role = z.infer<typeof RoleEnum>;

/** Estados posibles de un estudio de investigación. */
export const StudyStatusEnum = z.enum([
  'DRAFT',
  'PENDING_APPROVAL',
  'ACTIVE',
  'CLOSED',
  'REJECTED',
]);
export type StudyStatus = z.infer<typeof StudyStatusEnum>;

/** Estados posibles de un timeslot. */
export const TimeslotStatusEnum = z.enum([
  'AVAILABLE',
  'FULL',
  'CANCELLED',
]);
export type TimeslotStatus = z.infer<typeof TimeslotStatusEnum>;

/** Estados posibles de una participación. */
export const ParticipationStatusEnum = z.enum([
  'SIGNED_UP',
  'REMINDED',
  'COMPLETED',
  'NO_SHOW',
  'CANCELLED',
]);
export type ParticipationStatus = z.infer<typeof ParticipationStatusEnum>;

/** Estados posibles de una entrada en lista de espera. */
export const WaitlistStatusEnum = z.enum([
  'WAITING',
  'NOTIFIED',
  'EXPIRED',
]);
export type WaitlistStatus = z.infer<typeof WaitlistStatusEnum>;

/** Modos de autenticación soportados. */
export const AuthModeEnum = z.enum([
  'CREDENTIALS',
  'LDAP',
]);
export type AuthMode = z.infer<typeof AuthModeEnum>;

// ============================================================
// Schemas de autenticación
// ============================================================

/** Schema para login con email y contraseña. */
export const loginSchema = z.object({
  email: z
    .string()
    .email('El correo electrónico no es válido')
    .max(255, 'El correo no puede exceder 255 caracteres'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña no puede exceder 128 caracteres'),
});

/** Schema para registro de nuevo usuario. */
export const registerSchema = z.object({
  email: z
    .string()
    .email('El correo electrónico no es válido')
    .max(255, 'El correo no puede exceder 255 caracteres'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña no puede exceder 128 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'La contraseña debe contener al menos una minúscula, una mayúscula y un número'
    ),
  confirmPassword: z.string(),
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  role: RoleEnum,
  studentId: z
    .string()
    .max(20, 'El carné no puede exceder 20 caracteres')
    .optional(),
}).refine(
  (data) => data.password === data.confirmPassword,
  { message: 'Las contraseñas no coinciden', path: ['confirmPassword'] }
);

/** Schema para solicitar recuperación de contraseña. */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email('El correo electrónico no es válido'),
});

/** Schema para restablecer contraseña con token. */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña no puede exceder 128 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'La contraseña debe contener al menos una minúscula, una mayúscula y un número'
    ),
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  { message: 'Las contraseñas no coinciden', path: ['confirmPassword'] }
);

// ============================================================
// Schemas de configuración institucional
// ============================================================

/** Schema para configurar la institución en el setup wizard. */
export const institutionConfigSchema = z.object({
  name: z.string().min(2, 'Nombre requerido').max(200),
  shortName: z.string().min(1, 'Siglas requeridas').max(20),
  universityName: z.string().min(2, 'Nombre de universidad requerido').max(200),
  logoUrl: z.string().url('URL inválida').or(z.literal('')).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color hexadecimal inválido'),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color hexadecimal inválido'),
  contactEmail: z.string().email('Correo inválido'),
  website: z.string().url('URL inválida').or(z.literal('')).optional(),
  timezone: z.string().min(1, 'Zona horaria requerida'),
  studentIdLabel: z.string().min(1, 'Etiqueta requerida').max(50),
  authMode: AuthModeEnum,
});

// ============================================================
// Schemas de gestión académica
// ============================================================

/** Schema para crear o editar un semestre. */
export const semesterSchema = z.object({
  name: z
    .string()
    .min(1, 'Nombre del semestre requerido')
    .max(20, 'Nombre muy largo')
    .regex(/^[IVX]+-\d{4}$/, 'Formato inválido. Use: I-2026, II-2026'),
  startDate: z.string().datetime({ message: 'Fecha de inicio inválida' }),
  endDate: z.string().datetime({ message: 'Fecha de fin inválida' }),
}).refine(
  (data) => new Date(data.endDate) > new Date(data.startDate),
  { message: 'La fecha de fin debe ser posterior a la de inicio', path: ['endDate'] }
);

/** Schema para crear o editar un curso. */
export const courseSchema = z.object({
  code: z
    .string()
    .min(2, 'Código de curso requerido')
    .max(20, 'Código muy largo'),
  name: z
    .string()
    .min(2, 'Nombre del curso requerido')
    .max(200, 'Nombre muy largo'),
  semesterId: z.string().min(1, 'Semestre requerido'),
  maxExtraCredits: z
    .number()
    .min(0, 'El máximo no puede ser negativo')
    .max(10, 'El máximo no puede exceder 10'),
  optedIn: z.boolean(),
});

// ============================================================
// Schemas de estudios
// ============================================================

/** Schema para crear o editar un estudio de investigación. */
export const studySchema = z.object({
  title: z
    .string()
    .min(5, 'El título debe tener al menos 5 caracteres')
    .max(200, 'El título no puede exceder 200 caracteres'),
  description: z
    .string()
    .min(20, 'La descripción debe tener al menos 20 caracteres')
    .max(5000, 'La descripción no puede exceder 5000 caracteres'),
  semesterId: z.string().min(1, 'Semestre requerido'),
  creditsWorth: z
    .number()
    .min(0.5, 'Los créditos deben ser al menos 0.5')
    .max(5, 'Los créditos no pueden exceder 5'),
  estimatedDuration: z
    .number()
    .int('La duración debe ser un número entero')
    .min(5, 'La duración mínima es 5 minutos')
    .max(480, 'La duración máxima es 480 minutos (8 horas)'),
  location: z.string().max(200, 'Ubicación muy larga').optional(),
  eligibilityCriteria: z.string().max(2000).optional(),
});

/** Schema para una pregunta de preselección. */
export const prescreenQuestionSchema = z.object({
  questionText: z
    .string()
    .min(5, 'La pregunta debe tener al menos 5 caracteres')
    .max(500, 'La pregunta no puede exceder 500 caracteres'),
  requiredAnswer: z.boolean(),
  orderIndex: z.number().int().min(0),
});

/** Schema para enviar respuestas de preselección. */
export const prescreenAnswerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.boolean(),
});

// ============================================================
// Schemas de timeslots
// ============================================================

/** Schema para crear o editar un timeslot. */
export const timeslotSchema = z.object({
  studyId: z.string().min(1, 'Estudio requerido'),
  startTime: z.string().datetime({ message: 'Fecha/hora de inicio inválida' }),
  endTime: z.string().datetime({ message: 'Fecha/hora de fin inválida' }),
  maxParticipants: z
    .number()
    .int('Debe ser un número entero')
    .min(1, 'Debe haber al menos 1 participante')
    .max(500, 'Máximo 500 participantes'),
  location: z.string().max(200).optional(),
}).refine(
  (data) => new Date(data.endTime) > new Date(data.startTime),
  { message: 'La hora de fin debe ser posterior a la de inicio', path: ['endTime'] }
);

/** Schema para importación masiva de timeslots vía Excel. */
export const timeslotImportRowSchema = z.object({
  fecha: z.string().min(1, 'Fecha requerida'),
  horaInicio: z.string().min(1, 'Hora de inicio requerida'),
  horaFin: z.string().min(1, 'Hora de fin requerida'),
  maxParticipantes: z.number().int().min(1).max(500),
  ubicacion: z.string().max(200).optional(),
});

// ============================================================
// Schemas de participación y créditos
// ============================================================

/** Schema para asignar créditos a un curso. */
export const creditAssignmentSchema = z.object({
  participationId: z.string().min(1, 'Participación requerida'),
  courseId: z.string().min(1, 'Curso requerido'),
  credits: z
    .number()
    .min(0.5, 'Mínimo 0.5 créditos')
    .max(5, 'Máximo 5 créditos'),
});

/** Schema para marcar completitud de un participante. */
export const markCompletionSchema = z.object({
  participationId: z.string().min(1),
  status: z.enum(['COMPLETED', 'NO_SHOW']),
});

/** Schema para marcar completitud masiva. */
export const bulkCompletionSchema = z.object({
  participationIds: z.array(z.string().min(1)).min(1, 'Seleccione al menos un participante'),
  status: z.enum(['COMPLETED', 'NO_SHOW']),
});

// ============================================================
// Schemas de aprobación
// ============================================================

/** Schema para aprobar o rechazar un estudio. */
export const studyApprovalSchema = z.object({
  studyId: z.string().min(1),
  decision: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().max(1000).optional(),
}).refine(
  (data) => {
    if (data.decision === 'REJECT' && !data.rejectionReason) {
      return false;
    }
    return true;
  },
  { message: 'Debe proporcionar una razón para el rechazo', path: ['rejectionReason'] }
);
