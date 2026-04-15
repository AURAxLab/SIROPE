/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Historial — Todas las participaciones del estudiante (pasadas y actuales)
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import type { Role } from '@/lib/validations';
import Link from 'next/link';
import AppealNoShowButton from './AppealNoShowButton';
import AlternativeAssignmentModal from './AlternativeAssignmentModal';

const STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  SIGNED_UP: { label: 'Inscrito', badge: 'badge-info' },
  REMINDED: { label: 'Recordado', badge: 'badge-warning' },
  COMPLETED: { label: 'Completado', badge: 'badge-success' },
  NO_SHOW: { label: 'No se presentó', badge: 'badge-error' },
  CANCELLED: { label: 'Cancelado', badge: 'badge-neutral' },
};

/**
 * Página de historial completo de participaciones.
 */
export default async function Historial() {
  const session = await auth();
  if (!session?.user || (session.user.role as Role) !== 'ESTUDIANTE') {
    redirect('/login');
  }

  const participations = await prisma.participation.findMany({
    where: { studentId: session.user.id },
    include: {
      study: { select: { title: true, creditsWorth: true } },
      timeslot: { select: { startTime: true, location: true } },
      creditAssignments: {
        include: { course: { select: { code: true } } },
      },
    },
    orderBy: { signedUpAt: 'desc' },
  });

  const completed = participations.filter((p) => p.status === 'COMPLETED').length;
  const noShows = participations.filter((p) => p.status === 'NO_SHOW').length;

  const enrollments = await prisma.enrollment.findMany({
    where: {
      studentId: session.user.id,
      course: { optedIn: true, semester: { active: true } },
    },
    include: { course: true },
  });

  const altAssignments = await prisma.alternativeAssignment.findMany({
    where: { studentId: session.user.id },
    include: { course: { select: { code: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Historial 📜</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <AlternativeAssignmentModal courses={enrollments.map(e => e.course)} />
        </div>
      </div>

      {/* Resumen */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-value">{participations.length}</div>
          <div className="stat-label">Total Participaciones</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-success)' }}>{completed}</div>
          <div className="stat-label">Completadas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: noShows > 0 ? 'var(--color-error)' : undefined }}>{noShows}</div>
          <div className="stat-label">No-shows</div>
        </div>
      </div>

      {participations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📜</div>
          <p className="empty-state-text">No tienes participaciones registradas.</p>
          <Link href="/estudiante/estudios" className="btn btn-primary">
            Explorar Estudios
          </Link>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Estudio</th>
                  <th>Fecha</th>
                  <th>Ubicación</th>
                  <th>Estado</th>
                  <th>Créditos</th>
                  <th>Asignado a</th>
                </tr>
              </thead>
              <tbody>
                {participations.map((p) => {
                  const statusInfo = STATUS_LABELS[p.status] || { label: p.status, badge: 'badge-neutral' };
                  const creditAssignment = p.creditAssignments[0];

                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.study.title}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {p.timeslot.startTime.toLocaleDateString('es-CR', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td>{p.timeslot.location || '—'}</td>
                      <td>
                        <span className={`badge ${statusInfo.badge}`}>
                          {statusInfo.label}
                        </span>
                        {p.status === 'NO_SHOW' && (
                          <AppealNoShowButton participationId={p.id} />
                        )}
                      </td>
                      <td>{p.creditsEarned || '—'}</td>
                      <td>
                        {creditAssignment
                          ? <span className="badge badge-primary">{creditAssignment.course.code}</span>
                          : p.status === 'COMPLETED'
                          ? <span style={{ color: 'var(--color-warning)', fontSize: '0.8125rem' }}>Sin asignar</span>
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tareas alternativas enviadas */}
      {altAssignments.length > 0 && (
        <div className="card" style={{ marginTop: 32 }}>
          <h2 style={{ marginBottom: 16, fontSize: '1.25rem' }}>📝 Asignaciones Alternativas</h2>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Curso</th>
                  <th>Créditos Solicitados</th>
                  <th>Estado</th>
                  <th>Feedback del Profesor</th>
                </tr>
              </thead>
              <tbody>
                {altAssignments.map((alt) => {
                  let badge = 'badge-neutral';
                  if (alt.status === 'APPROVED') badge = 'badge-success';
                  if (alt.status === 'REJECTED') badge = 'badge-error';
                  if (alt.status === 'PENDING') badge = 'badge-warning';

                  return (
                    <tr key={alt.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {alt.createdAt.toLocaleDateString('es-CR', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td><span className="badge badge-primary">{alt.course.code}</span></td>
                      <td>{alt.creditsRequested}</td>
                      <td>
                        <span className={`badge ${badge}`}>{alt.status}</span>
                      </td>
                      <td>{alt.feedback || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
