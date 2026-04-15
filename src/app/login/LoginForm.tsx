/**
 * SIROPE Login Page
 * Paleta oficial UCR — glassmorphism panel
 * Logo institucional: sustituir /public/logo-institucion.svg
 */

'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import styles from './login.module.css';

interface LoginFormProps {
  logoUrl?: string;
  universityName?: string;
}

export default function LoginForm({ logoUrl = '/logo-institucion.svg', universityName = 'Universidad de Costa Rica' }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        setError('Correo institucional o contraseña incorrectos.');
      } else {
        window.location.href = '/';
      }
    } catch {
      setError('Error al iniciar sesión. Verifique su conexión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.loginWrapper}>
      <div className={styles.pageBg}></div>
      
      {/* Animated UCR colors background orbs */}
      <div className={styles.ambientOrbs}>
        <div className={styles.orb1}></div>
        <div className={styles.orb2}></div>
      </div>

      <div className={styles.loginCard}>
        <div className={styles.brandHeader}>
          <div className={styles.logoIcon}>
            <img src={logoUrl} alt="Logo institucional" width={64} height={64} style={{ objectFit: 'contain' }} />
          </div>
          <h1 className={styles.brandTitle}>SIROPE</h1>
          <p className={styles.brandSubtitle}>{universityName}</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.loginForm}>
          {error && (
            <div className={styles.errorBanner}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className={styles.inputGroup}>
            <svg className={styles.inputIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
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

          <div className={styles.inputGroup}>
            <svg className={styles.inputIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <input
              type="password"
              className={styles.inputField}
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className={styles.submitBtn} 
            disabled={loading || !email.trim() || !password.trim()}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg className="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Ingresando...
              </span>
            ) : (
              'Iniciar Sesión'
            )}
            {!loading && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
