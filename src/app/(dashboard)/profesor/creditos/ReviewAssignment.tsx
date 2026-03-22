/**
 * SIROPE — ReviewAssignment
 * Botones de aprobación/rechazo para asignaciones alternativas.
 */

'use client';

import { useState, useTransition } from 'react';
import { reviewAlternativeAssignment } from '@/app/actions/policies';

interface ReviewAssignmentProps {
  assignmentId: string;
}

export default function ReviewAssignment({ assignmentId }: ReviewAssignmentProps) {
  const [isPending, startTransition] = useTransition();
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [action, setAction] = useState<'APPROVE' | 'REJECT' | null>(null);

  function handleAction(decision: 'APPROVE' | 'REJECT') {
    setAction(decision);
    if (decision === 'REJECT') {
      setShowFeedback(true);
      return;
    }
    submit(decision, '');
  }

  function submit(decision: 'APPROVE' | 'REJECT', fb: string) {
    startTransition(async () => {
      await reviewAlternativeAssignment(assignmentId, decision, fb || undefined);
      window.location.reload();
    });
  }

  if (showFeedback) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 200 }}>
        <textarea
          className="form-textarea"
          placeholder="Razón del rechazo..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={2}
          style={{ fontSize: '0.8125rem' }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowFeedback(false)} disabled={isPending}>
            Cancelar
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => submit('REJECT', feedback)} disabled={isPending}>
            {isPending ? 'Rechazando...' : 'Rechazar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button className="btn btn-primary btn-sm" onClick={() => handleAction('APPROVE')} disabled={isPending}>
        {isPending && action === 'APPROVE' ? 'Aprobando...' : '✅ Aprobar'}
      </button>
      <button className="btn btn-secondary btn-sm" onClick={() => handleAction('REJECT')} disabled={isPending}>
        ❌ Rechazar
      </button>
    </div>
  );
}
