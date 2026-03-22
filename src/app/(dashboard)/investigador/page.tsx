/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Dashboard Investigador — Vista principal (IP e IE)
 * Muestra estudios del investigador, timeslots próximos,
 * y estadísticas de participación.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import type { Role } from '@/lib/validations';

/**
 * Dashboard del investigador con resumen de estudios y timeslots.
 */
export default async function InvestigadorDashboard() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const role = session.user.role as Role;
  if (role !== 'INV_PRINCIPAL' && role !== 'INV_EJECUTOR') {
    redirect('/login');
  }

  const isPI = role === 'INV_PRINCIPAL';

  // Estudios del investigador
  let studyWhere;
  if (isPI) {
    studyWhere = { principalInvestigatorId: session.user.id };
  } else {
    studyWhere = { collaborators: { some: { userId: session.user.id } } };
  }

  const [myStudies, totalParticipations, pendingCompletion] = await Promise.all([
    prisma.study.findMany({
      where: { ...studyWhere, semester: { active: true } },
      include: {
        _count: { select: { timeslots: true, participations: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.participation.count({
      where: {
        study: studyWhere,
        status: 'COMPLETED',
      },
    }),
    prisma.participation.count({
      where: {
        study: studyWhere,
        status: { in: ['SIGNED_UP', 'REMINDED'] },
        timeslot: { startTime: { lt: new Date() } },
      },
    }),
  ]);

  const statusLabels: Record<string, { label: string; badge: string }> = {
    DRAFT: { label: 'Borrador', badge: 'badge-neutral' },
    PENDING_APPROVAL: { label: 'Pendiente', badge: 'badge-warning' },
    ACTIVE: { label: 'Activo', badge: 'badge-success' },
    CLOSED: { label: 'Cerrado', badge: 'badge-neutral' },
    REJECTED: { label: 'Rechazado', badge: 'badge-error' },
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Panel de Investigador{isPI ? ' Principal' : ' Ejecutor'} 🔬
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
            {session.user.name}
          </p>
        </div>
        {isPI && (
          <a href="/investigador/estudios/nuevo" className="btn btn-primary">
            + Nuevo Estudio
          </a>
        )}
      </div>

      {/* Estadísticas */}
      <div className="stat-grid">
        <div className="card-gradient" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ color: 'white' }}>
            {myStudies.length}
          </div>
          <div className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Estudios Activos
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalParticipations}</div>
          <div className="stat-label">Participaciones Completadas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: pendingCompletion > 0 ? 'var(--color-warning)' : undefined }}>
            {pendingCompletion}
          </div>
          <div className="stat-label">Pendientes de Marcar</div>
        </div>
      </div>

      {/* Lista de estudios */}
      <div className="card">
        <h2 style={{ marginBottom: 16 }}>📋 Mis Estudios</h2>
        {myStudies.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <p className="empty-state-text">
              {isPI
                ? 'No tiene estudios registrados este semestre.'
                : 'No tiene estudios asignados este semestre.'}
            </p>
            {isPI && (
              <a href="/investigador/estudios/nuevo" className="btn btn-primary">
                Crear Estudio
              </a>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Estado</th>
                  <th>Timeslots</th>
                  <th>Participaciones</th>
                </tr>
              </thead>
              <tbody>
                {myStudies.map((study) => {
                  const statusInfo = statusLabels[study.status] || {
                    label: study.status,
                    badge: 'badge-neutral',
                  };
                  return (
                    <tr key={study.id}>
                      <td>
                        <a
                          href={`/investigador/estudios/${study.id}`}
                          style={{ fontWeight: 600, color: 'var(--color-primary-400)' }}
                        >
                          {study.title}
                        </a>
                      </td>
                      <td>
                        <span className={`badge ${statusInfo.badge}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td>{study._count.timeslots}</td>
                      <td>{study._count.participations}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
