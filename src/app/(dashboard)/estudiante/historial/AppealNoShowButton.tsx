'use client';

import { useState, useTransition } from 'react';
import { appealNoShow } from '@/app/actions/participation';

export default function AppealNoShowButton({ participationId }: { participationId: string }) {
  const [isPending, startTransition] = useTransition();
  const [appealed, setAppealed] = useState(false);

  function handleAppeal() {
    if (!confirm('¿Estás seguro de que deseas apelar este No-Show? Se enviará un correo automáticamente al investigador principal para que revise tu caso y rectifique tu estado si hubo un error.')) {
      return;
    }

    startTransition(async () => {
      const res = await appealNoShow(participationId);
      if (res.success) {
        setAppealed(true);
      } else {
        alert(res.error || 'Error al enviar apelación');
      }
    });
  }

  if (appealed) {
    return <span style={{ color: 'var(--color-primary)', fontSize: '0.8125rem' }}>✓ Apelación enviada</span>;
  }

  return (
    <button
      className="btn btn-ghost btn-sm"
      style={{ marginLeft: 8, fontSize: '0.8125rem', color: 'var(--color-error)' }}
      onClick={handleAppeal}
      disabled={isPending}
      title="Si crees que esto es un error, haz clic para enviar un correo de apelación al investigador."
    >
      {isPending ? '⏳ Envando...' : 'Apelar'}
    </button>
  );
}
