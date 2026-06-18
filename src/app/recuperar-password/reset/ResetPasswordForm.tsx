/**
 * SIROPE — Formulario de Restablecimiento de Contraseña
 * Componente cliente con token para establecer nueva contraseña.
 */

'use client';

import { useState } from 'react';
import { resetPasswordWithToken } from '@/app/actions/password-reset';
import styles from '../../login/login.module.css';

interface ResetPasswordFormProps {
  token: string;
}

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className={styles.loginWrapper}>
        <div className={styles.pageBg}></div>
        <div className={styles.ambientOrbs}>
          <div className={styles.orb1}></div>
          <div className={styles.orb2}></div>
        </div>
        <div className={styles.loginCard}>
          <div className={styles.brandHeader}>
            <h1 className={styles.brandTitle}>Enlace Inválido</h1>
            <p className={styles.brandSubtitle}>SIROPE</p>
          </div>
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            ❌ El enlace de recuperación no es válido o ha expirado.
          </div>
          <div style={{ textAlign: 'center' }}>
            <a href="/recuperar-password" className="btn btn-primary">
              Solicitar nuevo enlace
            </a>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.set('token', token);
      formData.set('newPassword', newPassword);
      formData.set('confirmPassword', confirmPassword);

      const result = await resetPasswordWithToken(formData);

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || 'Error al restablecer la contraseña');
      }
    } catch {
      setError('Error inesperado. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className={styles.loginWrapper}>
        <div className={styles.pageBg}></div>
        <div className={styles.ambientOrbs}>
          <div className={styles.orb1}></div>
          <div className={styles.orb2}></div>
        </div>
        <div className={styles.loginCard}>
          <div className={styles.brandHeader}>
            <h1 className={styles.brandTitle}>¡Contraseña Cambiada!</h1>
            <p className={styles.brandSubtitle}>SIROPE</p>
          </div>
          <div className="alert alert-success" style={{ marginBottom: 20, justifyContent: 'center' }}>
            ✅ Su contraseña ha sido restablecida exitosamente.
          </div>
          <div style={{ textAlign: 'center' }}>
            <a href="/login" className="btn btn-primary">
              Iniciar Sesión
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.loginWrapper}>
      <div className={styles.pageBg}></div>
      <div className={styles.ambientOrbs}>
        <div className={styles.orb1}></div>
        <div className={styles.orb2}></div>
      </div>

      <div className={styles.loginCard}>
        <div className={styles.brandHeader}>
          <h1 className={styles.brandTitle}>Nueva Contraseña</h1>
          <p className={styles.brandSubtitle}>SIROPE</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.loginForm}>
          {error && (
            <div className={styles.errorBanner}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className={styles.inputGroup}>
            <svg className={styles.inputIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <input
              type="password"
              className={styles.inputField}
              placeholder="Nueva contraseña (mín. 8 caracteres)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              autoFocus
            />
          </div>

          <div className={styles.inputGroup}>
            <svg className={styles.inputIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <input
              type="password"
              className={styles.inputField}
              placeholder="Confirmar nueva contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: -8 }}>
            Mín. 8 caracteres, al menos 1 mayúscula y 1 número.
          </p>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading || !newPassword.trim() || !confirmPassword.trim()}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="spinner" /> Restableciendo...
              </span>
            ) : (
              'Restablecer Contraseña'
            )}
          </button>

          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <a
              href="/login"
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}
            >
              ← Volver al inicio de sesión
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
