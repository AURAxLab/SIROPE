import Link from 'next/link';

/**
 * SIROPE — Página 404 (No Encontrada)
 * Se muestra cuando una ruta no existe.
 */
export default function NotFound() {
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
        {/* 404 Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 18px',
            borderRadius: '9999px',
            background: 'rgba(0, 192, 243, 0.12)',
            color: '#007399',
            fontSize: '0.875rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            marginBottom: 20,
          }}
        >
          404
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
          Página no encontrada
        </h1>

        <p
          style={{
            color: '#334155',
            fontSize: '0.9375rem',
            lineHeight: 1.6,
            marginBottom: 28,
          }}
        >
          La página que busca no existe o fue movida.
        </p>

        <Link
          href="/"
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
            textDecoration: 'none',
            background: 'linear-gradient(135deg, #005da4, #00c0f3, #4dd4ff)',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(0, 93, 164, 0.02)',
            transition: 'all 280ms cubic-bezier(0.16, 1, 0.3, 1)',
            letterSpacing: '0.02em',
          }}
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
