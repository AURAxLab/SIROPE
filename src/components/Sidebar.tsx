/**
 * SIROPE — Componente de Navegación (Sidebar)
 * Tema: UCR Celeste
 */

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { 
  Home, Users, BookOpen, Calendar, 
  Settings, UserPlus, CheckSquare, 
  BarChart2, FileText, ChevronLeft, ChevronRight, Menu, Activity
} from 'lucide-react';
import styles from './Sidebar.module.css';
import NotificationBell from './NotificationBell';

interface SidebarProps {
  userRole: string;
  userName: string;
  userEmail: string;
}

// Menú dinámico basado en rol
const getNavItems = (role: string) => {
  switch (role) {
    case 'ADMIN':
      return [
        { href: '/admin', label: 'Dashboard', icon: Home, section: 'General' },
        { href: '/admin/usuarios', label: 'Usuarios', icon: Users, section: 'Gestión' },
        { href: '/admin/semestres', label: 'Semestres', icon: Calendar, section: 'Gestión' },
        { href: '/admin/aprobaciones', label: 'Aprobaciones', icon: CheckSquare, section: 'Operaciones' },
        { href: '/admin/auditoria', label: 'Auditoría', icon: FileText, section: 'Operaciones' },
        { href: '/admin/analytics', label: 'Analytics', icon: BarChart2, section: 'Sistema' },
        { href: '/admin/configuracion', label: 'Configuración', icon: Settings, section: 'Sistema' },
      ];
    case 'RESEARCHER':
      return [
        { href: '/investigador', label: 'Dashboard', icon: Home, section: 'General' },
        { href: '/investigador/estudios', label: 'Mis Estudios', icon: BookOpen, section: 'Investigación' },
        { href: '/investigador/estudios/nuevo', label: 'Nuevo Estudio', icon: FileText, section: 'Investigación' },
      ];
    case 'PROFESSOR':
      return [
        { href: '/profesor', label: 'Dashboard', icon: Home, section: 'General' },
        { href: '/profesor/cursos', label: 'Mis Cursos', icon: BookOpen, section: 'Académico' },
        { href: '/profesor/estudiantes', label: 'Mis Estudiantes', icon: Users, section: 'Académico' },
      ];
    case 'STUDENT':
      return [
        { href: '/estudiante', label: 'Dashboard', icon: Home, section: 'General' },
        { href: '/estudiante/estudios', label: 'Estudios Disponibles', icon: BookOpen, section: 'Participación' },
        { href: '/estudiante/historial', label: 'Mi Historial', icon: Activity, section: 'Participación' },
      ];
    default:
      return [];
  }
};

export default function Sidebar({ userRole, userName, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const navItems = getNavItems(userRole);

  const sections = Array.from(new Set(navItems.map(item => item.section)));
  
  // Responsive check
  useEffect(() => {
    const checkWidth = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(false);
      }
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  return (
    <>
      {/* Mobile Header (Only visible on small screens) */}
      <div className="mobile-header" style={{
        display: 'none',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        height: '60px',
        background: 'var(--bg-deepest)',
        borderBottom: '1px solid var(--surface-border)',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button 
            onClick={() => setIsMobileOpen(true)}
            style={{ background: 'none', border: 'none', color: 'var(--celeste-400)' }}
          >
            <Menu size={24} />
          </button>
          <div className={styles.brand}>
            <div className={styles.logo}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '1.25rem' }}>SIROPE</span>
          </div>
        </div>
        <NotificationBell role={userRole} />
      </div>

      {isMobileOpen && (
        <div 
          className={styles.sidebarOverlay} 
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside 
        className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ''} ${isMobileOpen ? 'sidebar-open' : ''}`}
      >
        <div className={styles.header}>
          <Link href="/" className={styles.brand}>
            <div className={styles.logo}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className={styles.brandName}>SIROPE</span>
          </Link>
          <button 
            className={styles.toggleBtn}
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? "Expandir menú" : "Contraer menú"}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className={styles.nav}>
          {sections.map(section => (
            <div key={section} className={styles.navSection}>
              <div className={styles.sectionTitle}>{section}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {navItems.filter(item => item.section === section).map(item => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                      onClick={() => setIsMobileOpen(false)}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon className={styles.navIcon} size={20} />
                      <span className={styles.navLabel}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className={styles.userInfo}>
          <div className={styles.avatar}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className={styles.userDetails}>
            <span className={styles.userName} title={userName}>{userName}</span>
            <span className={styles.userRole}>
              {userRole === 'ADMIN' ? 'Administrador' : 
               userRole === 'RESEARCHER' ? 'Investigador' : 
               userRole === 'PROFESSOR' ? 'Profesor' : 'Estudiante'}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
