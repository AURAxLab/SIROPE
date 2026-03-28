/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Dashboard Estudiante — Vista principal
 * Tema UI: UCR Celeste + Frontend-Design Upgrade
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import type { Role } from '@/lib/validations';
import { 
  Award, Clock, Calendar, BookOpen, MapPin, 
  Activity, ArrowRight, Zap, Target, Search, FileText
} from 'lucide-react';

export default async function EstudianteDashboard() {
  const session = await auth();
  if (!session?.user || (session.user.role as Role) !== 'ESTUDIANTE') {
    redirect('/login');
  }

  // Obteniendo estadísticas del estudiante
  const [activeStudies, myParticipations, completedCount, maxCreditConfig] = await Promise.all([
    prisma.study.count({
      where: { status: 'ACTIVE', semester: { active: true } },
    }),
    prisma.participation.findMany({
      where: {
        studentId: session.user.id,
        status: { in: ['SIGNED_UP', 'REMINDED'] },
      },
      include: {
        study: { select: { title: true, creditsWorth: true } },
        timeslot: { select: { startTime: true, endTime: true, location: true } },
      },
      orderBy: { timeslot: { startTime: 'asc' } },
      take: 5,
    }),
    prisma.participation.count({
      where: { studentId: session.user.id, status: 'COMPLETED' },
    }),
    prisma.systemConfig.findUnique({
      where: { key: 'MAX_CREDITS_PER_SEMESTER' },
    }),
  ]);

  // Créditos totales ganados
  const creditAssignments = await prisma.creditAssignment.findMany({
    where: { studentId: session.user.id },
  });
  
  const totalCredits = creditAssignments.reduce((sum, a) => sum + a.credits, 0);
  const maxCredits = parseFloat(maxCreditConfig?.value || '4');
  const creditPercent = Math.min((totalCredits / maxCredits) * 100, 100);

  // Lógica de próximo timeslot
  const now = new Date();
  const nextParticipation = myParticipations.find((p) => p.timeslot.startTime > now);
  let countdownText = '';
  let isToday = false;
  
  if (nextParticipation) {
    const diff = nextParticipation.timeslot.startTime.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) {
      countdownText = `${days}d ${hours}h`;
    } else if (hours > 0) {
      countdownText = `${hours} hrs`;
    } else {
      countdownText = 'Hoy';
      isToday = true;
    }
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Header: Editorial Typography */}
      <div className="page-header stagger-1">
        <div>
          <h1 className="page-title text-gradient">
            Hola, {session.user.name?.split(' ')[0]}
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: '0.95rem', letterSpacing: '0.01em', maxWidth: 600 }}>
            Explora los estudios vigentes en el laboratorio, acumula horas de experiencia en investigación y gestiona tus citas.
          </p>
        </div>
      </div>

      {/* Grid Asimétrico Principal */}
      <div className="stagger-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        {/* Tarjeta de Progreso Principal (Spans extra space if available) */}
        <div className="card-gradient" style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '50%' }}>
                <Target size={24} color="white" />
              </div>
              <h2 style={{ fontSize: '1.2rem', color: 'white', margin: 0, fontWeight: 500 }}>Progreso del Semestre</h2>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <span style={{ fontSize: '4.5rem', fontWeight: 800, lineHeight: 0.9, color: 'white' }}>
              {totalCredits}
            </span>
            <span style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.7)', paddingBottom: 6 }}>
              / {maxCredits} pts
            </span>
          </div>

          <div style={{ background: 'rgba(4, 11, 20, 0.4)', borderRadius: 12, padding: 4, width: '100%', overflow: 'hidden' }}>
            <div style={{
              width: `${creditPercent}%`, height: '8px', borderRadius: 8,
              background: creditPercent >= 100 ? '#66bb6a' : 'white',
              transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: creditPercent >= 100 ? '0 0 12px #66bb6a' : '0 0 12px rgba(255,255,255,0.5)'
            }} />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', margin: 0, fontWeight: 500 }}>
            {creditPercent >= 100 ? '¡Meta semestral alcanzada! Excelente trabajo.' : `Te faltan ${(maxCredits - totalCredits).toFixed(1)} créditos para el máximo.`}
          </p>
        </div>

        {/* Tarjeta: Próxima Participación */}
        <div className="card" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--surface-border-strong)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'var(--color-info-dim)', padding: 10, borderRadius: '12px', color: 'var(--celeste-400)' }}>
              <Clock size={20} />
            </div>
            <h3 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--text-primary)' }}>Próxima Sesión</h3>
          </div>

          {nextParticipation ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h4 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', margin: 0, fontWeight: 600, lineHeight: 1.3 }}>
                  {nextParticipation.study.title}
                </h4>
                <div style={{ background: isToday ? 'var(--gradient-oro)' : 'var(--surface-hover)', 
                              color: isToday ? '#040b14' : 'var(--celeste-300)', 
                              padding: '4px 12px', borderRadius: '24px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {countdownText}
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <Calendar size={14} />
                  <span>
                    {nextParticipation.timeslot.startTime.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'short' }).replace(/^\w/, c => c.toUpperCase())} a las {nextParticipation.timeslot.startTime.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <MapPin size={14} />
                  <span>{nextParticipation.timeslot.location || 'Laboratorio PRISMA'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--celeste-400)', fontSize: '0.85rem', fontWeight: 600 }}>
                  <Zap size={14} />
                  <span>Otorga {nextParticipation.study.creditsWorth} crédito(s)</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', margin: 0 }}>
                Agenda despejada. No hay sesiones próximas.
              </p>
              <a href="/estudiante/estudios" className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                <Search size={16} /> Explorar Catálogo
              </a>
            </div>
          )}
        </div>

        {/* Minis Stats Container */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="stat-card" style={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '24px', background: 'var(--bg-elevated)' }}>
            <div>
              <div className="stat-label" style={{ marginBottom: 4 }}>Inscripciones en Curso</div>
              <div className="stat-value" style={{ fontSize: '2rem' }}>{myParticipations.length}</div>
            </div>
            <Activity size={32} color="var(--celeste-600)" style={{ opacity: 0.5 }} />
          </div>
          <div className="stat-card" style={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '24px', background: 'var(--bg-elevated)' }}>
            <div>
              <div className="stat-label" style={{ marginBottom: 4 }}>Estudios Completados</div>
              <div className="stat-value" style={{ fontSize: '2rem' }}>{completedCount}</div>
            </div>
            <Award size={32} color="var(--celeste-600)" style={{ opacity: 0.5 }} />
          </div>
        </div>
      </div>

      {/* Inscripciones Activas (Data Table) */}
      <div className="card stagger-3" style={{ background: 'var(--bg-elevated)', overflow: 'hidden', padding: 0 }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--surface-border)' }}>
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} color="var(--celeste-400)" /> Tus Inscripciones Activas
          </h3>
        </div>
        
        {myParticipations.length === 0 ? (
          <div className="empty-state" style={{ padding: '64px 24px' }}>
            <div style={{ background: 'var(--surface-hover)', padding: 24, borderRadius: '50%', marginBottom: 20 }}>
              <Search size={40} color="var(--text-muted)" />
            </div>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: 8, fontWeight: 500 }}>
              Aún no te has inscrito en ningún estudio
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 24 }}>
              Revisa el catálogo para encontrar investigaciones disponibles y empezar a ganar créditos.
            </p>
            <a href="/estudiante/estudios" className="btn btn-outline" style={{ background: 'var(--bg-raised)', border: '1px solid var(--surface-border-strong)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: '32px', textDecoration: 'none', transition: 'all 0.2s', fontWeight: 500 }}>
              Ver {activeStudies} estudios disponibles <ArrowRight size={16} color="var(--celeste-400)" />
            </a>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table" style={{ background: 'transparent' }}>
              <thead>
                <tr>
                  <th style={{ paddingLeft: 32 }}>Investigación</th>
                  <th>Fecha y Hora</th>
                  <th>Ubicación</th>
                  <th style={{ textAlign: 'center' }}>Créditos</th>
                  <th style={{ paddingRight: 32, textAlign: 'right' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {myParticipations.map((p) => (
                  <tr key={p.id}>
                    <td style={{ paddingLeft: 32, fontWeight: 600, color: 'var(--celeste-300)' }}>{p.study.title}</td>
                    <td>
                      {p.timeslot.startTime.toLocaleDateString('es-CR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>{p.timeslot.location || 'Pendiente'}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{p.study.creditsWorth}</td>
                    <td style={{ paddingRight: 32, textAlign: 'right' }}>
                      <span className="badge badge-primary" style={{ background: p.status === 'REMINDED' ? 'var(--gradient-oro)' : 'var(--surface-hover)', color: p.status === 'REMINDED' ? '#040b14' : 'var(--celeste-400)' }}>
                        {p.status === 'REMINDED' ? 'Por Atender' : 'Inscrito'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
