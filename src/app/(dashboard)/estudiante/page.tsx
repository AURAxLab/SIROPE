/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Dashboard Estudiante — Vista principal
 * Muestra resumen de estudios disponibles, inscripciones activas,
 * créditos acumulados, y accesos directos.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import type { Role } from '@/lib/validations';

/**
 * Página principal del estudiante con estadísticas y accesos rápidos.
 */
export default async function EstudianteDashboard() {
  const session = await auth();
  if (!session?.user || (session.user.role as Role) !== 'ESTUDIANTE') {
    redirect('/login');
  }

  // Obtener estadísticas del estudiante
  const [activeStudies, myParticipations, completedCount, maxCreditConfig] = await Promise.all([
    prisma.study.count({
      where: { status: 'ACTIVE', semester: { active: true } },
    }),
    prisma.participation.findMany({
      where: {
        studentId: session.user.id,
        status: { in: ['SIGNED_UP', 'REMINDED'] },
      },
      include: {
        study: { select: { title: true, creditsWorth: true } },
        timeslot: { select: { startTime: true, endTime: true, location: true } },
      },
      orderBy: { timeslot: { startTime: 'asc' } },
      take: 5,
    }),
    prisma.participation.count({
      where: { studentId: session.user.id, status: 'COMPLETED' },
    }),
    prisma.systemConfig.findUnique({
      where: { key: 'MAX_CREDITS_PER_SEMESTER' },
    }),
  ]);

  // Créditos totales ganados
  const creditAssignments = await prisma.creditAssignment.findMany({
    where: { studentId: session.user.id },
  });
  const totalCredits = creditAssignments.reduce((sum, a) => sum + a.credits, 0);
  const maxCredits = parseFloat(maxCreditConfig?.value || '4');
  const creditPercent = Math.min((totalCredits / maxCredits) * 100, 100);

  // Próximo timeslot
  const now = new Date();
  const nextParticipation = myParticipations.find((p) => p.timeslot.startTime > now);
  let countdownText = '';
  if (nextParticipation) {
    const diff = nextParticipation.timeslot.startTime.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) {
      countdownText = `en ${days}d ${hours}h`;
    } else if (hours > 0) {
      countdownText = `en ${hours}h`;
    } else {
      countdownText = '¡Hoy!';
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            ¡Hola, {session.user.name?.split(' ')[0]}! 👋
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
            Bienvenido a SIROPE. Aquí puedes explorar estudios y ganar créditos extra.
          </p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="stat-grid">
        <div className="card-gradient" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ color: 'white' }}>
            {totalCredits}
          </div>
          <div className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Créditos Ganados
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{myParticipations.length}</div>
          <div className="stat-label">Inscripciones Activas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{completedCount}</div>
          <div className="stat-label">Estudios Completados</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{activeStudies}</div>
          <div className="stat-label">Estudios Disponibles</div>
        </div>
      </div>

      {/* Progreso de créditos + Countdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Barra de progreso de créditos */}
        <div className="card">
          <h3 style={{ marginBottom: 8, fontSize: '0.9375rem' }}>📊 Progreso del Semestre</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{totalCredits}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>/ {maxCredits} créditos</span>
          </div>
          <div style={{
            width: '100%', height: 12, borderRadius: 6,
            background: 'var(--surface-bg)', overflow: 'hidden',
          }}>
            <div style={{
              width: `${creditPercent}%`, height: '100%', borderRadius: 6,
              background: creditPercent >= 100
                ? 'linear-gradient(90deg, #10B981, #059669)'
                : 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
              transition: 'width 0.6s ease',
            }} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 6 }}>
            {creditPercent >= 100
              ? '🎉 ¡Alcanzaste el máximo del semestre!'
              : `${(maxCredits - totalCredits).toFixed(1)} créditos restantes`}
          </p>
        </div>

        {/* Countdown */}
        <div className="card">
          <h3 style={{ marginBottom: 8, fontSize: '0.9375rem' }}>⏰ Próxima Participación</h3>
          {nextParticipation ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                <span style={{
                  fontSize: '1.25rem', fontWeight: 800,
                  color: countdownText === '¡Hoy!' ? 'var(--accent-secondary)' : 'var(--accent-primary)',
                }}>
                  {countdownText}
                </span>
              </div>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 2 }}>
                {nextParticipation.study.title}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                📍 {nextParticipation.timeslot.location || 'Sin ubicación'} · {' '}
                {nextParticipation.timeslot.startTime.toLocaleDateString('es-CR', {
                  weekday: 'short', day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 4 }}>
                🏆 {nextParticipation.study.creditsWorth} crédito{nextParticipation.study.creditsWorth !== 1 ? 's' : ''}
              </p>
            </div>
          ) : (
            <div>
              <p style={{ color: 'var(--text-muted)', marginBottom: 8, fontSize: '0.875rem' }}>
                No tienes participaciones próximas
              </p>
              <a href="/estudiante/estudios" className="btn btn-primary btn-sm">
                Explorar Estudios →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Próximas participaciones */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 16 }}>📋 Próximas Participaciones</h2>
        {myParticipations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔬</div>
            <p className="empty-state-text">
              No tienes inscripciones activas.
            </p>
            <a href="/estudiante/estudios" className="btn btn-primary">
              Explorar Estudios
            </a>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Estudio</th>
                  <th>Fecha</th>
                  <th>Ubicación</th>
                  <th>Créditos</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {myParticipations.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.study.title}</td>
                    <td>
                      {p.timeslot.startTime.toLocaleDateString('es-CR', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td>{p.timeslot.location || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{p.study.creditsWorth}</td>
                    <td>
                      <span className="badge badge-primary">
                        {p.status === 'REMINDED' ? 'Recordado' : 'Inscrito'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
