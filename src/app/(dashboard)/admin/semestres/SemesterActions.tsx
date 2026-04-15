/**
 * SIROPE — SemesterActions
 * Activar/desactivar semestre.
 */

'use client';

import { useTransition, useState } from 'react';
import { activateSemester, deactivateSemester } from '@/app/actions/admin';

interface SemesterActionsProps {
  semesterId: string;
  active: boolean;
}

export default function SemesterActions({ semesterId, active }: SemesterActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handleAction() {
    if (!confirming) {
      setConfirming(true);
      // Automatically close confirmation state after 4 seconds
      setTimeout(() => setConfirming(false), 4000);
      return;
    }

    startTransition(async () => {
      if (active) {
        await deactivateSemester(semesterId);
      } else {
        await activateSemester(semesterId);
      }
      setConfirming(false);
      window.location.reload();
    });
  }

  function getButtonLabel() {
    if (isPending) return '...';
    if (confirming) return active ? '⚠️ ¿Desactivar?' : '⚠️ ¿Activar?';
    return active ? '⏸ Desactivar' : '🟢 Activar';
  }

  return (
    <button
      className={`btn ${confirming ? 'btn-danger' : active ? 'btn-secondary' : 'btn-primary'} btn-sm`}
      onClick={handleAction}
      disabled={isPending}
      title={active ? 'Haga clic para desactivar' : 'Al activar, otros se desactivarán'}
    >
      {getButtonLabel()}
    </button>
  );
}
