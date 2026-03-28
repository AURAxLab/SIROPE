/**
 * SIROPE — Toast Notifications
 * Tema: UCR Celeste (Glassmorphism & Lucide Icons)
 */

'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={20} color="var(--color-success)" />;
      case 'error': return <AlertCircle size={20} color="var(--color-error)" />;
      case 'warning': return <AlertTriangle size={20} color="var(--color-warning)" />;
      case 'info': return <Info size={20} color="var(--color-info)" />;
    }
  };

  const getGlow = (type: ToastType) => {
    switch (type) {
      case 'success': return 'var(--color-success-dim)';
      case 'error': return 'var(--color-error-dim)';
      case 'warning': return 'var(--color-warning-dim)';
      case 'info': return 'var(--color-info-dim)';
    }
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: 32,
        right: 32,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        zIndex: 9999,
        pointerEvents: 'none',
      }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '16px 20px',
              background: 'var(--glass-bg)',
              border: '1px solid var(--surface-border-strong)',
              borderLeft: `3px solid ${getGlow(t.type).replace('-dim)', ')')}`, /* Hack for base color */
              borderRadius: 'var(--radius-md)',
              backdropFilter: 'blur(var(--glass-blur))',
              WebkitBackdropFilter: 'blur(var(--glass-blur))',
              boxShadow: `0 8px 32px rgba(0,0,0,0.3), 0 0 24px ${getGlow(t.type)}`,
              animation: 'toastSlideIn 0.4s var(--ease-out-back)',
              maxWidth: 420,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              transformOrigin: 'bottom right'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: getGlow(t.type), borderRadius: '50%', padding: '6px' }}>
              {getIcon(t.type)}
            </div>
            <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500, lineHeight: 1.5, letterSpacing: '0.01em' }}>
              {t.message}
            </span>
            <button
              onClick={() => dismiss(t.id)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.background = 'var(--surface-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
