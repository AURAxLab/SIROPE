/**
 * SIROPE — AssignCreditForm
 * Selector de curso + botón para asignar créditos.
 */

'use client';

import { useState, useTransition } from 'react';
import { assignCredits } from '@/app/actions/credits';

interface AssignCreditFormProps {
  participationId: string;
  credits: number;
  courses: { id: string; code: string; name: string }[];
}

export default function AssignCreditForm({ participationId, credits, courses }: AssignCreditFormProps) {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function handleAssign() {
    if (!selectedCourse) return;
    setError('');

    startTransition(async () => {
      const result = await assignCredits({
        participationId,
        courseId: selectedCourse,
        credits,
      });

      if (result.success) {
        window.location.reload();
      } else {
        setError(result.error || 'Error al asignar créditos');
      }
    });
  }

  if (courses.length === 0) {
    return (
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
        No tienes cursos con opt-in activo
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
      {error && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-error)' }}>{error}</p>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select
          className="form-select"
          style={{ width: 'auto', minWidth: 200 }}
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
        >
          <option value="">Seleccionar curso…</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>
        <button
          className="btn btn-primary btn-sm"
          disabled={!selectedCourse || isPending}
          onClick={handleAssign}
        >
          {isPending ? 'Asignando...' : `Asignar ${credits} cr.`}
        </button>
      </div>
    </div>
  );
}
