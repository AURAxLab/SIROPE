'use client';

import { useEffect } from 'react';

/**
 * SIROPE — Página de Error Global
 * Muestra un mensaje amigable cuando ocurre un error inesperado.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[SIROPE Error]', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #005da4, #00c0f3, #4dd4ff)',
        fontFamily: "var(--font-body, 'Inter', sans-serif)",
        padding: '24px',
      }}
    >
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          padding: '48px 40px',
          maxWidth: 440,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 24px 48px rgba(15, 23, 42, 0.1), 0 4px 12px rgba(0, 93, 164, 0.05)',
          animation: 'fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        {/* Error icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(239, 83, 80, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef5350"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h1
          style={{
            fontFamily: "var(--font-display, 'DM Serif Display', Georgia, serif)",
            fontSize: '1.75rem',
            fontWeight: 400,
            color: '#0f172a',
            marginBottom: 10,
            letterSpacing: '0.01em',
          }}
        >
          Algo salió mal
        </h1>

        <p
          style={{
            color: '#334155',
            fontSize: '0.9375rem',
            lineHeight: 1.6,
            marginBottom: 28,
          }}
        >
          Ocurrió un error inesperado. Por favor, intente de nuevo.
        </p>

        <button
          onClick={() => reset()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '12px 28px',
            fontSize: '0.9375rem',
            fontWeight: 600,
            fontFamily: "var(--font-body, 'Inter', sans-serif)",
            border: 'none',
            borderRadius: '14px',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #005da4, #00c0f3, #4dd4ff)',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(0, 93, 164, 0.02)',
            transition: 'all 280ms cubic-bezier(0.16, 1, 0.3, 1)',
            letterSpacing: '0.02em',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow =
              '0 12px 28px rgba(15, 23, 42, 0.07), 0 8px 24px rgba(0, 93, 164, 0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow =
              '0 4px 12px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(0, 93, 164, 0.02)';
          }}
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
