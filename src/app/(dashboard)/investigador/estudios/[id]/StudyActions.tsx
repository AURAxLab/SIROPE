/**
 * SIROPE — StudyActions
 * Botones de acción para PI: enviar a aprobación, cerrar estudio.
 */

'use client';

import { useTransition } from 'react';
import { submitStudyForApproval, closeStudy } from '@/app/actions/studies';

interface StudyActionsProps {
  studyId: string;
  status: string;
}

export default function StudyActions({ studyId, status }: StudyActionsProps) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      await submitStudyForApproval(studyId);
      window.location.reload();
    });
  }

  function handleClose() {
    if (!confirm('¿Cerrar este estudio? No se podrán crear nuevas inscripciones.')) return;
    startTransition(async () => {
      await closeStudy(studyId);
      window.location.reload();
    });
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {(status === 'DRAFT' || status === 'REJECTED') && (
        <button
          className="btn btn-accent btn-sm"
          onClick={handleSubmit}
          disabled={isPending}
        >
          {isPending ? 'Enviando...' : '📤 Enviar a Aprobación'}
        </button>
      )}
      {status === 'ACTIVE' && (
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleClose}
          disabled={isPending}
        >
          {isPending ? 'Cerrando...' : '🔒 Cerrar Estudio'}
        </button>
      )}
      {(status === 'DRAFT' || status === 'REJECTED') && (
        <a href={`/investigador/estudios/${studyId}/editar`} className="btn btn-ghost btn-sm">
          ✏️ Editar
        </a>
      )}
    </div>
  );
}
