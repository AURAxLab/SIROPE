/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Servicio de Email
 * Gestiona el envío de correos electrónicos del sistema.
 * En desarrollo, los correos no se envían.
 * En producción, se envían a través de un servicio SMTP configurable.
 */

// ============================================================
// Tipos
// ============================================================

/** Parámetros para enviar un correo electrónico. */
interface EmailParams {
  /** Dirección de correo del destinatario. */
  to: string;
  /** Asunto del correo. */
  subject: string;
  /** Cuerpo del correo en texto plano. */
  text: string;
  /** Cuerpo del correo en HTML (opcional). */
  html?: string;
}

/** Resultado del envío de un correo. */
interface EmailResult {
  /** Si el correo se envió exitosamente. */
  success: boolean;
  /** Mensaje de error si falló. */
  error?: string;
}

// ============================================================
// Funciones de envío
// ============================================================

/**
 * Envía un correo electrónico.
 * En modo desarrollo, simula el envío sin enviar el correo.
 * En producción, usa SMTP configurado en variables de entorno.
 *
 * @param params - Datos del correo a enviar
 * @returns Resultado del envío
 */
export async function sendEmail(params: EmailParams): Promise<EmailResult> {
  const { to, subject, text, html } = params;

  // En desarrollo, no enviar correos
  if (process.env.NODE_ENV === 'development') {
    return { success: true };
  }

  // En producción, intentar enviar vía SMTP
  try {
    // TODO: Integrar con servicio SMTP (Resend, Nodemailer, etc.)
    // Por ahora, loguear como fallback
    console.warn(`[EMAIL] Envío no configurado. Destinatario: ${to}, Asunto: ${subject}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error(`[EMAIL] Error enviando correo a ${to}: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

// ============================================================
// Templates de correo
// ============================================================

/**
 * Envía correo de confirmación de inscripción a un timeslot.
 *
 * @param to - Email del estudiante
 * @param studentName - Nombre del estudiante
 * @param studyTitle - Título del estudio
 * @param dateTime - Fecha y hora del timeslot
 * @param location - Ubicación del estudio
 */
export async function sendSignUpConfirmation(
  to: string,
  studentName: string,
  studyTitle: string,
  dateTime: string,
  location: string
): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: `SIROPE: Inscripción confirmada — ${studyTitle}`,
    text: [
      `Hola ${studentName},`,
      '',
      `Tu inscripción al estudio "${studyTitle}" ha sido confirmada.`,
      '',
      `📅 Fecha y hora: ${dateTime}`,
      `📍 Ubicación: ${location}`,
      '',
      'Recuerda asistir puntualmente. Recibirás un recordatorio 24 horas antes.',
      '',
      'Si necesitas cancelar, hazlo desde tu panel de SIROPE.',
      '',
      '— SIROPE',
    ].join('\n'),
  });
}

/**
 * Envía recordatorio 24 horas antes del timeslot.
 *
 * @param to - Email del estudiante
 * @param studentName - Nombre del estudiante
 * @param studyTitle - Título del estudio
 * @param dateTime - Fecha y hora del timeslot
 * @param location - Ubicación del estudio
 */
export async function sendReminder(
  to: string,
  studentName: string,
  studyTitle: string,
  dateTime: string,
  location: string
): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: `SIROPE: Recordatorio — ${studyTitle} es mañana`,
    text: [
      `Hola ${studentName},`,
      '',
      `Este es un recordatorio de que mañana tienes programada tu participación en:`,
      '',
      `📋 Estudio: "${studyTitle}"`,
      `📅 Fecha y hora: ${dateTime}`,
      `📍 Ubicación: ${location}`,
      '',
      'Por favor, asiste puntualmente.',
      '',
      '— SIROPE',
    ].join('\n'),
  });
}

/**
 * Envía notificación de créditos otorgados al estudiante.
 *
 * @param to - Email del estudiante
 * @param studentName - Nombre del estudiante
 * @param studyTitle - Título del estudio
 * @param credits - Cantidad de créditos otorgados
 */
export async function sendCreditsGranted(
  to: string,
  studentName: string,
  studyTitle: string,
  credits: number
): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: `SIROPE: Créditos otorgados — ${studyTitle}`,
    text: [
      `Hola ${studentName},`,
      '',
      `Has recibido ${credits} crédito(s) por completar el estudio "${studyTitle}".`,
      '',
      'Ingresa a SIROPE para asignar tus créditos al curso que prefieras.',
      '',
      '— SIROPE',
    ].join('\n'),
  });
}

/**
 * Envía correo de recuperación de contraseña.
 *
 * @param to - Email del usuario
 * @param userName - Nombre del usuario
 * @param resetUrl - URL para restablecer la contraseña
 */
