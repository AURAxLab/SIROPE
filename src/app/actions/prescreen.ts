/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Acciones de Servidor — Preselección (Prescreen)
 * Gestiona las preguntas SÍ/NO de elegibilidad para cada estudio.
 * Solo el IP puede configurar las preguntas.
 * Los estudiantes responden antes de inscribirse.
 */

'use server';

import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { requirePermission, ACTIONS } from '@/lib/permissions';
import { prescreenQuestionSchema, prescreenAnswerSchema } from '@/lib/validations';
import { logAuditEvent } from '@/lib/audit';
import type { Role } from '@/lib/validations';

// ============================================================
// Tipos
// ============================================================

/** Resultado estándar de una operación de servidor. */
interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================
// Lectura
// ============================================================

/**
 * Obtiene las preguntas de preselección de un estudio.
 *
 * @param studyId - ID del estudio
 * @returns Preguntas ordenadas por índice
 */
export async function getPrescreenQuestions(studyId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const questions = await prisma.prescreenQuestion.findMany({
    where: { studyId },
    orderBy: { orderIndex: 'asc' },
  });

  return { success: true, data: questions };
}

// ============================================================
// Gestión de preguntas (IP)
// ============================================================

/**
 * Agrega una pregunta de preselección a un estudio.
 * Solo el IP del estudio puede configurar las preguntas.
 *
 * @param studyId - ID del estudio
 * @param formData - Datos de la pregunta
 * @returns La pregunta creada
 */
export async function addPrescreenQuestion(
  studyId: string,
  formData: {
    questionText: string;
    requiredAnswer: boolean;
    orderIndex: number;
  }
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.CONFIGURE_PRESCREEN);

  // Verificar propiedad del estudio
  const study = await prisma.study.findUnique({
    where: { id: studyId },
  });

  if (!study) {
    return { success: false, error: 'Estudio no encontrado' };
  }

  if (study.principalInvestigatorId !== session.user.id) {
    return { success: false, error: 'Solo el IP puede configurar el prescreen' };
  }

  // Solo en DRAFT o REJECTED
  if (study.status !== 'DRAFT' && study.status !== 'REJECTED') {
    return { success: false, error: 'Solo se puede configurar el prescreen en estudios DRAFT o REJECTED' };
  }

  // Validar datos
  const parsed = prescreenQuestionSchema.safeParse(formData);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || 'Datos inválidos';
    return { success: false, error: firstError };
  }

  const question = await prisma.prescreenQuestion.create({
    data: {
      studyId,
      questionText: parsed.data.questionText,
      requiredAnswer: parsed.data.requiredAnswer,
      orderIndex: parsed.data.orderIndex,
    },
  });

  await logAuditEvent({
    userId: session.user.id,
    action: 'ADD_PRESCREEN_QUESTION',
    entityType: 'PrescreenQuestion',
    entityId: question.id,
    newState: {
      studyId,
      questionText: question.questionText,
      requiredAnswer: question.requiredAnswer,
    },
  });

  return { success: true, data: question };
}

/**
 * Elimina una pregunta de preselección.
 * Solo el IP del estudio puede eliminar preguntas.
 *
 * @param questionId - ID de la pregunta a eliminar
 */
export async function deletePrescreenQuestion(questionId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.CONFIGURE_PRESCREEN);

  const question = await prisma.prescreenQuestion.findUnique({
    where: { id: questionId },
    include: {
      study: { select: { principalInvestigatorId: true, status: true } },
    },
  });

  if (!question) {
    return { success: false, error: 'Pregunta no encontrada' };
  }

  if (question.study.principalInvestigatorId !== session.user.id) {
    return { success: false, error: 'Solo el IP puede eliminar preguntas de prescreen' };
  }

  if (question.study.status !== 'DRAFT' && question.study.status !== 'REJECTED') {
    return { success: false, error: 'Solo se puede modificar el prescreen en estudios DRAFT o REJECTED' };
  }

  // Eliminar respuestas asociadas primero
  await prisma.prescreenAnswer.deleteMany({
    where: { questionId },
  });
  await prisma.prescreenQuestion.delete({
    where: { id: questionId },
  });

  await logAuditEvent({
    userId: session.user.id,
    action: 'DELETE_PRESCREEN_QUESTION',
    entityType: 'PrescreenQuestion',
    entityId: questionId,
    previousState: { questionText: question.questionText },
  });

  return { success: true };
}

