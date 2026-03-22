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
  const [activeStudies, myParticipations, completedCount] = await Promise.all([
    prisma.study.count({
      where: { status: 'ACTIVE', semester: { active: true } },
    }),
    prisma.participation.findMany({
      where: {
        studentId: session.user.id,
        status: { in: ['SIGNED_UP', 'REMINDED'] },
      },
      include: {
        study: { select: { title: true } },
        timeslot: { select: { startTime: true, location: true } },
      },
      orderBy: { timeslot: { startTime: 'asc' } },
      take: 5,
    }),
    prisma.participation.count({
      where: { studentId: session.user.id, status: 'COMPLETED' },
    }),
  ]);

  // Créditos totales ganados
  const creditAssignments = await prisma.creditAssignment.findMany({
    where: { studentId: session.user.id },
  });
  const totalCredits = creditAssignments.reduce((sum, a) => sum + a.credits, 0);

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
