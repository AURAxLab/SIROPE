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
  ethicsApproved?: boolean;
  ethicsNote?: string;
}

/**
 * Lista de timeslots con disclaimer de participación voluntaria
 * y botón de inscripción con capacidad en tiempo real.
 */
export default function TimeslotSignUp({ timeslots, studyId, ethicsApproved, ethicsNote }: TimeslotSignUpProps) {
  const [isPending, startTransition] = useTransition();
  const [signingUpId, setSigningUpId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [accepted, setAccepted] = useState(false);

  function handleSignUp(timeslotId: string) {
    if (!accepted) {
      setError('Debe confirmar que su participación es voluntaria antes de inscribirse.');
      return;
    }
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
      {/* Nota de ética del CEC */}
      {ethicsApproved === false && ethicsNote && (
        <div style={{
          padding: 12, marginBottom: 16, borderRadius: 'var(--radius-md)',
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
          fontSize: '0.8125rem', color: 'var(--text-secondary)',
        }}>
          ⚠️ <strong>Nota sobre aprobación ética:</strong> {ethicsNote}
        </div>
      )}

      {ethicsApproved && ethicsNote && (
        <div style={{
          padding: 12, marginBottom: 16, borderRadius: 'var(--radius-md)',
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
          fontSize: '0.8125rem', color: 'var(--text-secondary)',
        }}>
          ✅ <strong>Aprobado por Comité Ético:</strong> {ethicsNote}
        </div>
      )}

      {/* Disclaimer de participación voluntaria */}
      <div style={{
        padding: 14, marginBottom: 16, borderRadius: 'var(--radius-md)',
        background: 'var(--surface-bg)', border: '1px solid var(--surface-border)',
      }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: '0.875rem' }}>
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            style={{ marginTop: 3, accentColor: 'var(--accent-primary)' }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>
            Confirmo que mi participación en este estudio es <strong>completamente voluntaria</strong>.
            Entiendo que puedo retirarme en cualquier momento sin consecuencia alguna.
          </span>
        </label>
      </div>

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
                  className={`btn ${isFull || !accepted ? 'btn-ghost' : 'btn-primary'} btn-sm`}
                  disabled={isFull || !accepted || (isPending && signingUpId === t.id)}
                  onClick={() => handleSignUp(t.id)}
                  title={!accepted ? 'Debe confirmar participación voluntaria' : ''}
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

