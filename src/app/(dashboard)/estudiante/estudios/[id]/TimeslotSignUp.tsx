/**
 * SIROPE — TimeslotSignUp
 * Componente interactivo para inscripción en timeslots.
 */

'use client';

import { useState, useTransition } from 'react';
import { signUpForTimeslot } from '@/app/actions/participation';

interface TimeslotData {
  id: string;
  startTime: string;
  endTime: string;
  location: string;
  maxParticipants: number;
  currentParticipants: number;
}

interface TimeslotSignUpProps {
  timeslots: TimeslotData[];
  studyId: string;
}

/**
 * Lista de timeslots con botón de inscripción y capacidad en tiempo real.
 */
export default function TimeslotSignUp({ timeslots, studyId }: TimeslotSignUpProps) {
  const [isPending, startTransition] = useTransition();
  const [signingUpId, setSigningUpId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function handleSignUp(timeslotId: string) {
    setSigningUpId(timeslotId);
    setError('');
    setSuccess('');

    startTransition(async () => {
      const result = await signUpForTimeslot(timeslotId);

      if (result.success) {
        setSuccess('¡Te has inscrito exitosamente! Revisa tu correo para la confirmación.');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setError(result.error || 'Error al inscribirse');
      }

      setSigningUpId(null);
    });
  }

  return (
    <div>
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          ✅ {success}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {timeslots.map((t) => {
          const start = new Date(t.startTime);
          const end = new Date(t.endTime);
          const spotsLeft = t.maxParticipants - t.currentParticipants;
          const isFull = spotsLeft <= 0;

          return (
            <div
              key={t.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                padding: 16,
                background: 'var(--surface-bg)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
                transition: 'all 150ms',
              }}
            >
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  📅 {start.toLocaleDateString('es-CR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  🕐 {start.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                  {' — '}
                  {end.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                  {t.location && <> · 📍 {t.location}</>}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className={`badge ${isFull ? 'badge-error' : spotsLeft <= 2 ? 'badge-warning' : 'badge-success'}`}>
                  {isFull ? 'Lleno' : `${spotsLeft} espacio${spotsLeft !== 1 ? 's' : ''}`}
                </span>

                <button
                  className={`btn ${isFull ? 'btn-ghost' : 'btn-primary'} btn-sm`}
                  disabled={isFull || (isPending && signingUpId === t.id)}
                  onClick={() => handleSignUp(t.id)}
                >
                  {isPending && signingUpId === t.id
                    ? 'Inscribiendo...'
                    : isFull
                    ? 'Sin espacio'
                    : 'Inscribirse'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
