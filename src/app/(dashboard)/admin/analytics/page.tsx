/**
 * SIROPE — Analytics Dashboard (Admin)
 * Métricas detalladas del sistema: usuarios, estudios, participaciones, créditos.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import type { Role } from '@/lib/validations';
import prisma from '@/lib/prisma';

const STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  DRAFT: { label: 'Borrador', badge: 'badge-neutral' },
  PENDING_APPROVAL: { label: 'Pendiente', badge: 'badge-warning' },
  ACTIVE: { label: 'Activo', badge: 'badge-success' },
  CLOSED: { label: 'Cerrado', badge: 'badge-error' },
  REJECTED: { label: 'Rechazado', badge: 'badge-error' },
};

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user || (session.user.role as Role) !== 'ADMIN') redirect('/login');

  const activeSemester = await prisma.semester.findFirst({ where: { active: true } });

  if (!activeSemester) {
    return (
      <div className="animate-fade-in">
        <h1 className="page-title">Analytics 📊</h1>
        <div className="alert alert-warning">No hay semestre activo configurado.</div>
      </div>
    );
  }

  const [
    totalStudents,
    totalResearchers,
    totalProfessors,
    totalAdmins,
    activeStudies,
    totalParticipations,
    completedCount,
    noShowCount,
    cancelledCount,
    totalCreditsResult,
    studiesByStatus,
    topStudies,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'ESTUDIANTE', active: true } }),
    prisma.user.count({ where: { role: { in: ['INV_PRINCIPAL', 'INV_EJECUTOR'] }, active: true } }),
    prisma.user.count({ where: { role: 'PROFESOR', active: true } }),
    prisma.user.count({ where: { role: 'ADMIN', active: true } }),
    prisma.study.count({ where: { status: 'ACTIVE', semesterId: activeSemester.id } }),
    prisma.participation.count({ where: { study: { semesterId: activeSemester.id } } }),
    prisma.participation.count({ where: { status: 'COMPLETED', study: { semesterId: activeSemester.id } } }),
    prisma.participation.count({ where: { status: 'NO_SHOW', study: { semesterId: activeSemester.id } } }),
    prisma.participation.count({ where: { status: 'CANCELLED', study: { semesterId: activeSemester.id } } }),
    prisma.creditAssignment.aggregate({
      where: { course: { semesterId: activeSemester.id } },
      _sum: { credits: true },
    }),
    prisma.study.groupBy({
      by: ['status'],
      where: { semesterId: activeSemester.id },
      _count: true,
    }),
    prisma.study.findMany({
      where: { semesterId: activeSemester.id },
      select: {
        id: true, title: true, status: true,
        _count: { select: { participations: true, timeslots: true } },
      },
      orderBy: { participations: { _count: 'desc' } },
      take: 5,
    }),
  ]);

  const completionRate = totalParticipations > 0
    ? Math.round((completedCount / totalParticipations) * 100) : 0;
  const noShowRate = totalParticipations > 0
    ? Math.round((noShowCount / totalParticipations) * 100) : 0;
  const totalCredits = totalCreditsResult._sum.credits || 0;
  const pendingCount = totalParticipations - completedCount - noShowCount - cancelledCount;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Analytics 📊</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
          Semestre: {activeSemester.name} · {activeSemester.startDate.toLocaleDateString('es-CR', { month: 'short', year: 'numeric' })} – {activeSemester.endDate.toLocaleDateString('es-CR', { month: 'short', year: 'numeric' })}
        </p>
      </div>

      {/* Users breakdown */}
      <h2 style={{ marginBottom: 12, fontSize: '1.125rem' }}>👥 Usuarios</h2>
      <div className="stat-grid" style={{ marginBottom: 32 }}>
        <div className="stat-card">
          <div className="stat-value">{totalStudents}</div>
          <div className="stat-label">🎓 Estudiantes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalResearchers}</div>
          <div className="stat-label">🔬 Investigadores</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalProfessors}</div>
          <div className="stat-label">📚 Profesores</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalAdmins}</div>
          <div className="stat-label">🛡️ Admins</div>
        </div>
      </div>

      {/* Participation metrics */}
      <h2 style={{ marginBottom: 12, fontSize: '1.125rem' }}>📈 Participaciones (semestre actual)</h2>
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="card-gradient" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ color: 'white' }}>{totalParticipations}</div>
          <div className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Total inscripciones</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-success)' }}>{completedCount}</div>
          <div className="stat-label">✅ Completadas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{pendingCount > 0 ? pendingCount : 0}</div>
          <div className="stat-label">⏳ En progreso</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-error)' }}>{noShowCount}</div>
          <div className="stat-label">❌ No-shows</div>
        </div>
      </div>

      {/* Rates */}
      <div className="stat-grid" style={{ marginBottom: 32 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Tasa de completitud</span>
            <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>{completionRate}%</span>
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: `${completionRate}%` }}></div>
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Tasa de no-show</span>
            <span style={{ fontWeight: 700, color: noShowRate > 20 ? 'var(--color-error)' : 'var(--color-warning)' }}>{noShowRate}%</span>
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: `${noShowRate}%`, background: noShowRate > 20 ? 'var(--color-error)' : 'var(--color-warning)' }}></div>
          </div>
        </div>
        <div className="card" style={{ padding: 20, textAlign: 'center' }}>
          <div className="stat-value" style={{ color: 'var(--color-success)' }}>{totalCredits}</div>
          <div className="stat-label">Créditos asignados</div>
        </div>
      </div>

      {/* Studies by status */}
      <h2 style={{ marginBottom: 12, fontSize: '1.125rem' }}>🧪 Estudios por estado</h2>
      <div className="stat-grid" style={{ marginBottom: 32 }}>
        {studiesByStatus.map((s) => {
          const info = STATUS_LABELS[s.status] || { label: s.status, badge: 'badge-neutral' };
          return (
            <div className="stat-card" key={s.status}>
              <div className="stat-value">{s._count}</div>
              <div className="stat-label">
                <span className={`badge ${info.badge}`}>{info.label}</span>
              </div>
            </div>
          );
        })}
        <div className="stat-card">
          <div className="stat-value">{activeStudies}</div>
          <div className="stat-label">Estudios activos</div>
        </div>
      </div>

      {/* Top studies */}
      <h2 style={{ marginBottom: 12, fontSize: '1.125rem' }}>🏆 Top Estudios (por participaciones)</h2>
      <div className="card">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Estudio</th>
                <th>Estado</th>
                <th>Participaciones</th>
                <th>Timeslots</th>
              </tr>
            </thead>
            <tbody>
              {topStudies.map((s, i) => {
                const info = STATUS_LABELS[s.status] || { label: s.status, badge: 'badge-neutral' };
                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 700, color: i < 3 ? 'var(--primary)' : 'var(--text-muted)' }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{s.title}</td>
                    <td><span className={`badge ${info.badge}`}>{info.label}</span></td>
                    <td>{s._count.participations}</td>
                    <td>{s._count.timeslots}</td>
                  </tr>
                );
              })}
              {topStudies.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                    No hay estudios en este semestre
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
