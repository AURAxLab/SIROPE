/**
 * SIROPE — Formulario de Auto-Registro de Estudiante
 * Componente cliente para que estudiantes se registren en el sistema.
 */

'use client';

import { useState } from 'react';
import { registerStudent } from '@/app/actions/registration';
import styles from '../login/login.module.css';

export default function RegistroForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.set('name', name);
      formData.set('email', email);
      formData.set('studentId', studentId);
      formData.set('password', password);
      formData.set('confirmPassword', confirmPassword);

      const result = await registerStudent(formData);

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = '/login';
        }, 3000);
      } else {
        setError(result.error || 'Error al registrarse');
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
            <h1 className={styles.brandTitle}>¡Registro Exitoso!</h1>
            <p className={styles.brandSubtitle}>SIROPE</p>
          </div>
          <div className="alert alert-success" style={{ marginBottom: 20, justifyContent: 'center' }}>
            ✅ Su cuenta ha sido creada exitosamente.
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', marginBottom: 20 }}>
            Será redirigido al inicio de sesión en unos segundos...
          </p>
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

      <div className={styles.loginCard} style={{ maxWidth: 480 }}>
        <div className={styles.brandHeader}>
          <h1 className={styles.brandTitle}>Registro</h1>
          <p className={styles.brandSubtitle}>SIROPE — Cuenta de Estudiante</p>
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

          {/* Nombre */}
          <div className={styles.inputGroup}>
            <svg className={styles.inputIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <input
              type="text"
              className={styles.inputField}
              placeholder="Nombre completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              autoFocus
            />
          </div>

          {/* Email */}
          <div className={styles.inputGroup}>
            <svg className={styles.inputIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
            />
          </div>

          {/* Carné */}
          <div className={styles.inputGroup}>
            <svg className={styles.inputIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            <input
              type="text"
              className={styles.inputField}
              placeholder="Carné (ej: B12345)"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.toUpperCase())}
              required
              pattern="^[A-Z][0-9]{5}$"
              title="Formato: B12345 (una letra mayúscula seguida de 5 dígitos)"
            />
          </div>

          {/* Contraseña */}
          <div className={styles.inputGroup}>
            <svg className={styles.inputIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <input
              type="password"
              className={styles.inputField}
              placeholder="Contraseña (mín. 8 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          {/* Confirmar contraseña */}
          <div className={styles.inputGroup}>
            <svg className={styles.inputIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <input
              type="password"
              className={styles.inputField}
              placeholder="Confirmar contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: -8 }}>
            La contraseña debe tener mín. 8 caracteres, 1 mayúscula y 1 número.
          </p>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading || !name.trim() || !email.trim() || !studentId.trim() || !password.trim() || !confirmPassword.trim()}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="spinner" /> Registrando...
              </span>
            ) : (
              'Crear Cuenta'
            )}
            {!loading && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
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
              ¿Ya tiene cuenta? Iniciar Sesión
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
