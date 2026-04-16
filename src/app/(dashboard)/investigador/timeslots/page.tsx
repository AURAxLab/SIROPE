/**
 * SIROPE — Horarios del Investigador
 * Vista global de todos los horarios de mis estudios.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import type { Role } from '@/lib/validations';

export default async function TimeslotsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const role = session.user.role as Role;
  if (role !== 'INV_PRINCIPAL' && role !== 'INV_EJECUTOR') redirect('/login');

  const isPI = role === 'INV_PRINCIPAL';

  // Timeslots de mis estudios
  const whereClause = isPI
    ? { study: { principalInvestigatorId: session.user.id } }
    : { study: { collaborators: { some: { userId: session.user.id } } } };

  const timeslots = await prisma.timeslot.findMany({
    where: whereClause,
    include: {
      study: { select: { title: true, id: true } },
      _count: {
        select: {
          participations: { where: { status: { not: 'CANCELLED' } } },
        },
      },
    },
    orderBy: { startTime: 'asc' },
  });

  const upcoming = timeslots.filter((t) => t.startTime > new Date() && t.status !== 'CANCELLED');
  const past = timeslots.filter((t) => t.startTime <= new Date() || t.status === 'CANCELLED');

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Horarios 🕐</h1>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-value">{timeslots.length}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-success)' }}>{upcoming.length}</div>
          <div className="stat-label">Próximos</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{past.length}</div>
          <div className="stat-label">Pasados</div>
        </div>
      </div>

      {/* Próximos */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 16 }}>📅 Próximos Horarios</h2>
        {upcoming.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No hay horarios programados.</p>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Estudio</th>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Ubicación</th>
                  <th>Inscritos</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.study.title}</td>
                    <td>{t.startTime.toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                    <td>
                      {t.startTime.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                      {' — '}
                      {t.endTime.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>{t.location || '—'}</td>
                    <td>{t._count.participations}/{t.maxParticipants}</td>
                    <td>
                      <span className={`badge ${t.status === 'AVAILABLE' ? 'badge-success' : 'badge-warning'}`}>
                        {t.status === 'AVAILABLE' ? 'Disponible' : 'Lleno'}
                      </span>
                    </td>
                    <td>
                      <Link href={`/investigador/estudios/${t.study.id}`} className="btn btn-ghost btn-sm">
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pasados */}
      {past.length > 0 && (
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>📜 Pasados / Cancelados</h2>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Estudio</th>
                  <th>Fecha</th>
                  <th>Inscritos</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {past.map((t) => (
                  <tr key={t.id}>
                    <td>{t.study.title}</td>
                    <td>{t.startTime.toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })}</td>
                    <td>{t._count.participations}/{t.maxParticipants}</td>
                    <td>
                      <span className={`badge ${t.status === 'CANCELLED' ? 'badge-error' : 'badge-neutral'}`}>
                        {t.status === 'CANCELLED' ? 'Cancelado' : 'Pasado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
