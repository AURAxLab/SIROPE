/**
 * SIROPE — UserActions
 * Acciones inline por usuario: editar datos, cambiar rol, resetear contraseña, activar/desactivar.
 */

'use client';

import { useState, useTransition } from 'react';
import { updateUser, resetUserPassword } from '@/app/actions/admin';

interface UserActionsProps {
  userId: string;
  active: boolean;
  currentUserId: string;
  currentRole: string;
  currentName: string;
  currentEmail: string;
}

const ROLES = [
  { value: 'ESTUDIANTE', label: '🎓 Estudiante' },
  { value: 'PROFESOR', label: '📚 Profesor' },
  { value: 'INV_PRINCIPAL', label: '🔬 Inv. Principal' },
  { value: 'INV_EJECUTOR', label: '🧪 Inv. Ejecutor' },
  { value: 'ADMIN', label: '🛡️ Admin' },
];

export default function UserActions({ userId, active, currentUserId, currentRole, currentName, currentEmail }: UserActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<'idle' | 'role' | 'edit'>('idle');
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [editName, setEditName] = useState(currentName);
  const [editEmail] = useState(currentEmail);
  const [tempPassword, setTempPassword] = useState('');
  const isSelf = userId === currentUserId;

  function handleToggle() {
    if (isSelf) return;
    startTransition(async () => {
      await updateUser(userId, { active: !active });
      window.location.reload();
    });
  }

  function handleRoleSave() {
    if (selectedRole === currentRole) { setMode('idle'); return; }
    startTransition(async () => {
      await updateUser(userId, { role: selectedRole });
      window.location.reload();
    });
  }

  function handleEditSave() {
    if (editName === currentName) { setMode('idle'); return; }
    startTransition(async () => {
      await updateUser(userId, { name: editName });
      window.location.reload();
    });
  }

  function handleResetPassword() {
    if (!confirm('¿Resetear la contraseña de este usuario?')) return;
    startTransition(async () => {
      const result = await resetUserPassword(userId);
      if (result.success && result.data) {
        setTempPassword(result.data.tempPassword);
      } else {
        alert(result.error || 'Error al resetear');
      }
    });
  }

  function cancel() {
    setMode('idle');
    setSelectedRole(currentRole);
    setEditName(currentName);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {tempPassword && (
        <div className="alert alert-success" style={{ fontSize: '0.75rem', padding: '4px 8px', margin: 0 }}>
          🔑 <strong>{tempPassword}</strong>
          <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(tempPassword)}
            style={{ fontSize: '0.7rem', marginLeft: 4, padding: '2px 4px' }}>📋</button>
        </div>
      )}

      {mode === 'role' && (
        <>
          <select className="form-select" style={{ width: 'auto', fontSize: '0.8125rem', padding: '4px 8px' }}
            value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} disabled={isPending}>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={handleRoleSave} disabled={isPending}>{isPending ? '...' : '✓'}</button>
          <button className="btn btn-ghost btn-sm" onClick={cancel}>✕</button>
        </>
      )}

      {mode === 'edit' && (
        <>
          <input className="form-input" style={{ width: 180, fontSize: '0.8125rem', padding: '4px 8px', margin: 0 }}
            value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nombre" />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{editEmail}</span>
          <button className="btn btn-primary btn-sm" onClick={handleEditSave} disabled={isPending}>{isPending ? '...' : '✓'}</button>
          <button className="btn btn-ghost btn-sm" onClick={cancel}>✕</button>
        </>
      )}

      {mode === 'idle' && (
        <>
          <button className="btn btn-ghost btn-sm" onClick={() => setMode('edit')} disabled={isSelf}
            title="Editar nombre">✏️</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setMode('role')} disabled={isSelf}
            title="Cambiar rol">👤 Rol</button>
          {!isSelf && (
            <button className="btn btn-ghost btn-sm" onClick={handleResetPassword} disabled={isPending}
              title="Resetear contraseña">🔑</button>
          )}
          <button className={`btn ${active ? 'btn-secondary' : 'btn-primary'} btn-sm`}
            onClick={handleToggle} disabled={isPending || isSelf}
            title={isSelf ? 'No puedes desactivarte' : undefined}>
            {isPending ? '...' : active ? '🚫' : '✅'}
          </button>
        </>
      )}
    </div>
  );
}
