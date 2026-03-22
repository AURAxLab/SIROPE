/**
 * SIROPE — SemesterActions
 * Activar/desactivar semestre.
 */

'use client';

import { useTransition } from 'react';
import { activateSemester } from '@/app/actions/admin';

interface SemesterActionsProps {
  semesterId: string;
  active: boolean;
}

export default function SemesterActions({ semesterId, active }: SemesterActionsProps) {
  const [isPending, startTransition] = useTransition();

  function handleActivate() {
    if (!confirm(active ? '¿Desactivar este semestre?' : '¿Activar este semestre? Se desactivará cualquier otro.')) return;
    startTransition(async () => {
      await activateSemester(semesterId);
      window.location.reload();
    });
  }

  return (
    <button
      className={`btn ${active ? 'btn-secondary' : 'btn-primary'} btn-sm`}
      onClick={handleActivate}
      disabled={isPending}
    >
      {isPending ? '...' : active ? '⏸ Desactivar' : '🟢 Activar'}
    </button>
  );
}
