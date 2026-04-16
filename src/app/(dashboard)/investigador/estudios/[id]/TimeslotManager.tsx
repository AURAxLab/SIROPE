/**
 * SIROPE — TimeslotManager
 * Gestión de timeslots: crear nuevo + lista existente.
 */

'use client';

import { useState, useTransition } from 'react';
import { createTimeslot } from '@/app/actions/timeslots';
import ExcelImportModal from './ExcelImportModal';

interface TimeslotData {
  id: string;
  startTime: string;
  endTime: string;
  location: string;
  maxParticipants: number;
  currentParticipants: number;
  status: string;
}

interface TimeslotManagerProps {
  studyId: string;
  studyStatus: string;
  timeslots: TimeslotData[];
}

const STATUS_BADGES: Record<string, string> = {
  AVAILABLE: 'badge-success',
  FULL: 'badge-warning',
  CANCELLED: 'badge-error',
};

export default function TimeslotManager({ studyId, studyStatus, timeslots }: TimeslotManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    date: '',
    startTime: '09:00',
    endTime: '10:00',
    maxParticipants: '5',
    location: '',
  });

  const canCreate = studyStatus === 'ACTIVE' || studyStatus === 'DRAFT';

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleCreateTimeslot(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const startDateTime = `${form.date}T${form.startTime}:00`;
    const endDateTime = `${form.date}T${form.endTime}:00`;

    startTransition(async () => {
      const result = await createTimeslot({
        studyId,
        startTime: startDateTime,
        endTime: endDateTime,
        maxParticipants: parseInt(form.maxParticipants, 10),
        location: form.location,
      });

      if (result.success) {
        setShowForm(false);
        setForm({ date: '', startTime: '09:00', endTime: '10:00', maxParticipants: '5', location: '' });
        window.location.reload();
      } else {
        setError(result.error || 'Error al crear horario');
      }
    });
  }

  return (
    <div>
      {/* Create form */}
      {canCreate && (
        <>
          {!showForm ? (
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
                + Nuevo Horario
              </button>
              <ExcelImportModal studyId={studyId} />
            </div>
          ) : (
            <div style={{
              padding: 16,
              background: 'var(--surface-bg)',
              border: '1px solid var(--surface-border)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 16,
            }}>
              {error && (
                <div style={{
                  padding: '8px 12px', background: 'rgba(239,68,68,0.12)',
                  borderRadius: 'var(--radius-md)', color: '#fca5a5',
                  fontSize: '0.8125rem', marginBottom: 12,
                }}>⚠️ {error}</div>
              )}
              <form onSubmit={handleCreateTimeslot} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: '1 1 140px' }}>
                  <label className="form-label">Fecha</label>
                  <input className="form-input" type="date" name="date" value={form.date} onChange={handleChange} required />
                </div>
                <div className="form-group" style={{ flex: '0 0 110px' }}>
                  <label className="form-label">Inicio</label>
                  <input className="form-input" type="time" name="startTime" value={form.startTime} onChange={handleChange} required />
                </div>
                <div className="form-group" style={{ flex: '0 0 110px' }}>
                  <label className="form-label">Fin</label>
                  <input className="form-input" type="time" name="endTime" value={form.endTime} onChange={handleChange} required />
                </div>
                <div className="form-group" style={{ flex: '0 0 80px' }}>
                  <label className="form-label">Máx.</label>
                  <input className="form-input" type="number" name="maxParticipants" min="1" max="500" value={form.maxParticipants} onChange={handleChange} required />
                </div>
                <div className="form-group" style={{ flex: '1 1 150px' }}>
                  <label className="form-label">Ubicación</label>
                  <input className="form-input" name="location" value={form.location} onChange={handleChange} placeholder="Opcional" />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>
                    {isPending ? 'Creando...' : 'Crear'}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {/* Horarios list */}
      {timeslots.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No hay horarios creados.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {timeslots.map((t) => {
            const start = new Date(t.startTime);
            const end = new Date(t.endTime);
            const spotsLeft = t.maxParticipants - t.currentParticipants;

            return (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 8, padding: 12,
                background: 'var(--surface-bg)', border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <span style={{ fontWeight: 600 }}>
                    📅 {start.toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', marginLeft: 8, fontSize: '0.875rem' }}>
                    {start.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                    {' — '}
                    {end.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {t.location && <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: '0.8125rem' }}>📍 {t.location}</span>}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className={`badge ${STATUS_BADGES[t.status] || 'badge-neutral'}`}>
                    {t.status === 'AVAILABLE' ? `${spotsLeft} libre${spotsLeft !== 1 ? 's' : ''}` : t.status === 'FULL' ? 'Lleno' : 'Cancelado'}
                  </span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {t.currentParticipants}/{t.maxParticipants}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
