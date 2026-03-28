/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Dashboard Admin — Vista principal
 * Tema UI: UCR Celeste + Frontend-Design Upgrade
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import type { Role } from '@/lib/validations';
import ExportCSV from '@/components/ExportCSV';
import { 
  Users, BookOpen, CheckSquare, Activity, 
  Calendar, Settings, BarChart2, FileText, 
  Clock, ArrowRight 
} from 'lucide-react';

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user || (session.user.role as Role) !== 'ADMIN') {
    redirect('/login');
  }

  // Métricas del sistema
  const [
    totalUsers,
    activeStudies,
    pendingApproval,
    totalParticipations,
    activeSemester,
  ] = await Promise.all([
    prisma.user.count({ where: { active: true } }),
    prisma.study.count({ where: { status: 'ACTIVE' } }),
    prisma.study.findMany({
      where: { status: 'PENDING_APPROVAL' },
      include: {
        principalInvestigator: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.participation.count({ where: { status: 'COMPLETED' } }),
    prisma.semester.findFirst({ where: { active: true } }),
  ]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Header: Editorial Typography & Flex spatial composition */}
      <div className="page-header stagger-1">
        <div>
          <h1 className="page-title text-gradient">Panel de Administración</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={14} />
            Semestre actual: <strong style={{ color: 'var(--text-primary)' }}>{activeSemester?.name || 'Inactivo'}</strong>
          </p>
        </div>
        <ExportCSV type="participations" label="Exportar Datos .CSV" />
      </div>

      {/* Hero Stats */}
      <div className="stat-grid stagger-2">
        <div className="card-gradient" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="stat-value" style={{ color: 'white', fontSize: '3rem' }}>
              {pendingApproval.length}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '50%' }}>
              <Clock size={28} color="white" />
            </div>
          </div>
          <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)', marginTop: 8, fontSize: '1rem', letterSpacing: '0.02em' }}>
            Estudios Pendientes de Aprobar
          </div>
        </div>
        
        <div className="stat-card" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--surface-border-strong)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="stat-label">Usuarios Activos</div>
            <Users size={18} color="var(--celeste-500)" />
          </div>
          <div className="stat-value">{totalUsers}</div>
        </div>

        <div className="stat-card" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--surface-border-strong)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="stat-label">Estudios Activos</div>
            <BookOpen size={18} color="var(--celeste-500)" />
          </div>
          <div className="stat-value">{activeStudies}</div>
        </div>

        <div className="stat-card" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--surface-border-strong)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="stat-label">Participaciones</div>
            <Activity size={18} color="var(--celeste-500)" />
          </div>
          <div className="stat-value">{totalParticipations}</div>
        </div>
      </div>

      {/* Action required section */}
      {pendingApproval.length > 0 && (
        <div className="card stagger-3" style={{ borderColor: 'var(--color-warning)', background: 'var(--bg-elevated)', boxShadow: '0 8px 32px rgba(255, 218, 115, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ background: 'var(--color-warning-dim)', padding: 10, borderRadius: '12px', color: 'var(--color-warning)' }}>
              <CheckSquare size={24} />
            </div>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Atención Requerida</h2>
          </div>
          
          <div className="table-wrapper">
            <table className="table" style={{ background: 'var(--bg-deepest)' }}>
              <thead>
                <tr>
                  <th>Título del Estudio</th>
                  <th>Ingreso</th>
                  <th>Investigador</th>
                  <th style={{ textAlign: 'right' }}>Revisión</th>
                </tr>
              </thead>
              <tbody>
                {pendingApproval.map((study) => (
                  <tr key={study.id}>
                    <td style={{ fontWeight: 600, color: 'var(--celeste-300)' }}>{study.title}</td>
                    <td>
                      {study.createdAt.toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td>{study.principalInvestigator.name}</td>
                    <td style={{ textAlign: 'right' }}>
                      <a href="/admin/aprobaciones" className="btn btn-warning btn-sm" style={{ background: 'var(--gradient-oro)', color: '#040b14', border: 'none' }}>
                        Evaluar
                        <ArrowRight size={14} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Spatial Composition for Links */}
      <div className="stagger-4" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 20, fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Módulos del Sistema</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px'
        }}>
          {[
            { title: 'Usuarios', icon: Users, desc: 'Perfiles y roles', href: '/admin/usuarios', color: 'var(--celeste-400)' },
            { title: 'Semestres', icon: Calendar, desc: 'Ciclos académicos', href: '/admin/semestres', color: 'var(--color-success)' },
            { title: 'Configuración', icon: Settings, desc: 'Parámetros institucionales', href: '/admin/configuracion', color: 'var(--text-secondary)' },
            { title: 'Analytics', icon: BarChart2, desc: 'Métricas de participación', href: '/admin/analytics', color: 'var(--celeste-300)' },
            { title: 'Auditoría', icon: FileText, desc: 'Logs y trazabilidad', href: '/admin/auditoria', color: 'var(--color-warning)' }
          ].map((mod) => (
            <a key={mod.href} href={mod.href} className="card-interactive" style={{ display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--bg-elevated)' }}>
              <div style={{ background: 'var(--bg-deepest)', padding: 12, borderRadius: 12, width: 'max-content', border: '1px solid var(--surface-border)' }}>
                <mod.icon size={22} color={mod.color} />
              </div>
              <div>
                <h4 style={{ fontSize: '1.05rem', margin: '0 0 4px 0', color: 'var(--text-primary)' }}>{mod.title}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>{mod.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
