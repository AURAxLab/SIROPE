/**
 * SIROPE — Formulario de Cambio de Contraseña
 * Componente cliente para cambiar la contraseña del usuario autenticado.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { changeOwnPassword } from '@/app/actions/profile';

interface ChangePasswordFormProps {
  autoFocus?: boolean;
}

export default function ChangePasswordForm({ autoFocus = false }: ChangePasswordFormProps) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const currentPasswordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && currentPasswordRef.current) {
      currentPasswordRef.current.focus();
      currentPasswordRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [autoFocus]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);

      const result = await changeOwnPassword(formData);

      if (result.success) {
        setSuccess('Contraseña cambiada exitosamente. Los cambios se aplicarán en su próxima sesión.');
        formRef.current?.reset();
        // Reload after a brief delay so the session updates
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        setError(result.error || 'Error al cambiar la contraseña');
      }
    } catch {
      setError('Error inesperado. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          ❌ {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          ✅ {success}
        </div>
      )}

      <div className="form-group">
        <label className="form-label" htmlFor="currentPassword">
          Contraseña actual
        </label>
        <input
          ref={currentPasswordRef}
          id="currentPassword"
          name="currentPassword"
          type="password"
          className="form-input"
          required
          autoComplete="current-password"
          placeholder="Su contraseña actual"
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="newPassword">
          Nueva contraseña
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          className="form-input"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 número"
        />
        <span className="form-hint">
          Debe contener al menos 8 caracteres, una mayúscula y un número.
        </span>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="confirmPassword">
          Confirmar nueva contraseña
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          className="form-input"
          required
          autoComplete="new-password"
          placeholder="Repita la nueva contraseña"
        />
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={loading}
        style={{ marginTop: 8 }}
      >
        {loading ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="spinner" /> Cambiando...
          </span>
        ) : (
          'Cambiar Contraseña'
        )}
      </button>
    </form>
  );
}
