/**
 * SIROPE — CollaboratorActions
 * Agregar y remover colaboradores de un estudio.
 */

'use client';

import { useTransition } from 'react';
import { addCollaborator, removeCollaborator } from '@/app/actions/collaborators';

interface CollaboratorActionsProps {
  studyId: string;
  collaborators: { id: string; userId: string; name: string; email: string }[];
  availableIEs: { id: string; name: string; email: string }[];
}

export default function CollaboratorActions({ studyId, collaborators, availableIEs }: CollaboratorActionsProps) {
  const [isPending, startTransition] = useTransition();

  function handleAdd(userId: string) {
    startTransition(async () => {
      await addCollaborator(studyId, userId);
      window.location.reload();
    });
  }

  function handleRemove(userId: string, name: string) {
    if (!confirm(`¿Remover a ${name} como colaborador?`)) return;
    startTransition(async () => {
      await removeCollaborator(studyId, userId);
      window.location.reload();
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Actuales */}
      <div className="card">
        <h2 style={{ marginBottom: 12 }}>👥 Colaboradores Actuales ({collaborators.length})</h2>
        {collaborators.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Sin colaboradores asignados.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {collaborators.map((c) => (
              <div key={c.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: 12, background: 'var(--surface-bg)', border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: '0.875rem' }}>{c.email}</span>
                </div>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleRemove(c.userId, c.name)}
                  disabled={isPending}
                >
                  ✕ Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disponibles */}
      {availableIEs.length > 0 && (
        <div className="card">
          <h2 style={{ marginBottom: 12 }}>➕ Agregar Colaborador</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {availableIEs.map((ie) => (
              <div key={ie.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: 12, background: 'var(--surface-bg)', border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{ie.name}</span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: '0.875rem' }}>{ie.email}</span>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleAdd(ie.id)}
                  disabled={isPending}
                >
                  + Agregar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
