/**
 * SIROPE — NuevoSemestreForm
 * Formulario para crear un semestre con nombre (I-2026), fechas y opción de activar.
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createSemester } from '@/app/actions/admin';

export default function NuevoSemestreForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    active: false,
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    startTransition(async () => {
      const result = await createSemester({
        name: form.name,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        active: form.active,
      });

      if (result.success) {
        router.push('/admin/semestres');
      } else {
        setError(result.error || 'Error al crear semestre');
      }
    });
  }

  return (
    <div>
      <nav style={{ marginBottom: 20 }}>
        <a href="/admin/semestres" style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none' }}>
          ← Volver a semestres
        </a>
      </nav>

      <h1 className="page-title" style={{ marginBottom: 24 }}>Nuevo Semestre 📅</h1>

      <div className="card" style={{ maxWidth: 500 }}>
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Nombre del semestre *</label>
            <input className="form-input" name="name" value={form.name} onChange={handleChange}
              placeholder="Ej: I-2026, II-2026" required pattern="^[IVX]+-\d{4}$"
              title="Formato: I-2026, II-2026, III-2026" />
            <span className="form-hint">Formato: I-2026, II-2026</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Fecha de inicio *</label>
              <input className="form-input" name="startDate" type="date" value={form.startDate}
                onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha de fin *</label>
              <input className="form-input" name="endDate" type="date" value={form.endDate}
                onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" name="active" checked={form.active} onChange={handleChange}
              id="activeCheck" style={{ width: 18, height: 18, accentColor: 'var(--primary)' }} />
            <label htmlFor="activeCheck" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
              Activar este semestre (desactiva el anterior)
            </label>
          </div>

          {form.active && (
            <div className="alert alert-warning" style={{ marginBottom: 0 }}>
              ⚠️ Activar este semestre desactivará automáticamente el semestre activo actual.
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <a href="/admin/semestres" className="btn btn-secondary">Cancelar</a>
            <button type="submit" className="btn btn-primary" disabled={isPending}>
              {isPending ? 'Creando...' : '📅 Crear Semestre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
