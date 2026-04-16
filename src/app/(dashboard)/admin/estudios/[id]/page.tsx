/**
 * SIROPE — Vista detallada de Estudio (Administrador)
 * Analítica universal de progreso y participantes sin controles de PI.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import type { Role } from '@/lib/validations';
import ParticipantList from '@/app/(dashboard)/investigador/estudios/[id]/ParticipantList';

interface Params {
  params: Promise<{ id: string }>;
}

const STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  DRAFT: { label: 'Borrador', badge: 'badge-neutral' },
  PENDING_APPROVAL: { label: 'Pendiente', badge: 'badge-warning' },
  ACTIVE: { label: 'Activo', badge: 'badge-success' },
  CLOSED: { label: 'Cerrado', badge: 'badge-info' },
  REJECTED: { label: 'Rechazado', badge: 'badge-error' },
};

export default async function AdminEstudioDetalle({ params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || (session.user.role as Role) !== 'ADMIN') redirect('/login');

  const study = await prisma.study.findUnique({
    where: { id },
    include: {
      principalInvestigator: { select: { name: true, email: true } },
      semester: { select: { name: true } },
      collaborators: { include: { user: { select: { id: true, name: true, email: true } } } },
      prescreenQuestions: { orderBy: { orderIndex: 'asc' } },
      timeslots: {
        orderBy: { startTime: 'asc' },
        include: {
          _count: { select: { participations: { where: { status: { not: 'CANCELLED' } } } } },
          participations: {
            where: { status: { not: 'CANCELLED' } },
            include: { student: { select: { id: true, name: true, email: true, studentId: true } } },
          },
        },
      },
      _count: { select: { participations: true } },
    },
  });

  if (!study) redirect('/admin/estudios');

  const statusInfo = STATUS_LABELS[study.status] || { label: study.status, badge: 'badge-neutral' };
  
  const completedCount = await prisma.participation.count({
    where: { studyId: id, status: 'COMPLETED' },
  });

  return (
    <div className="animate-fade-in">
      <nav style={{ marginBottom: 20 }}>
        <Link href="/admin/estudios" style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none' }}>
          ← Volver al directorio
        </Link>
      </nav>

      {/* Header General */}
      <div className="card" style={{ marginBottom: 24, padding: '24px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <span className={`badge ${statusInfo.badge}`}>{statusInfo.label}</span>
          <span className="badge badge-primary">{study.creditsWorth} crédito{study.creditsWorth !== 1 ? 's' : ''}</span>
          <span className="badge badge-neutral">⏱ {study.estimatedDuration} min</span>
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 12 }}>{study.title}</h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>{study.description}</p>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, color: 'var(--text-muted)', fontSize: '0.875rem', background: 'var(--bg-default)', padding: 12, borderRadius: 'var(--radius-md)' }}>
          <span>📅 <strong>Semestre:</strong> {study.semester.name}</span>
          {study.location && <span>📍 <strong>Ubicación:</strong> {study.location}</span>}
          <span>👤 <strong>Investigador:</strong> {study.principalInvestigator.name} ({study.principalInvestigator.email})</span>
          <span>📅 <strong>Creado:</strong> {new Date(study.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Análisis Numérico */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-value">{study.timeslots.length}</div>
          <div className="stat-label">Franjas de Tiempo (Horarios)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{study._count.participations}</div>
          <div className="stat-label">Inscripciones Registradas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-success)' }}>{completedCount}</div>
          <div className="stat-label">Estudios Finalizados</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{study.prescreenQuestions.length}</div>
          <div className="stat-label">Preguntas de Pre-filtro</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 24 }}>
        {/* Colaboradores Operativos */}
        <div className="card">
          <h2 style={{ marginBottom: 12 }}>🤝 Colaboradores (Ejecutores)</h2>
          {study.collaborators.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>El estudio no tiene ayudantes designados.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {study.collaborators.map((c) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'var(--bg-default)', borderRadius: 'var(--radius-sm)' }}>
                   <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.user.name}</span>
                   <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{c.user.email}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comité de Ética */}
        <div className="card">
          <h2 style={{ marginBottom: 12 }}>⚖️ Comité de Ética</h2>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <span className={`badge ${study.ethicsApproved ? 'badge-success' : 'badge-warning'}`}>
              {study.ethicsApproved ? 'Aprobado Válido' : 'Requiere Revisión / Justificación'}
            </span>
          </div>
          {study.ethicsNote ? (
             <p style={{ fontSize: '0.875rem', background: 'var(--bg-default)', padding: 12, borderRadius: 'var(--radius-sm)', fontStyle: 'italic' }}>
               "{study.ethicsNote}"
             </p>
          ) : (
             <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No hay notas éticas provistas por el investigador.</p>
          )}
        </div>
      </div>

      {/* Participantes Totales (Universal) */}
      {study.timeslots.some((t) => t.participations.length > 0) && (
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>👥 Auditoría de Participantes</h2>
          <ParticipantList
            timeslots={study.timeslots
              .filter((t) => t.participations.length > 0)
              .map((t) => ({
                id: t.id,
                startTime: t.startTime.toISOString(),
                location: t.location,
                participants: t.participations.map((p) => ({
                  participationId: p.id,
                  name: p.student.name,
                  email: p.student.email,
                  studentId: p.student.studentId || '',
                  status: p.status,
                })),
              }))}
          />
        </div>
      )}
    </div>
  );
}
