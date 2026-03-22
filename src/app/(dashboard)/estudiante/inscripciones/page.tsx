/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Mis Inscripciones — Lista de participaciones activas con cancelación
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import type { Role } from '@/lib/validations';
import CancelButton from './CancelButton';

/**
 * Página de inscripciones activas del estudiante.
 */
export default async function MisInscripciones() {
  const session = await auth();
  if (!session?.user || (session.user.role as Role) !== 'ESTUDIANTE') {
    redirect('/login');
  }

  const participations = await prisma.participation.findMany({
    where: {
      studentId: session.user.id,
      status: { in: ['SIGNED_UP', 'REMINDED'] },
    },
    include: {
      study: { select: { title: true, creditsWorth: true } },
      timeslot: { select: { startTime: true, endTime: true, location: true } },
    },
    orderBy: { timeslot: { startTime: 'asc' } },
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Mis Inscripciones 📋</h1>
      </div>

      {participations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p className="empty-state-text">No tienes inscripciones activas.</p>
          <a href="/estudiante/estudios" className="btn btn-primary">
            Explorar Estudios
          </a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {participations.map((p) => {
            const start = p.timeslot.startTime;
            const hoursUntil = (start.getTime() - Date.now()) / (1000 * 60 * 60);
            const canCancel = hoursUntil > 24;

            return (
              <div key={p.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 250 }}>
                    <h3 style={{ marginBottom: 4 }}>{p.study.title}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 8 }}>
                      📅 {start.toLocaleDateString('es-CR', {
                        weekday: 'long', day: 'numeric', month: 'long',
                        hour: '2-digit', minute: '2-digit',
                      })}
                      {p.timeslot.location && <> · 📍 {p.timeslot.location}</>}
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span className="badge badge-primary">
                        {p.study.creditsWorth} crédito{p.study.creditsWorth !== 1 ? 's' : ''}
                      </span>
                      <span className={`badge ${p.status === 'REMINDED' ? 'badge-warning' : 'badge-success'}`}>
                        {p.status === 'REMINDED' ? '⏰ Recordado' : '✅ Inscrito'}
                      </span>
                      {!canCancel && (
                        <span className="badge badge-error">
                          &lt;24h · No cancelable
                        </span>
                      )}
                    </div>
                  </div>

                  <CancelButton
                    participationId={p.id}
                    canCancel={canCancel}
                    studyTitle={p.study.title}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
