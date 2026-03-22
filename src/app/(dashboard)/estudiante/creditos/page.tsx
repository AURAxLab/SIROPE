/**
 * SIROPE — Sistema de Registro Optativo de Participantes de Estudios
 * @author Alexander Barquero Elizondo, Ph.D.
 *
 * Créditos — Asignar créditos ganados a cursos
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import type { Role } from '@/lib/validations';
import AssignCreditForm from './AssignCreditForm';

/**
 * Página de gestión de créditos del estudiante.
 */
export default async function EstudianteCreditos() {
  const session = await auth();
  if (!session?.user || (session.user.role as Role) !== 'ESTUDIANTE') {
    redirect('/login');
  }

  // Participaciones completadas sin créditos asignados
  const unassigned = await prisma.participation.findMany({
    where: {
      studentId: session.user.id,
      status: 'COMPLETED',
      creditAssignments: { none: {} },
    },
    include: {
      study: { select: { title: true, creditsWorth: true } },
    },
    orderBy: { completedAt: 'desc' },
  });

  // Créditos ya asignados
  const assigned = await prisma.creditAssignment.findMany({
    where: { studentId: session.user.id },
    include: {
      course: { select: { code: true, name: true } },
      participation: {
        select: { study: { select: { title: true } } },
      },
    },
    orderBy: { assignedAt: 'desc' },
  });

  // Cursos del estudiante con opt-in activo
  const enrollments = await prisma.enrollment.findMany({
    where: {
      studentId: session.user.id,
      course: { optedIn: true, semester: { active: true } },
    },
    include: {
      course: { select: { id: true, code: true, name: true, maxExtraCredits: true } },
    },
  });

  const totalCredits = assigned.reduce((sum, a) => sum + a.credits, 0);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Mis Créditos 🏆</h1>
      </div>

      {/* Resumen */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="card-gradient" style={{ textAlign: 'center' }}>
          <div className="stat-value" style={{ color: 'white' }}>{totalCredits}</div>
          <div className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Créditos Asignados
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{unassigned.length}</div>
          <div className="stat-label">Pendientes de Asignar</div>
        </div>
      </div>

      {/* Participaciones sin asignar */}
      {unassigned.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 16 }}>🎯 Créditos por Asignar</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {unassigned.map((p) => (
              <div key={p.id} style={{
                padding: 16,
                background: 'var(--surface-bg)',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h4 style={{ marginBottom: 4 }}>{p.study.title}</h4>
                    <span className="badge badge-success">
                      {p.study.creditsWorth} crédito{p.study.creditsWorth !== 1 ? 's' : ''} disponible{p.study.creditsWorth !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <AssignCreditForm
                    participationId={p.id}
                    credits={p.study.creditsWorth}
                    courses={enrollments.map((e) => ({
                      id: e.course.id,
                      code: e.course.code,
                      name: e.course.name,
                    }))}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial de asignaciones */}
      {assigned.length > 0 && (
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>📜 Créditos Asignados</h2>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Estudio</th>
                  <th>Curso</th>
                  <th>Créditos</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {assigned.map((a) => (
                  <tr key={a.id}>
                    <td>{a.participation?.study.title || 'Asignación alternativa'}</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{a.course.code}</span>
                      {' — '}{a.course.name}
                    </td>
                    <td>
                      <span className="badge badge-primary">{a.credits}</span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {a.assignedAt.toLocaleDateString('es-CR', {
                        day: 'numeric', month: 'short',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
