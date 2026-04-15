/**
 * SIROPE — Detalle de Estudio (Investigador)
 * Vista completa con timeslots, participantes y acciones.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import type { Role } from '@/lib/validations';
import StudyActions from './StudyActions';
import TimeslotManager from './TimeslotManager';
import ParticipantList from './ParticipantList';

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

export default async function EstudioDetalle({ params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect('/login');
  const role = session.user.role as Role;

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

  if (!study) redirect('/investigador/estudios');

  // Verificar acceso: debe ser PI o colaborador
  const isPI = study.principalInvestigatorId === session.user.id;
  const isCollaborator = study.collaborators.some((c) => c.userId === session.user.id);
  if (!isPI && !isCollaborator) redirect('/investigador/estudios');

  const statusInfo = STATUS_LABELS[study.status] || { label: study.status, badge: 'badge-neutral' };
  const completedCount = await prisma.participation.count({
    where: { studyId: id, status: 'COMPLETED' },
  });

  return (
    <div className="animate-fade-in">
      <nav style={{ marginBottom: 20 }}>
        <Link href="/investigador/estudios" style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none' }}>
          ← Volver a mis estudios
        </Link>
      </nav>

      {/* Header */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <span className={`badge ${statusInfo.badge}`}>{statusInfo.label}</span>
              <span className="badge badge-primary">{study.creditsWorth} crédito{study.creditsWorth !== 1 ? 's' : ''}</span>
              <span className="badge badge-neutral">⏱ {study.estimatedDuration} min</span>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>{study.title}</h1>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>{study.description}</p>
            <div style={{ display: 'flex', gap: 16, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <span>📅 {study.semester.name}</span>
              {study.location && <span>📍 {study.location}</span>}
              <span>👤 {study.principalInvestigator.name}</span>
            </div>
          </div>

          {isPI && <StudyActions studyId={study.id} status={study.status} />}
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-value">{study.timeslots.length}</div>
          <div className="stat-label">Timeslots</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{study._count.participations}</div>
          <div className="stat-label">Inscripciones</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-success)' }}>{completedCount}</div>
          <div className="stat-label">Completados</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{study.collaborators.length}</div>
          <div className="stat-label">Colaboradores</div>
        </div>
      </div>

      {/* Collaboradores */}
      {isPI && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 12 }}>🤝 Colaboradores</h2>
          {study.collaborators.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Sin colaboradores.</p>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {study.collaborators.map((c) => (
                <span key={c.id} className="badge badge-neutral" style={{ padding: '6px 12px' }}>
                  {c.user.name} ({c.user.email})
                </span>
              ))}
            </div>
          )}
          <Link href={`/investigador/colaboradores?studyId=${study.id}`} className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>
            Gestionar colaboradores →
          </Link>
        </div>
      )}

      {/* Timeslots */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2>🕐 Timeslots</h2>
        </div>
        <TimeslotManager
          studyId={study.id}
          studyStatus={study.status}
          timeslots={study.timeslots.map((t) => ({
            id: t.id,
            startTime: t.startTime.toISOString(),
            endTime: t.endTime.toISOString(),
            location: t.location,
            maxParticipants: t.maxParticipants,
            currentParticipants: t._count.participations,
            status: t.status,
          }))}
        />
      </div>

      {/* Participantes por timeslot */}
      {study.timeslots.some((t) => t.participations.length > 0) && (
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>👥 Participantes</h2>
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
