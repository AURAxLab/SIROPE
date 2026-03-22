/**
 * SIROPE — NotificationBell
 * Campana de notificaciones que muestra alertas relevantes por rol.
 * No requiere modelo de base de datos — usa datos existentes.
 */

'use client';

import { useState, useEffect, useTransition, useRef } from 'react';

interface NotificationItem {
  id: string;
  icon: string;
  message: string;
  time: string;
  href?: string;
}

interface NotificationBellProps {
  role: string;
}

export default function NotificationBell({ role }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleToggle() {
    if (!loaded) {
      startTransition(async () => {
        const res = await fetch(`/api/notifications?role=${role}`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setLoaded(true);
        }
      });
    }
    setOpen(!open);
  }

  const count = notifications.length;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={handleToggle}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '1.25rem', position: 'relative', padding: '4px 8px',
          color: 'var(--text-primary)',
        }}
        title="Notificaciones"
      >
        🔔
        {count > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            background: 'var(--color-error)', color: 'white',
            borderRadius: '50%', width: 18, height: 18,
            fontSize: '0.625rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0,
          width: 320, maxHeight: 400, overflowY: 'auto',
          background: 'var(--card-bg)', border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-lg)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(16px)', zIndex: 100,
          marginBottom: 8,
        }}>
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--surface-border)',
            fontWeight: 600, fontSize: '0.875rem',
          }}>
            Notificaciones {count > 0 && `(${count})`}
          </div>

          {isPending ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
              ⏳ Cargando...
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              ✅ No hay notificaciones pendientes
            </div>
          ) : (
            notifications.map((n) => (
              <a
                key={n.id}
                href={n.href || '#'}
                onClick={() => setOpen(false)}
                style={{
                  display: 'flex', gap: 10, padding: '10px 16px',
                  borderBottom: '1px solid var(--surface-border)',
                  textDecoration: 'none', color: 'var(--text-primary)',
                  fontSize: '0.8125rem', transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-bg)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontSize: '1.125rem' }}>{n.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ lineHeight: 1.4 }}>{n.message}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{n.time}</p>
                </div>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}
