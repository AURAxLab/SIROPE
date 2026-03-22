/**
 * SIROPE — CancelButton
 * Botón de cancelación con confirmación.
 */

'use client';

import { useState, useTransition } from 'react';
import { cancelSignUp } from '@/app/actions/participation';

interface CancelButtonProps {
  participationId: string;
  canCancel: boolean;
  studyTitle: string;
}

export default function CancelButton({ participationId, canCancel, studyTitle }: CancelButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  function handleCancel() {
    startTransition(async () => {
      await cancelSignUp(participationId);
      window.location.reload();
    });
  }

  if (!canCancel) {
    return (
      <button className="btn btn-ghost btn-sm" disabled title="No se puede cancelar con menos de 24h de anticipación">
        🚫 No cancelable
      </button>
    );
  }

  if (showConfirm) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-warning)' }}>
          ¿Cancelar inscripción a &quot;{studyTitle}&quot;?
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowConfirm(false)}
            disabled={isPending}
          >
            No, mantener
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={handleCancel}
            disabled={isPending}
          >
            {isPending ? 'Cancelando...' : 'Sí, cancelar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      className="btn btn-secondary btn-sm"
      onClick={() => setShowConfirm(true)}
    >
      ✕ Cancelar
    </button>
  );
}
