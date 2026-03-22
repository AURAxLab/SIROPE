/**
 * SIROPE — Aprobaciones (Admin)
 * Revisar estudios pendientes de aprobación.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import type { Role } from '@/lib/validations';
import ApprovalActions from './ApprovalActions';

export default async function AprobacionesPage() {
  const session = await auth();
  if (!session?.user || (session.user.role as Role) !== 'ADMIN') redirect('/login');

  const pendingStudies = await prisma.study.findMany({
    where: { status: 'PENDING_APPROVAL' },
    include: {
      principalInvestigator: { select: { name: true, email: true } },
      semester: { select: { name: true } },
      prescreenQuestions: { select: { id: true } },
      _count: { select: { timeslots: true } },
    },
    orderBy: { updatedAt: 'asc' },
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Aprobaciones ✅</h1>
      </div>

      {pendingStudies.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <p className="empty-state-text">No hay estudios pendientes de aprobación.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {pendingStudies.map((s) => (
            <div key={s.id} className="card">
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <span className="badge badge-warning">Pendiente</span>
                <span className="badge badge-primary">{s.creditsWorth} cr.</span>
                <span className="badge badge-neutral">⏱ {s.estimatedDuration} min</span>
                {s.prescreenQuestions.length > 0 && (
                  <span className="badge badge-info">📝 {s.prescreenQuestions.length} preguntas</span>
                )}
              </div>
              <h3 style={{ marginBottom: 4 }}>{s.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: 8 }}>{s.description}</p>
              <div style={{ display: 'flex', gap: 16, color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: 12 }}>
                <span>👤 {s.principalInvestigator.name}</span>
                <span>📅 {s.semester.name}</span>
                {s.location && <span>📍 {s.location}</span>}
                <span>🕐 {s._count.timeslots} timeslots</span>
              </div>
              {s.eligibilityCriteria && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                  📋 Criterios: {s.eligibilityCriteria}
                </p>
              )}
              <ApprovalActions studyId={s.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
