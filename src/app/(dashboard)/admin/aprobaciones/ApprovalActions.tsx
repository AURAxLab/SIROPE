/**
 * SIROPE — ApprovalActions
 * Aprobar o rechazar un estudio.
 */

'use client';

import { useState, useTransition } from 'react';
import { reviewStudy } from '@/app/actions/studies';

interface ApprovalActionsProps {
  studyId: string;
}

export default function ApprovalActions({ studyId }: ApprovalActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');

  function handleApprove() {
    startTransition(async () => {
      await reviewStudy({ studyId, decision: 'APPROVE' });
      window.location.reload();
    });
  }

  function handleReject() {
    startTransition(async () => {
      await reviewStudy({ studyId, decision: 'REJECT', rejectionReason: reason });
      window.location.reload();
    });
  }

  if (showReject) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <textarea
          className="form-textarea"
          placeholder="Razón del rechazo..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowReject(false)} disabled={isPending}>
            Cancelar
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleReject} disabled={isPending || !reason.trim()}>
            {isPending ? 'Rechazando...' : 'Confirmar Rechazo'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button className="btn btn-primary btn-sm" onClick={handleApprove} disabled={isPending}>
        {isPending ? 'Aprobando...' : '✅ Aprobar'}
      </button>
      <button className="btn btn-secondary btn-sm" onClick={() => setShowReject(true)} disabled={isPending}>
        ❌ Rechazar
      </button>
    </div>
  );
}