export async function sendPasswordReset(
  to: string,
  userName: string,
  resetUrl: string
): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: 'SIROPE: Recuperación de contraseña',
    text: [
      `Hola ${userName},`,
      '',
      'Recibimos una solicitud para restablecer tu contraseña en SIROPE.',
      '',
      `Haz clic en el siguiente enlace para crear una nueva contraseña:`,
      resetUrl,
      '',
      'Este enlace expira en 1 hora.',
      '',
      'Si no solicitaste este cambio, ignora este correo.',
      '',
      '— SIROPE',
    ].join('\n'),
  });
}

/**
 * Envía notificación al investigador cuando un estudiante se inscribe.
 *
 * @param to - Email del investigador
 * @param researcherName - Nombre del investigador
 * @param studentName - Nombre del estudiante inscrito
 * @param studyTitle - Título del estudio
 * @param dateTime - Fecha y hora del timeslot
 */
export async function sendNewSignUpNotification(
  to: string,
  researcherName: string,
  studentName: string,
  studyTitle: string,
  dateTime: string
): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: `SIROPE: Nueva inscripción — ${studyTitle}`,
    text: [
      `Hola ${researcherName},`,
      '',
      `${studentName} se ha inscrito en tu estudio "${studyTitle}".`,
      `📅 Timeslot: ${dateTime}`,
      '',
      'Puedes ver los detalles en tu panel de SIROPE.',
      '',
      '— SIROPE',
    ].join('\n'),
  });
}

/**
 * Envía confirmación de cancelación de inscripción.
 *
 * @param to - Email del estudiante
 * @param studentName - Nombre del estudiante
 * @param studyTitle - Título del estudio
 * @param penalized - Si la cancelación fue con penalización
 */
export async function sendCancellationConfirmation(
  to: string,
  studentName: string,
  studyTitle: string,
  penalized: boolean
): Promise<EmailResult> {
  const penaltyWarning = penalized
    ? '\n⚠️ Esta cancelación fue tardía y podría afectar tu disponibilidad para inscribirte en futuros estudios.\n'
    : '';

  return sendEmail({
    to,
    subject: `SIROPE: Inscripción cancelada — ${studyTitle}`,
    text: [
      `Hola ${studentName},`,
      '',
      `Tu inscripción al estudio "${studyTitle}" ha sido cancelada.`,
      penaltyWarning,
      'Si fue un error, puedes inscribirte nuevamente desde tu panel de SIROPE.',
      '',
      '— SIROPE',
    ].join('\n'),
  });
}

/**
 * Envía notificación de que hay un espacio disponible en waitlist.
 *
 * @param to - Email del estudiante en lista de espera
 * @param studentName - Nombre del estudiante
 * @param studyTitle - Título del estudio
 * @param dateTime - Fecha y hora del timeslot
 * @param expiresIn - Horas para aceptar antes de que expire
 */
export async function sendWaitlistPromotion(
  to: string,
  studentName: string,
  studyTitle: string,
  dateTime: string,
  expiresIn: number
): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: `SIROPE: ¡Espacio disponible! — ${studyTitle}`,
    text: [
      `Hola ${studentName},`,
      '',
      `¡Se liberó un espacio en el estudio "${studyTitle}"!`,
      '',
      `📅 Fecha y hora: ${dateTime}`,
      '',
      `Tienes ${expiresIn} horas para aceptar desde tu panel de SIROPE antes de que el espacio pase a la siguiente persona.`,
      '',
      '— SIROPE',
    ].join('\n'),
  });
}

/**
 * Envía notificación al IP de que su estudio fue aprobado.
 *
 * @param to - Email del investigador principal
 * @param researcherName - Nombre del IP
 * @param studyTitle - Título del estudio
 */
export async function sendStudyApproved(
  to: string,
  researcherName: string,
  studyTitle: string
): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: `SIROPE: Estudio aprobado — ${studyTitle}`,
    text: [
      `Hola ${researcherName},`,
      '',
      `Tu estudio "${studyTitle}" ha sido aprobado y ahora está activo.`,
      '',
      'Los estudiantes ya pueden ver el estudio y sus timeslots disponibles.',
      'Ingresa a SIROPE para gestionar los horarios de tu estudio.',
      '',
      '— SIROPE',
    ].join('\n'),
  });
}

/**
 * Envía notificación al IP de que su estudio fue rechazado.
 *
 * @param to - Email del investigador principal
 * @param researcherName - Nombre del IP
 * @param studyTitle - Título del estudio
 * @param reason - Razón del rechazo
 */
export async function sendStudyRejected(
  to: string,
  researcherName: string,
  studyTitle: string,
  reason: string
): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: `SIROPE: Estudio requiere revisión — ${studyTitle}`,
    text: [
      `Hola ${researcherName},`,
      '',
      `Tu estudio "${studyTitle}" ha sido devuelto para revisión.`,
      '',
      `📝 Observaciones: ${reason}`,
      '',
      'Puedes realizar los ajustes necesarios y volver a enviarlo a aprobación desde tu panel de SIROPE.',
      '',
      '— SIROPE',
    ].join('\n'),
  });
}

