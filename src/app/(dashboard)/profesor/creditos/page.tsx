/**
 * SIROPE — Créditos del Profesor
 * Revisar asignaciones de créditos y asignaciones alternativas.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import type { Role } from '@/lib/validations';
import ReviewAssignment from './ReviewAssignment';
import ExportCSV from '@/components/ExportCSV';

export default async function ProfesorCreditos() {
  const session = await auth();
  if (!session?.user || (session.user.role as Role) !== 'PROFESOR') redirect('/login');

  // Asignaciones alternativas pendientes de mis cursos
  const pendingAlts = await prisma.alternativeAssignment.findMany({
    where: {
      status: 'PENDING',
      course: { professorId: session.user.id },
    },
    include: {
      student: { select: { name: true, email: true, studentId: true } },
      course: { select: { code: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Resumen de créditos por curso
  const myCourses = await prisma.course.findMany({
    where: { professorId: session.user.id, semester: { active: true } },
    include: {
      _count: { select: { creditAssignments: true } },
      creditAssignments: { select: { credits: true } },
    },
    orderBy: { code: 'asc' },
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 className="page-title">Créditos y Asignaciones 🏆</h1>
        <ExportCSV type="credits" label="📥 Exportar Créditos CSV" />
      </div>

      {/* Pending alt assignments */}
      {pendingAlts.length > 0 && (
        <div className="card" style={{ marginBottom: 24, borderColor: 'var(--color-warning)' }}>
          <h2 style={{ marginBottom: 16 }}>⏳ Asignaciones Alternativas Pendientes ({pendingAlts.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pendingAlts.map((a) => (
              <div key={a.id} style={{
                padding: 16, background: 'var(--surface-bg)',
                border: '1px solid var(--surface-border)', borderRadius: 'var(--radius-md)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 250 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                      <span className="badge badge-primary" style={{ fontFamily: 'monospace' }}>{a.course.code}</span>
                      <span className="badge badge-warning">{a.creditsRequested} cr. solicitados</span>
                    </div>
                    <p style={{ fontWeight: 600, marginBottom: 4 }}>{a.student.name}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 4 }}>{a.student.email} · {a.student.studentId || 'Sin carné'}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{a.description}</p>
                  </div>
                  <ReviewAssignment assignmentId={a.id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Course credit summary */}
      <div className="card">
        <h2 style={{ marginBottom: 16 }}>📊 Resumen por Curso</h2>
        {myCourses.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No tienes cursos activos.</p>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Curso</th>
                  <th>Asignaciones</th>
                  <th>Total créditos</th>
                </tr>
              </thead>
              <tbody>
                {myCourses.map((c) => {
                  const totalCredits = c.creditAssignments.reduce((sum, a) => sum + a.credits, 0);
                  return (
                    <tr key={c.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c.code}</td>
                      <td>{c.name}</td>
                      <td>{c._count.creditAssignments}</td>
                      <td><span className="badge badge-success">{totalCredits}</span></td>
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