/**
 * Reordena las preguntas de preselección de un estudio.
 *
 * @param studyId - ID del estudio
 * @param questionOrder - Array de IDs en el nuevo orden
 */
export async function reorderPrescreenQuestions(
  studyId: string,
  questionOrder: string[]
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.CONFIGURE_PRESCREEN);

  const study = await prisma.study.findUnique({
    where: { id: studyId },
  });

  if (!study) {
    return { success: false, error: 'Estudio no encontrado' };
  }

  if (study.principalInvestigatorId !== session.user.id) {
    return { success: false, error: 'Solo el IP puede reordenar preguntas' };
  }

  // Actualizar el orderIndex de cada pregunta
  const updatePromises = questionOrder.map((questionId, index) =>
    prisma.prescreenQuestion.update({
      where: { id: questionId },
      data: { orderIndex: index },
    })
  );

  await Promise.all(updatePromises);

  return { success: true };
}

// ============================================================
// Respuestas de estudiantes
// ============================================================

/**
 * Registra las respuestas de prescreen de un estudiante para un estudio.
 * Valida que las respuestas cumplan con los requisitos de elegibilidad.
 *
 * @param studyId - ID del estudio
 * @param answers - Array de {questionId, answer}
 * @returns Si el estudiante es elegible
 */
export async function submitPrescreenAnswers(
  studyId: string,
  answers: { questionId: string; answer: boolean }[]
): Promise<ActionResult<{ eligible: boolean }>> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  const role = session.user.role as Role;
  requirePermission(role, ACTIONS.ANSWER_PRESCREEN);

  // Obtener las preguntas del estudio
  const questions = await prisma.prescreenQuestion.findMany({
    where: { studyId },
    orderBy: { orderIndex: 'asc' },
  });

  if (questions.length === 0) {
    // Sin prescreen — siempre elegible
    return { success: true, data: { eligible: true } };
  }

  // Verificar que se respondieron todas las preguntas
  const questionIds = new Set(questions.map((q) => q.id));
  const answeredIds = new Set(answers.map((a) => a.questionId));

  for (const qId of questionIds) {
    if (!answeredIds.has(qId)) {
      return { success: false, error: 'Debe responder todas las preguntas de preselección' };
    }
  }

  // Validar cada respuesta
  for (const answer of answers) {
    const parsed = prescreenAnswerSchema.safeParse(answer);
    if (!parsed.success) {
      return { success: false, error: 'Datos de respuesta inválidos' };
    }
  }

  // Guardar respuestas (eliminar anteriores si las hay)
  await prisma.prescreenAnswer.deleteMany({
    where: {
      studentId: session.user.id,
      question: { studyId },
    },
  });

  await prisma.prescreenAnswer.createMany({
    data: answers.map((a) => ({
      questionId: a.questionId,
      studentId: session.user.id,
      answer: a.answer,
    })),
  });

  // Verificar elegibilidad: la respuesta del estudiante debe coincidir con requiredAnswer
  let eligible = true;
  for (const question of questions) {
    const studentAnswer = answers.find((a) => a.questionId === question.id);
    if (studentAnswer && studentAnswer.answer !== question.requiredAnswer) {
      eligible = false;
      break;
    }
  }

  return { success: true, data: { eligible } };
}

/**
 * Verifica si un estudiante ya respondió el prescreen
 * y si es elegible para participar.
 *
 * @param studyId - ID del estudio
 * @returns Resultado con elegibilidad
 */
export async function checkPrescreenEligibility(
  studyId: string
): Promise<ActionResult<{ answered: boolean; eligible: boolean }>> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }

  // Verificar preguntas
  const questions = await prisma.prescreenQuestion.findMany({
    where: { studyId },
  });

  if (questions.length === 0) {
    return { success: true, data: { answered: true, eligible: true } };
  }

  // Verificar respuestas del estudiante
  const answers = await prisma.prescreenAnswer.findMany({
    where: {
      studentId: session.user.id,
      question: { studyId },
    },
    include: { question: true },
  });

  if (answers.length === 0) {
    return { success: true, data: { answered: false, eligible: false } };
  }

  // Verificar elegibilidad
  let eligible = true;
  for (const answer of answers) {
    if (answer.answer !== answer.question.requiredAnswer) {
      eligible = false;
      break;
    }
  }

  return { success: true, data: { answered: true, eligible } };
}
