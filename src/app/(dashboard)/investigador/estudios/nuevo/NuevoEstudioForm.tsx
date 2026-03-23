/**
 * SIROPE — NuevoEstudioForm
 * Formulario de creación de estudio para IP.
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createStudy } from '@/app/actions/studies';

interface Props {
  semesterId: string;
  semesterName: string;
  ethicsCommitteeName?: string;
}

export default function NuevoEstudioForm({ semesterId, semesterName, ethicsCommitteeName = 'Comité Ético Científico (CEC)' }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    creditsWorth: '1',
    estimatedDuration: '30',
    location: '',
    eligibilityCriteria: '',
    ethicsApproved: false,
    ethicsNote: '',
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.ethicsApproved && !form.ethicsNote.trim()) {
      setError(`Si el estudio no tiene aprobación del ${ethicsCommitteeName}, debe indicar la justificación.`);
      return;
    }

    startTransition(async () => {
      const result = await createStudy({
        title: form.title,
        description: form.description,
        semesterId,
        creditsWorth: parseFloat(form.creditsWorth),
        estimatedDuration: parseInt(form.estimatedDuration, 10),
        location: form.location,
        eligibilityCriteria: form.eligibilityCriteria,
        ethicsApproved: form.ethicsApproved,
        ethicsNote: form.ethicsNote,
      });

      if (result.success && result.data) {
        router.push(`/investigador/estudios/${(result.data as any).id}`);
      } else {
        setError(result.error || 'Error al crear estudio');
      }
    });
  }

  return (
    <div className="animate-fade-in">
      <nav style={{ marginBottom: 20 }}>
        <a href="/investigador/estudios" style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none' }}>
          ← Volver a mis estudios
        </a>
      </nav>

      <h1 className="page-title" style={{ marginBottom: 8 }}>Nuevo Estudio 🔬</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.875rem' }}>
        Semestre: <span className="badge badge-primary">{semesterName}</span>
      </p>

      <div className="card" style={{ maxWidth: 700 }}>
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Título del estudio *</label>
            <input className="form-input" name="title" value={form.title} onChange={handleChange}
              placeholder="Ej: Percepción visual en interfaces web" required minLength={3} maxLength={200} />
          </div>

          <div className="form-group">
            <label className="form-label">Descripción *</label>
            <textarea className="form-textarea" name="description" value={form.description} onChange={handleChange}
              placeholder="Objetivos, metodología, qué se espera del participante..." required rows={5} minLength={10} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Créditos que otorga *</label>
              <input className="form-input" name="creditsWorth" type="number" min="0.5" max="10" step="0.5"
                value={form.creditsWorth} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Duración estimada (min) *</label>
              <input className="form-input" name="estimatedDuration" type="number" min="5" max="480"
                value={form.estimatedDuration} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Ubicación</label>
            <input className="form-input" name="location" value={form.location} onChange={handleChange}
              placeholder="Ej: Laboratorio ECCI-204" />
          </div>

          <div className="form-group">
            <label className="form-label">Criterios de elegibilidad</label>
            <textarea className="form-textarea" name="eligibilityCriteria" value={form.eligibilityCriteria}
              onChange={handleChange} placeholder="Requisitos del participante (opcional)" rows={3} />
          </div>

          {/* Aprobación Comité Ético */}
          <div style={{
            padding: 16, borderRadius: 'var(--radius-md)',
            background: 'var(--surface-bg)', border: '1px solid var(--surface-border)',
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 12 }}>
              <input
                type="checkbox"
                checked={form.ethicsApproved}
                onChange={(e) => setForm((prev) => ({ ...prev, ethicsApproved: e.target.checked }))}
                style={{ accentColor: 'var(--accent-primary)' }}
              />
              <span style={{ fontWeight: 600 }}>
                🏛️ Este estudio cuenta con aprobación del {ethicsCommitteeName}
              </span>
            </label>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                {form.ethicsApproved
                  ? `Número de acta o resolución del ${ethicsCommitteeName}`
                  : `Justificación de por qué no requiere aprobación del ${ethicsCommitteeName} *`}
              </label>
              <input
                className="form-input"
                name="ethicsNote"
                value={form.ethicsNote}
                onChange={handleChange}
                placeholder={form.ethicsApproved
                  ? 'Ej: Acta CEC-2026-042'
                  : 'Ej: Estudio con datos públicos, no involucra datos personales sensibles'}
                required={!form.ethicsApproved}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <a href="/investigador/estudios" className="btn btn-secondary">Cancelar</a>
            <button type="submit" className="btn btn-primary" disabled={isPending}>
              {isPending ? 'Creando...' : '🔬 Crear Estudio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

