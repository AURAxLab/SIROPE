/**
 * SIROPE — Formulario de Recuperación de Contraseña
 * Componente cliente para solicitar el enlace de restablecimiento.
 */

'use client';

import { useState } from 'react';
import { requestPasswordReset } from '@/app/actions/password-reset';
import styles from '../login/login.module.css';

export default function RecuperarPasswordForm() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.set('email', email);
      await requestPasswordReset(formData);
      setSubmitted(true);
    } catch {
      // Always show success to not leak info
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
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
          <h1 className={styles.brandTitle}>Recuperar Contraseña</h1>
          <p className={styles.brandSubtitle}>SIROPE</p>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center' }}>
            <div
              className="alert alert-success"
              style={{ marginBottom: 20, justifyContent: 'center' }}
            >
              ✅ Si el correo existe en el sistema, recibirá un enlace de recuperación.
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24 }}>
              Revise su bandeja de entrada y la carpeta de spam. El enlace expira en 1 hora.
            </p>
            <a href="/login" className="btn btn-secondary">
              ← Volver al inicio de sesión
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.loginForm}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 8 }}>
              Ingrese su correo electrónico y le enviaremos un enlace para restablecer su contraseña.
            </p>

            <div className={styles.inputGroup}>
              <svg
                className={styles.inputIcon}
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <input
                type="email"
                className={styles.inputField}
                placeholder="correo@ucr.ac.cr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || !email.trim()}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="spinner" /> Enviando...
                </span>
              ) : (
                'Enviar Enlace de Recuperación'
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
        )}
      </div>
    </div>
  );
}
