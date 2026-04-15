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
  currentStudentId?: string;
}

const ROLES = [
  { value: 'ESTUDIANTE', label: '🎓 Estudiante' },
  { value: 'PROFESOR', label: '📚 Profesor' },
  { value: 'INV_PRINCIPAL', label: '🔬 Inv. Principal' },
  { value: 'INV_EJECUTOR', label: '🧪 Inv. Ejecutor' },
  { value: 'ADMIN', label: '🛡️ Admin' },
];

export default function UserActions({ userId, active, currentUserId, currentRole, currentName, currentEmail, currentStudentId = '' }: UserActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<'idle' | 'role' | 'edit'>('idle');
  
  const [selectedRole, setSelectedRole] = useState(currentRole);
  
  const [editName, setEditName] = useState(currentName);
  const [editEmail, setEditEmail] = useState(currentEmail);
  const [editStudentId, setEditStudentId] = useState(currentStudentId);
  const [confirmDisable, setConfirmDisable] = useState(false);

  const [tempPassword, setTempPassword] = useState('');
  const isSelf = userId === currentUserId;

  function handleToggle() {
    if (isSelf) return;
    
    // Si queremos desactivar, pedir confirmacion interactiva
    if (active && !confirmDisable) {
      setConfirmDisable(true);
      setTimeout(() => setConfirmDisable(false), 3000); // Reset confirm state after 3 sec
      return;
    }

    startTransition(async () => {
      await updateUser(userId, { active: !active });
      setConfirmDisable(false);
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
    if (editName === currentName && editEmail === currentEmail && editStudentId === currentStudentId) { 
      setMode('idle'); 
      return; 
    }
    
    startTransition(async () => {
      await updateUser(userId, { 
        name: editName, 
        email: editEmail, 
        studentId: editStudentId || undefined 
      });
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
    setEditEmail(currentEmail);
    setEditStudentId(currentStudentId);
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
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px', background: 'var(--surface-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--surface-border)' }}>
          <input className="form-input" style={{ width: 140, fontSize: '0.8125rem', padding: '4px 8px', margin: 0 }}
            value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nombre" />
          <input className="form-input" style={{ width: 160, fontSize: '0.8125rem', padding: '4px 8px', margin: 0 }}
            value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Correo" type="email" />
          <input className="form-input" style={{ width: 100, fontSize: '0.8125rem', padding: '4px 8px', margin: 0 }}
            value={editStudentId} onChange={(e) => setEditStudentId(e.target.value)} placeholder="Ej: B90000" />
            
          <button className="btn btn-primary btn-sm" onClick={handleEditSave} disabled={isPending}>{isPending ? '...' : 'Guardar'}</button>
          <button className="btn btn-ghost btn-sm" onClick={cancel}>Cancelar</button>
        </div>
      )}

      {mode === 'idle' && (
        <>
          <button className="btn btn-ghost btn-sm" onClick={() => setMode('edit')} disabled={isSelf}
            title="Editar datos">✏️</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setMode('role')} disabled={isSelf}
            title="Cambiar rol">👤 Rol</button>
          {!isSelf && (
            <button className="btn btn-ghost btn-sm" onClick={handleResetPassword} disabled={isPending}
              title="Resetear contraseña">🔑</button>
          )}
          <button className={`btn ${active ? (confirmDisable ? 'btn-danger' : 'btn-ghost') : 'btn-primary'} btn-sm`}
            onClick={handleToggle} disabled={isPending || isSelf}
            style={confirmDisable ? { background: 'var(--color-error)', color: 'white' } : {}}
            title={isSelf ? 'No puedes suspenderte' : 'Suspender/Activar usuario'}>
            {isPending ? '...' : active ? (confirmDisable ? '⚠️ Confirmar' : '🗑️ Suspender') : '✅ Restablecer'}
          </button>
        </>
      )}
    </div>
  );
}
