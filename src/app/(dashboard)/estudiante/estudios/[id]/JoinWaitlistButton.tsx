'use client';

import { useState, useTransition } from 'react';
import { joinWaitlist } from '@/app/actions/participation';
import { useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';

interface Props {
  timeslotId: string;
}

export default function JoinWaitlistButton({ timeslotId }: Props) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  function handleJoin() {
    startTransition(async () => {
      const res = await joinWaitlist(timeslotId);
      if (res.success) {
        toast('Has sido añadido a la lista de espera.', 'success');
        router.refresh();
      } else {
        toast(res.error || 'Error al unirse a la lista de espera', 'error');
      }
    });
  }

  return (
    <button 
      className="btn btn-secondary btn-sm" 
      onClick={handleJoin} 
      disabled={isPending}
      title="El cupo está lleno. Haz click para entrar a la lista de espera y te avisaremos si alguien cancela."
    >
      {isPending ? '⏳ Uniendo...' : '🕒 Lista de Espera'}
    </button>
  );
}
