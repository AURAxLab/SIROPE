/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Sidebar — Navegación principal de la aplicación
 * Componente client-side con menú responsive y role-based navigation.
 */

'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import styles from './Sidebar.module.css';
import NotificationBell from './NotificationBell';

// ============================================================
// Tipos
// ============================================================

/** Elemento del menú de navegación. */
interface NavItem {
  label: string;
  href: string;
  icon: string;
}

/** Props del Sidebar. */
interface SidebarProps {
  userName: string;
  userRole: string;
  roleLabel: string;
}

// ============================================================
// Configuración de navegación por rol
// ============================================================

/**
 * Define los ítems de navegación para cada rol.
 */
function getNavItems(role: string): NavItem[] {
  const items: Record<string, NavItem[]> = {
    ADMIN: [
      { label: 'Dashboard', href: '/admin', icon: '📊' },
      { label: 'Usuarios', href: '/admin/usuarios', icon: '👥' },
      { label: 'Semestres', href: '/admin/semestres', icon: '📅' },
      { label: 'Aprobaciones', href: '/admin/aprobaciones', icon: '✅' },
      { label: 'Configuración', href: '/admin/configuracion', icon: '⚙️' },
      { label: 'Analytics', href: '/admin/analytics', icon: '📈' },
      { label: 'Auditoría', href: '/admin/auditoria', icon: '🔍' },
    ],
    PROFESOR: [
      { label: 'Dashboard', href: '/profesor', icon: '📊' },
      { label: 'Mis Cursos', href: '/profesor/cursos', icon: '📚' },
      { label: 'Créditos', href: '/profesor/creditos', icon: '🏆' },
    ],
    INV_PRINCIPAL: [
      { label: 'Dashboard', href: '/investigador', icon: '📊' },
      { label: 'Mis Estudios', href: '/investigador/estudios', icon: '🔬' },
      { label: 'Timeslots', href: '/investigador/timeslots', icon: '🕐' },
      { label: 'Colaboradores', href: '/investigador/colaboradores', icon: '🤝' },
    ],
    INV_EJECUTOR: [
      { label: 'Dashboard', href: '/investigador', icon: '📊' },
      { label: 'Estudios', href: '/investigador/estudios', icon: '🔬' },
      { label: 'Timeslots', href: '/investigador/timeslots', icon: '🕐' },
    ],
    ESTUDIANTE: [
      { label: 'Dashboard', href: '/estudiante', icon: '📊' },
      { label: 'Estudios', href: '/estudiante/estudios', icon: '🔬' },
      { label: 'Mis Inscripciones', href: '/estudiante/inscripciones', icon: '📋' },
      { label: 'Créditos', href: '/estudiante/creditos', icon: '🏆' },
      { label: 'Historial', href: '/estudiante/historial', icon: '📜' },
    ],
  };

  return items[role] || [];
}

// ============================================================
// Componente
// ============================================================

/**
 * Sidebar de navegación principal.
 * Colapsable en mobile, con indicador de ruta activa.
 */
export default function Sidebar({ userName, userRole, roleLabel }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const navItems = getNavItems(userRole);

  /**
   * Determina si una ruta está activa.
   */
  function isActive(href: string): boolean {
    if (href === '/admin' || href === '/profesor' || href === '/investigador' || href === '/estudiante') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Botón mobile toggle */}
      <button
        className={styles.mobileToggle}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Menú de navegación"
      >
        <span className={styles.hamburger} data-open={mobileOpen} />
      </button>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className={styles.overlay}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={styles.sidebar}
        data-collapsed={collapsed}
        data-mobile-open={mobileOpen}
      >
        {/* Branding */}
        <div className={styles.brand}>
          <div className={styles.brandLogo}>🧪</div>
          {!collapsed && <span className={styles.brandName}>SIROPE</span>}
        </div>

        {/* Navegación */}
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive(item.href) ? styles.navItemActive : ''}`}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : undefined}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
              {isActive(item.href) && <span className={styles.activeIndicator} />}
            </Link>
          ))}
        </nav>

        {/* Footer del sidebar */}
        <div className={styles.footer}>
          {/* Perfil del usuario */}
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              {userName.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className={styles.userDetails}>
                <span className={styles.userName}>{userName}</span>
                <span className={styles.userRole}>{roleLabel}</span>
              </div>
            )}
          </div>

          {/* Botones de control */}
          <div className={styles.footerActions}>
            <NotificationBell role={userRole} />
            <button
              className={styles.collapseBtn}
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? 'Expandir' : 'Colapsar'}
            >
              {collapsed ? '▶' : '◀'}
            </button>
            <button
              className={styles.logoutBtn}
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Cerrar sesión"
            >
              {collapsed ? '🚪' : '🚪 Salir'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
