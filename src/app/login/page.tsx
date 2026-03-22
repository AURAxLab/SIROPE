/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Página de Login — Autenticación de usuarios
 * Pantalla de inicio de sesión con diseño premium y glassmorphism.
 */

'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import styles from './login.module.css';

/**
 * Página de login con diseño visual premium.
 * Incluye formulario con validación y manejo de errores.
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Maneja el envío del formulario de login.
   * Usa NextAuth signIn con redirect manual.
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Correo o contraseña incorrectos');
      } else {
        // Redirigir al dashboard correspondiente
        window.location.href = '/';
      }
    } catch {
      setError('Error al iniciar sesión. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.container}>
      {/* Fondo con gradiente y orbes decorativos */}
      <div className={styles.background}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.orb3} />
      </div>

      <div className={styles.card}>
        {/* Logo y branding */}
        <div className={styles.header}>
          <div className={styles.logoContainer}>
            <span className={styles.logo}>🧪</span>
          </div>
          <h1 className={styles.title}>SIROPE</h1>
          <p className={styles.subtitle}>
            Sistema de Registro Optativo de<br />Participantes de Estudios
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.alert} role="alert">
              <span className={styles.alertIcon}>⚠️</span>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="usuario@universidad.cr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              minLength={8}
            />
          </div>

          <button
            type="submit"
            className={`btn btn-primary btn-lg ${styles.submitBtn}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className={styles.spinner} />
                Ingresando...
              </>
            ) : (
              'Iniciar sesión'
            )}
          </button>
        </form>

        <p className={styles.footer}>
          ¿Olvidó su contraseña?{' '}
          <a href="/recuperar" className={styles.link}>
            Recuperar acceso
          </a>
        </p>
      </div>
    </main>
  );
}
