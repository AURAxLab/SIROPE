/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Dashboard Investigador — Vista principal (IP e IE)
 * Tema UI: UCR Celeste + Frontend-Design Upgrade
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import type { Role } from '@/lib/validations';
import { Microscope, Activity, Users, FileSignature, FolderSearch, Clock, ArrowRight, FlaskConical, Target } from 'lucide-react';

export default async function InvestigadorDashboard() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const role = session.user.role as Role;
  if (role !== 'INV_PRINCIPAL' && role !== 'INV_EJECUTOR') {
    redirect('/login');
  }

  const isPI = role === 'INV_PRINCIPAL';

  // Filtros de estudio según rol
  let studyWhere;
  if (isPI) {
    studyWhere = { principalInvestigatorId: session.user.id };
  } else {
    studyWhere = { collaborators: { some: { userId: session.user.id } } };
  }

  const [myStudies, totalParticipations, pendingCompletion] = await Promise.all([
    prisma.study.findMany({
      where: { ...studyWhere, semester: { active: true } },
      include: {
        _count: { select: { timeslots: true, participations: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.participation.count({
      where: { study: studyWhere, status: 'COMPLETED' },
    }),
    prisma.participation.count({
      where: {
        study: studyWhere,
        status: { in: ['SIGNED_UP', 'REMINDED'] },
        timeslot: { startTime: { lt: new Date() } },
      },
    }),
  ]);

  const getStatusVisuals = (status: string) => {
    switch (status) {
      case 'DRAFT': return { label: 'Borrador', badge: 'badge-neutral', color: 'var(--text-muted)' };
      case 'PENDING_APPROVAL': return { label: 'En Revisión Admin', badge: 'badge-warning', color: 'var(--color-warning)' };
      case 'ACTIVE': return { label: 'Activo / Reclutando', badge: 'badge-success', color: 'var(--color-success)' };
      case 'CLOSED': return { label: 'Cerrado', badge: 'badge-neutral', color: 'var(--text-muted)' };
      case 'REJECTED': return { label: 'Rechazado', badge: 'badge-error', color: 'var(--color-error)' };
      default: return { label: status, badge: 'badge-neutral', color: 'var(--text-muted)' };
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Editorial Header */}
      <div className="page-header stagger-1">
        <div>
          <h1 className="page-title text-gradient" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Microscope size={28} color="var(--celeste-500)" />
            {isPI ? 'Director de Investigación' : 'Investigador Ejecutor'}
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: '0.95rem', letterSpacing: '0.01em' }}>
            Panel de control científico. Dr./Dra. <strong style={{color: 'var(--text-primary)'}}>{session.user.name}</strong>
          </p>
        </div>
        {isPI && (
          <a href="/investigador/estudios/nuevo" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: '32px' }}>
            <FlaskConical size={18} /> Instanciar Estudio
          </a>
        )}
      </div>

      {/* Grid Asimétrico Temático */}
      <div className="stat-grid stagger-2">
        <div className="card-gradient" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <Target size={120} color="rgba(255,255,255,0.05)" style={{ position: 'absolute', right: -20, bottom: -20, pointerEvents: 'none' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="stat-value" style={{ color: 'white', fontSize: '3.5rem' }}>
              {myStudies.length}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '50%' }}>
              <FolderSearch size={28} color="white" />
            </div>
          </div>
          <div className="stat-label" style={{ color: 'rgba(255,255,255,0.9)', marginTop: 8, fontSize: '1rem' }}>
            Protocolos Activos
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--surface-border-strong)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="stat-label">Sujetos Procesados</div>
            <Users size={18} color="var(--celeste-500)" />
          </div>
          <div className="stat-value">{totalParticipations}</div>
        </div>

        <div className="stat-card" style={{ background: 'var(--bg-elevated)', border: pendingCompletion > 0 ? '1px solid var(--color-warning)' : '1px solid var(--surface-border-strong)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="stat-label" style={{ color: pendingCompletion > 0 ? 'var(--color-warning)' : 'var(--text-secondary)' }}>Por Calificar</div>
            <FileSignature size={18} color={pendingCompletion > 0 ? 'var(--color-warning)' : 'var(--celeste-500)'} />
          </div>
          <div className="stat-value" style={{ color: pendingCompletion > 0 ? 'var(--color-warning)' : 'var(--text-primary)' }}>
            {pendingCompletion}
          </div>
          {pendingCompletion > 0 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-warning)', marginTop: 8 }}>
              Revisión pendiente
            </div>
          )}
        </div>
      </div>

      {/* Catálogo de Proyectos */}
      <div className="card stagger-3" style={{ padding: 0, overflow: 'hidden', background: 'var(--bg-elevated)', border: '1px solid var(--surface-border)' }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-primary)' }}>
            <Activity size={20} color="var(--celeste-400)" />
            Portafolio de Estudios
          </h2>
        </div>

        {myStudies.length === 0 ? (
          <div className="empty-state" style={{ padding: '80px 24px' }}>
            <div style={{ background: 'var(--surface-hover)', padding: 24, borderRadius: '50%', marginBottom: 20 }}>
              <FlaskConical size={48} color="var(--text-muted)" />
            </div>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: 8, fontWeight: 500 }}>
              {isPI ? 'No hay investigaciones en curso' : 'Sin asignaciones activas'}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 24 }}>
              Instancie un nuevo estudio para someterlo a aprobación del comité ético y comenzar a reclutar.
            </p>
            {isPI && (
              <a href="/investigador/estudios/nuevo" className="btn btn-primary" style={{ padding: '12px 32px', borderRadius: '32px' }}>
                Formular Protocolo
              </a>
            )}
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table" style={{ background: 'transparent' }}>
              <thead>
                <tr>
                  <th style={{ paddingLeft: 32 }}>Título del Protocolo</th>
                  <th>Estado Clínico</th>
                  <th style={{ textAlign: 'center' }}>Sesiones <Clock size={12} style={{marginLeft: 4, display: 'inline-block'}} /></th>
                  <th style={{ textAlign: 'center' }}>Voluntarios <Users size={12} style={{marginLeft: 4, display: 'inline-block'}} /></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {myStudies.map((study) => {
                  const statusInfo = getStatusVisuals(study.status);
                  return (
                    <tr key={study.id}>
                      <td style={{ paddingLeft: 32 }}>
                        <a href={`/investigador/estudios/${study.id}`} style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--celeste-400)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}>
                          {study.title}
                        </a>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 600, color: statusInfo.color, background: `var(--surface-hover)`, padding: '4px 10px', borderRadius: 16 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusInfo.color }} />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 500 }}>{study._count.timeslots}</td>
                      <td style={{ textAlign: 'center', fontWeight: 500 }}>{study._count.participations}</td>
                      <td style={{ paddingRight: 32, textAlign: 'right' }}>
                        <a href={`/investigador/estudios/${study.id}`} style={{ color: 'var(--text-secondary)', display: 'inline-flex', padding: 8, background: 'var(--surface-hover)', borderRadius: '50%' }}>
                          <ArrowRight size={16} />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
