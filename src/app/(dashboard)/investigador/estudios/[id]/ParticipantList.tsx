/**
 * SIROPE — ParticipantList
 * Lista de participantes por timeslot con marcado de asistencia.
 */

'use client';

import { useState, useTransition } from 'react';
import { markCompletion, bulkMarkCompletion } from '@/app/actions/participation';

interface Participant {
  participationId: string;
  name: string;
  email: string;
  studentId: string;
  status: string;
}

interface TimeslotWithParticipants {
  id: string;
  startTime: string;
  location: string;
  participants: Participant[];
}

interface ParticipantListProps {
  timeslots: TimeslotWithParticipants[];
}

const STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  SIGNED_UP: { label: 'Inscrito', badge: 'badge-info' },
  REMINDED: { label: 'Recordado', badge: 'badge-warning' },
  COMPLETED: { label: 'Completado', badge: 'badge-success' },
  NO_SHOW: { label: 'No se presentó', badge: 'badge-error' },
  CANCELLED: { label: 'Cancelado', badge: 'badge-neutral' },
};

export default function ParticipantList({ timeslots }: ParticipantListProps) {
  const [isPending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);

  function handleMark(participationId: string, status: 'COMPLETED' | 'NO_SHOW') {
    setActionId(participationId);
    startTransition(async () => {
      await markCompletion({ participationId, status });
      setActionId(null);
      window.location.reload();
    });
  }

  function handleBulkMark(participationIds: string[], status: 'COMPLETED' | 'NO_SHOW') {
    if (!confirm(`¿Marcar ${participationIds.length} participantes como ${status === 'COMPLETED' ? 'completados' : 'no-show'}?`)) return;
    startTransition(async () => {
      await bulkMarkCompletion({ participationIds, status });
      window.location.reload();
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {timeslots.map((t) => {
        const start = new Date(t.startTime);
        const isPast = start < new Date();
        const pendingIds = t.participants
          .filter((p) => p.status === 'SIGNED_UP' || p.status === 'REMINDED')
          .map((p) => p.participationId);

        return (
          <div key={t.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>
                📅 {start.toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                {t.location && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {t.location}</span>}
              </h3>
              {isPast && pendingIds.length > 0 && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleBulkMark(pendingIds, 'COMPLETED')}
                    disabled={isPending}
                  >
                    ✅ Todos completados ({pendingIds.length})
                  </button>
                </div>
              )}
            </div>

            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Carné</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {t.participants.map((p) => {
                    const statusInfo = STATUS_LABELS[p.status] || { label: p.status, badge: 'badge-neutral' };
                    const canMark = p.status === 'SIGNED_UP' || p.status === 'REMINDED';

                    return (
                      <tr key={p.participationId}>
                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                        <td style={{ fontSize: '0.875rem' }}>{p.email}</td>
                        <td>{p.studentId || '—'}</td>
                        <td><span className={`badge ${statusInfo.badge}`}>{statusInfo.label}</span></td>
                        <td>
                          {canMark && isPast ? (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleMark(p.participationId, 'COMPLETED')}
                                disabled={isPending && actionId === p.participationId}
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              >
                                ✅
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleMark(p.participationId, 'NO_SHOW')}
                                disabled={isPending && actionId === p.participationId}
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              >
                                ❌
                              </button>
                            </div>
                          ) : canMark ? (
                            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Aún no</span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
