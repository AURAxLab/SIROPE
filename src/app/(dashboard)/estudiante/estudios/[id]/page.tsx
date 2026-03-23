/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Detalle de Estudio — Prescreen + Inscripción a Timeslot
 * El estudiante ve la información del estudio, responde el prescreen
 * si aplica, y se inscribe en un timeslot disponible.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import type { Role } from '@/lib/validations';
import TimeslotSignUp from './TimeslotSignUp';
import PrescreenForm from './PrescreenForm';
import styles from './detalle.module.css';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * Página de detalle con prescreen y timeslots.
 */
export default async function EstudioDetalle({ params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || (session.user.role as Role) !== 'ESTUDIANTE') {
    redirect('/login');
  }

  const [study, config] = await Promise.all([
    prisma.study.findUnique({
      where: { id, status: 'ACTIVE' },
      include: {
        principalInvestigator: { select: { name: true, email: true } },
        prescreenQuestions: { orderBy: { orderIndex: 'asc' } },
        timeslots: {
          where: { status: 'AVAILABLE', startTime: { gt: new Date() } },
          orderBy: { startTime: 'asc' },
          include: {
            _count: { select: { participations: { where: { status: { not: 'CANCELLED' } } } } },
          },
        },
      },
    }),
    prisma.institutionConfig.findFirst({
      select: { ethicsCommitteeName: true },
    }),
  ]);

  if (!study) {
    redirect('/estudiante/estudios');
  }

  // Verificar si el estudiante ya respondió el prescreen
  const existingAnswers = await prisma.prescreenAnswer.findMany({
    where: {
      studentId: session.user.id,
      questionId: { in: study.prescreenQuestions.map((q) => q.id) },
    },
  });
  const hasAnsweredPrescreen =
    study.prescreenQuestions.length === 0 ||
    existingAnswers.length === study.prescreenQuestions.length;

  // Verificar elegibilidad
  let isEligible = true;
  if (hasAnsweredPrescreen && study.prescreenQuestions.length > 0) {
    const answerMap = new Map(existingAnswers.map((a) => [a.questionId, a.answer]));
    isEligible = study.prescreenQuestions.every(
      (q) => answerMap.get(q.id) === q.requiredAnswer
    );
  }

  // Inscripciones actuales del estudiante en este estudio
  const existingParticipation = await prisma.participation.findFirst({
    where: {
      studentId: session.user.id,
      studyId: study.id,
      status: { in: ['SIGNED_UP', 'REMINDED'] },
    },
    include: { timeslot: true },
  });

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <a href="/estudiante/estudios">← Volver a estudios</a>
      </nav>

      {/* Header */}
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badges}>
            <span className="badge badge-primary">
              {study.creditsWorth} crédito{study.creditsWorth !== 1 ? 's' : ''}
            </span>
            <span className="badge badge-neutral">
              ⏱ {study.estimatedDuration} min
            </span>
          </div>
          <h1 className={styles.title}>{study.title}</h1>
          <p className={styles.description}>{study.description}</p>
          <div className={styles.meta}>
            <span>👤 {study.principalInvestigator.name}</span>
            {study.location && <span>📍 {study.location}</span>}
          </div>
        </div>
      </div>

      {/* Ya inscrito */}
      {existingParticipation && (
        <div className={`card ${styles.enrolledCard}`}>
          <h3>✅ Ya estás inscrito en este estudio</h3>
          <p>
            Tu timeslot: {existingParticipation.timeslot.startTime.toLocaleDateString('es-CR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            })}
            {existingParticipation.timeslot.location && (
              <> — {existingParticipation.timeslot.location}</>
            )}
          </p>
          <a href="/estudiante/inscripciones" className="btn btn-secondary">
            Ver mis inscripciones
          </a>
        </div>
      )}

      {/* Prescreen */}
      {!hasAnsweredPrescreen && study.prescreenQuestions.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 16 }}>📝 Cuestionario de Elegibilidad</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
            Responde las siguientes preguntas para verificar tu elegibilidad.
          </p>
          <PrescreenForm
            questions={study.prescreenQuestions}
            studentId={session.user.id}
            studyId={study.id}
          />
        </div>
      )}

      {/* No elegible */}
      {hasAnsweredPrescreen && !isEligible && (
        <div className={`card ${styles.ineligibleCard}`}>
          <h3>⚠️ No eres elegible para este estudio</h3>
          <p>Según tus respuestas al cuestionario, no cumples con los criterios de elegibilidad.</p>
        </div>
      )}

      {/* Timeslots */}
      {hasAnsweredPrescreen && isEligible && !existingParticipation && (
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>🕐 Horarios Disponibles</h2>
          {study.timeslots.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <p className="empty-state-text">
                No hay horarios disponibles en este momento.
              </p>
            </div>
          ) : (
            <TimeslotSignUp
              timeslots={study.timeslots.map((t) => ({
                id: t.id,
                startTime: t.startTime.toISOString(),
                endTime: t.endTime.toISOString(),
                location: t.location,
                maxParticipants: t.maxParticipants,
                currentParticipants: t._count.participations,
              }))}
              studyId={study.id}
              ethicsApproved={study.ethicsApproved}
              ethicsNote={study.ethicsNote || undefined}
              ethicsCommitteeName={config?.ethicsCommitteeName || 'Comité Ético'}
            />
          )}
        </div>
      )}

      {/* Criterios de elegibilidad */}
      {study.eligibilityCriteria && (
        <div className="card" style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 8 }}>📋 Criterios de Elegibilidad</h3>
          <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
            {study.eligibilityCriteria}
          </p>
        </div>
      )}
    </div>
  );
}
